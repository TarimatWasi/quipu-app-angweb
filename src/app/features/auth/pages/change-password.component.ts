import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { FieldTree, form, FormField, FormRoot } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { BffError, toBffError } from '@core/services/bff-error';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { FORM_PAGE_STYLES } from '@shared/forms/form-page.styles';
import { newPasswordRules } from '@shared/forms/new-password-rules';

interface ChangePasswordModel {
  newPassword: string;
}

/** A0.1 (RF-12): the first login with a temporary password must end here before anything else. */
@Component({
  selector: 'app-change-password',
  imports: [FormRoot, FormField, MatFormField, MatLabel, MatInput, MatButton],
  templateUrl: './change-password.component.html',
  styles: FORM_PAGE_STYLES,
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
      newPasswordRules(path.newPassword);
    },
    {
      submission: {
        action: () => this.change(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, 'change-password-error');
        },
      },
    },
  );

  protected readonly newPasswordError = computed(() => firstError(this.changeForm.newPassword));

  /** Same as the home "Salir": closes the session in the BFF and goes back to the login. */
  protected async leave(): Promise<void> {
    await firstValueFrom(this.auth.logout());
    await this.router.navigateByUrl('/login');
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
    focusFirstProblem(this.host, this.injector, 'change-password-error');
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
}
