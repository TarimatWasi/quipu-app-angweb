import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  disabled,
  FieldTree,
  form,
  FormField,
  FormRoot,
  required,
  validate,
} from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { AuthShellComponent } from '@shared/auth-shell/auth-shell.component';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { AuthService, DocumentType, LOGIN_TIMING } from '@core/services/auth.service';
import { AccountLock, BffError, toBffError } from '@core/services/bff-error';
import {
  ACCOUNT_LOCKED_TEXT_ID,
  AccountLockedDialogComponent,
} from './account-locked-dialog.component';
import { LockCountdown } from './lock-countdown';

interface LoginModel {
  documentType: DocumentType;
  documentNumber: string;
  password: string;
}

const DOCUMENT_TYPES: readonly { readonly value: DocumentType; readonly label: string }[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de extranjería' },
  { value: 'PASSPORT', label: 'Pasaporte' },
];

@Component({
  selector: 'app-login',
  imports: [
    AuthShellComponent,
    FormRoot,
    FormField,
    MatFormField,
    MatLabel,
    MatInput,
    MatButton,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  styles: `
    :host {
      display: block;
    }
    form {
      display: grid;
      gap: 0.5rem;
      width: min(25rem, 100%);
    }
    .error {
      margin: 0 0 0.5rem;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
    .hint {
      display: block;
      margin: 0;
      font: var(--mat-sys-body-small);
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      margin: -1px;
      padding: 0;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }
    .lock {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 0.875rem;
      margin-bottom: 0.75rem;
      padding: 1rem 1.125rem;
      border: 1px solid color-mix(in srgb, var(--mat-sys-error) 30%, transparent);
      border-radius: 12px;
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
      font: var(--mat-sys-body-medium);
    }
    .lock-ok {
      border-color: color-mix(in srgb, var(--mat-sys-primary) 30%, transparent);
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .lock svg {
      margin-top: 2px;
    }
    .lock div {
      display: grid;
      gap: 0.375rem;
    }
    .lock p {
      margin: 0;
    }
    .lock-title {
      font-weight: 700;
    }
    .lock a {
      color: inherit;
    }
    .time {
      font-size: 1.0625rem;
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly timing = inject(LOGIN_TIMING);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly documentTypes = DOCUMENT_TYPES;
  /** The recovery flow sends the person here with `?updated=1` once the password is saved. */
  protected readonly passwordUpdated = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('updated') === '1')),
    { initialValue: false },
  );
  protected readonly serverError = signal<string | null>(null);
  /** True when the server is taking long enough to explain why (free hosting wakes up slowly). */
  protected readonly slow = signal(false);
  /** The lock of the account (TAR-131): the banner, the disabled form and what is read aloud. */
  protected readonly countdown = new LockCountdown();
  /** Shown from the moment the lock ends until the next attempt. */
  protected readonly unlocked = signal(false);
  private readonly dialog = inject(MatDialog);
  private lockDialog: MatDialogRef<AccountLockedDialogComponent> | undefined;
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.countdown.stop();
    });
  }

  private readonly model = signal<LoginModel>({
    documentType: 'DNI',
    documentNumber: '',
    password: '',
  });

  protected readonly loginForm = form(
    this.model,
    (path) => {
      // A locked account cannot try: the fields stay as they were and the form is closed.
      disabled(path, { when: () => this.countdown.active() });
      required(path.documentNumber, { message: 'Ingresa tu número de documento' });
      // Spaces only: passes required (not empty) but is not a document number.
      validate(path.documentNumber, ({ value }) =>
        value() !== '' && value().trim() === ''
          ? { kind: 'blank', message: 'Ingresa tu número de documento' }
          : undefined,
      );
      required(path.password, { message: 'Ingresa tu contraseña' });
    },
    {
      submission: {
        action: () => this.login(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, 'login-error');
        },
      },
    },
  );

  protected readonly documentTypeError = computed(() => firstError(this.loginForm.documentType));
  protected readonly documentNumberError = computed(() =>
    firstError(this.loginForm.documentNumber),
  );
  protected readonly passwordError = computed(() => firstError(this.loginForm.password));

  /** Runs when the form is valid. A failure comes back as errors, so the form stays editable. */
  private async login() {
    if (this.countdown.active()) {
      return undefined;
    }
    this.serverError.set(null);
    this.unlocked.set(false);
    const hint = setTimeout(() => {
      this.slow.set(true);
    }, this.timing.slowHintAfterMs);
    try {
      const { documentType, documentNumber, password } = this.model();
      await firstValueFrom(
        this.auth.login({ documentType, documentNumber: documentNumber.trim(), password }),
      );
    } catch (error: unknown) {
      return this.failure(toBffError(error));
    } finally {
      clearTimeout(hint);
      this.slow.set(false);
    }
    await this.router.navigateByUrl('/home');
    return undefined;
  }

  private failure({ code, message, field, lock }: BffError) {
    if (code === 'AUTH_ACCOUNT_LOCKED' && lock) {
      this.lockAccount(lock);
      return undefined;
    }
    focusFirstProblem(this.host, this.injector, 'login-error');
    const target = code === 'VALIDATION_ERROR' ? this.fieldNamed(field) : null;
    if (target) {
      return [{ fieldTree: target, kind: 'server', message }];
    }
    this.serverError.set(message);
    return undefined;
  }

  /** SRS 17, AUTH_ACCOUNT_LOCKED: a dialog the moment it happens, then a banner while it lasts. */
  private lockAccount(lock: AccountLock) {
    this.countdown.start(lock, () => {
      this.unlock();
    });
    const dialog = this.dialog.open(AccountLockedDialogComponent, {
      role: 'alertdialog',
      ariaModal: true,
      ariaDescribedBy: ACCOUNT_LOCKED_TEXT_ID,
      data: { countdown: this.countdown },
      restoreFocus: false,
      maxWidth: 'calc(100vw - 2rem)',
    });
    this.lockDialog = dialog;
    dialog
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        // Closed by the person: the banner explains what is left. Closed because the lock ended:
        // there is no banner, and unlock() already moved the focus.
        if (this.countdown.active()) {
          this.focusOnNextRender('#lock-banner');
        }
      });
  }

  /**
   * The countdown reached zero: a dialog still open would trap the person over an enabled form, so
   * it closes; and a stale password is not worth keeping, so the form starts clean.
   */
  private unlock() {
    this.lockDialog?.close();
    this.lockDialog = undefined;
    this.model.update((value) => ({ ...value, password: '' }));
    this.unlocked.set(true);
    this.focusOnNextRender('#password');
  }

  private focusOnNextRender(selector: string) {
    afterNextRender(
      () => {
        this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
      },
      { injector: this.injector },
    );
  }

  private fieldNamed(name: string | undefined): FieldTree<string> | null {
    switch (name) {
      case 'documentType':
        return this.loginForm.documentType;
      case 'documentNumber':
        return this.loginForm.documentNumber;
      case 'password':
        return this.loginForm.password;
      default:
        return null;
    }
  }
}
