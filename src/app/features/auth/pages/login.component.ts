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
import { ActivatedRoute, convertToParamMap, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthShellComponent } from '@shared/auth-shell/auth-shell.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { FORM_PAGE_STYLES } from '@shared/forms/form-page.styles';
import { AuthService, DocumentType, LOGIN_TIMING } from '@core/auth/auth.service';
import { AccountLock, BffError, toBffError } from '@core/http/bff-error';
import {
  ACCOUNT_LOCKED_TEXT_ID,
  AccountLockedDialogComponent,
} from '../components/account-locked-dialog.component';
import { LockCountdown } from '../components/lock-countdown';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

interface LoginModel {
  documentType: DocumentType;
  documentNumber: string;
  password: string;
}

/** What the login has to say about how the person got here; only one is shown at a time. */
type ArrivalNotice = 'expired' | 'signedOut' | 'updated';

/**
 * FE-ANG-SEC-02: the `returnUrl` of the query is only followed when it is a path of this app. A
 * second slash or a backslash would let it name another host, and the root and the login lead
 * back here; anything else (including control characters) sends the person to /home.
 */
function safeReturnUrl(value: string | null): string | null {
  if (value === null || !value.startsWith('/') || value.startsWith('//')) {
    return null;
  }
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (char === '\\' || code < 0x20 || code === 0x7f) {
      return null;
    }
  }
  const [path = ''] = value.split(/[?#]/, 1);
  return path === '/' || path === '/login' || path.startsWith('/login/') ? null : value;
}

const DOCUMENT_TYPES: readonly { readonly value: DocumentType; readonly label: string }[] = [
  { value: 'DNI', label: 'DNI' },
  { value: 'CE', label: 'Carné de extranjería' },
  { value: 'PASSPORT', label: 'Pasaporte' },
];

@Component({
  selector: 'app-login',
  imports: [
    FieldControlDirective,
    FormFieldComponent,
    AuthShellComponent,
    FormRoot,
    FormField,
    MatButton,
    PageNoticeComponent,
    RouterLink,
  ],
  templateUrl: './login.component.html',
  // The layout is the one of every access form; here only how the lock notice lays out its icon.
  styles: [
    FORM_PAGE_STYLES,
    `
      .lock {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 0.875rem;
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
        font-size: var(--quipu-texto-intro-size);
        font-variant-numeric: tabular-nums;
      }
    `,
  ],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly timing = inject(LOGIN_TIMING);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly documentTypes = DOCUMENT_TYPES;
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, {
    initialValue: convertToParamMap({}),
  });
  /**
   * Why the person is here (TAR-245): `?expired=1` from the session-expired interceptor, `?signedOut=1`
   * from «Salir», `?updated=1` from the recovery flow once the password is saved. The lock of the
   * account says more than any of them, so while it shows (or its end does) none is shown.
   */
  protected readonly arrivalNotice = computed<ArrivalNotice | null>(() => {
    if (this.countdown.active() || this.unlocked()) {
      return null;
    }
    const params = this.params();
    const notices: readonly ArrivalNotice[] = ['expired', 'signedOut', 'updated'];
    return notices.find((notice) => params.get(notice) === '1') ?? null;
  });
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
    await this.router.navigateByUrl(safeReturnUrl(this.params().get('returnUrl')) ?? '/home');
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
