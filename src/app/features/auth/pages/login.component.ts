import { Component, computed, inject, signal } from '@angular/core';
import { FieldTree, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toBffError } from '@core/services/bff-error';
import { AuthService, DocumentType } from '@core/services/auth.service';

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
  `,
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly serverError = signal<string | null>(null);

  private readonly model = signal<LoginModel>({
    documentType: 'DNI',
    documentNumber: '',
    password: '',
  });

  protected readonly loginForm = form(
    this.model,
    (path) => {
      required(path.documentNumber, { message: 'Ingresa tu número de documento' });
      required(path.password, { message: 'Ingresa tu contraseña' });
    },
    { submission: { action: () => this.login() } },
  );

  protected readonly documentNumberError = computed(() =>
    this.firstError(this.loginForm.documentNumber),
  );
  protected readonly passwordError = computed(() => this.firstError(this.loginForm.password));

  /** Runs when the form is valid. A failure comes back as errors, so the form stays editable. */
  private async login() {
    this.serverError.set(null);
    try {
      await firstValueFrom(this.auth.login(this.model()));
    } catch (error: unknown) {
      const { code, message, field } = toBffError(error);
      const target = code === 'VALIDATION_ERROR' ? this.fieldNamed(field) : null;
      if (target) {
        return [{ fieldTree: target, kind: 'server', message }];
      }
      this.serverError.set(message);
      return undefined;
    }
    await this.router.navigateByUrl('/home');
    return undefined;
  }

  private fieldNamed(name: string | undefined): FieldTree<string> | null {
    switch (name) {
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
}
