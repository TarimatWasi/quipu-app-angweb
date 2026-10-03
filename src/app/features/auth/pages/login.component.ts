import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FieldTree, form, FormField, FormRoot, required, validate } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, map } from 'rxjs';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
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
  imports: [FormRoot, FormField, MatFormField, MatLabel, MatInput, MatButton, RouterLink],
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
  /** The recovery flow sends the person here with `?updated=1` once the password is saved. */
  protected readonly passwordUpdated = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('updated') === '1')),
    { initialValue: false },
  );
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
    focusFirstProblem(this.host, this.injector, 'login-error');
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
}
