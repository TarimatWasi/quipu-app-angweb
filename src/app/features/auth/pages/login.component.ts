import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { FieldTree, form, FormField, FormRoot, required, validate } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, DocumentType, LOGIN_TIMING } from '@core/services/auth.service';
import { BffError, toBffError } from '@core/services/bff-error';

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
  imports: [FormRoot, FormField, MatFormField, MatLabel, MatInput, MatButton],
  templateUrl: './login.component.html',
  styles: `
    :host {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: 1rem;
    }
    form {
      display: grid;
      gap: 0.5rem;
      width: min(24rem, 100%);
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
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly timing = inject(LOGIN_TIMING);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly serverError = signal<string | null>(null);
  /** True when the server is taking long enough to explain why (free hosting wakes up slowly). */
  protected readonly slow = signal(false);

  private readonly model = signal<LoginModel>({
    documentType: 'DNI',
    documentNumber: '',
    password: '',
  });

  protected readonly loginForm = form(
    this.model,
    (path) => {
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
          this.focusFirstProblem();
        },
      },
    },
  );

  protected readonly documentTypeError = computed(() =>
    this.firstError(this.loginForm.documentType),
  );
  protected readonly documentNumberError = computed(() =>
    this.firstError(this.loginForm.documentNumber),
  );
  protected readonly passwordError = computed(() => this.firstError(this.loginForm.password));

  /** Runs when the form is valid. A failure comes back as errors, so the form stays editable. */
  private async login() {
    this.serverError.set(null);
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

  private failure({ code, message, field }: BffError) {
    this.focusFirstProblem();
    const target = code === 'VALIDATION_ERROR' ? this.fieldNamed(field) : null;
    if (target) {
      return [{ fieldTree: target, kind: 'server', message }];
    }
    this.serverError.set(message);
    return undefined;
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

  /** Errors show once the user touched the field or tried to submit (which touches every field). */
  private firstError(field: FieldTree<string>): string | null {
    const state = field();
    return state.touched() ? (state.errors()[0]?.message ?? null) : null;
  }

  /**
   * After a failed submit the focus goes to the first invalid field, or to the general error when
   * no field is at fault. Waiting for the next render makes sure the error is already on screen.
   */
  private focusFirstProblem(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const target =
          root.querySelector<HTMLElement>('[aria-invalid="true"]') ??
          root.querySelector<HTMLElement>('#login-error');
        target?.focus();
      },
      { injector: this.injector },
    );
  }
}
