import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import {
  FieldTree,
  form,
  FormField,
  FormRoot,
  minLength,
  required,
  validate,
} from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { BffError, toBffError } from '@core/services/bff-error';

const MIN_LENGTH = 8;
/** bcrypt, which the backend uses, hashes at most 72 bytes; accented letters take two. */
const MAX_BYTES = 72;
const ENCODER = new TextEncoder();

interface ChangePasswordModel {
  newPassword: string;
}

/** A0.1 (RF-12): the first login with a temporary password must end here before anything else. */
@Component({
  selector: 'app-change-password',
  imports: [FormRoot, FormField, MatFormField, MatLabel, MatInput, MatButton],
  templateUrl: './change-password.component.html',
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
export class ChangePasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly serverError = signal<string | null>(null);

  private readonly model = signal<ChangePasswordModel>({ newPassword: '' });

  protected readonly changeForm = form(
    this.model,
    (path) => {
      required(path.newPassword, { message: 'Ingresa tu nueva contraseña' });
      minLength(path.newPassword, MIN_LENGTH, { message: 'Mínimo 8 caracteres' });
      validate(path.newPassword, ({ value }) =>
        ENCODER.encode(value()).length > MAX_BYTES
          ? { kind: 'tooLong', message: 'La contraseña es demasiado larga' }
          : undefined,
      );
    },
    {
      submission: {
        action: () => this.change(),
        onInvalid: () => {
          this.focusFirstProblem();
        },
      },
    },
  );

  protected readonly newPasswordError = computed(() =>
    this.firstError(this.changeForm.newPassword),
  );

  /** Same as the home "Salir": the BFF has no logout yet, so this only forgets the session in this tab. */
  protected leave(): void {
    this.auth.clear();
    void this.router.navigateByUrl('/login');
  }

  /** Runs when the form is valid. A failure comes back as errors, so the form stays editable. */
  private async change() {
    this.serverError.set(null);
    try {
      await firstValueFrom(this.auth.changePassword(this.model().newPassword));
    } catch (error: unknown) {
      return this.failure(toBffError(error));
    }
    await this.router.navigateByUrl('/home');
    return undefined;
  }

  private failure({ message, field }: BffError) {
    this.focusFirstProblem();
    if (field === 'newPassword') {
      return [{ fieldTree: this.newPasswordField(), kind: 'server', message }];
    }
    this.serverError.set(message);
    return undefined;
  }

  /** The explicit type breaks the circular inference between the form and its submit action. */
  private newPasswordField(): FieldTree<string> {
    return this.changeForm.newPassword;
  }

  /** Errors show once the user touched the field or tried to submit (which touches every field). */
  private firstError(field: FieldTree<string>): string | null {
    const state = field();
    return state.touched() ? (state.errors()[0]?.message ?? null) : null;
  }

  /** Waiting for the next render makes sure the error is already on screen before focusing it. */
  private focusFirstProblem(): void {
    afterNextRender(
      () => {
        const root = this.host.nativeElement;
        const target =
          root.querySelector<HTMLElement>('[aria-invalid="true"]') ??
          root.querySelector<HTMLElement>('#change-password-error');
        target?.focus();
      },
      { injector: this.injector },
    );
  }
}
