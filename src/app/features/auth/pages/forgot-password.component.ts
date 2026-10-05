import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { email, FieldTree, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { BffError, toBffError } from '@core/services/bff-error';
import { AuthShellComponent } from '@shared/auth-shell/auth-shell.component';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { FORM_PAGE_STYLES } from '@shared/forms/form-page.styles';

interface ForgotPasswordModel {
  email: string;
}

/** A0.2 (RF-16): asks for the email and, whatever the account, says the same thing afterwards. */
@Component({
  selector: 'app-forgot-password',
  imports: [AuthShellComponent, FormRoot, FormField, MatFormField, MatLabel, MatInput, MatButton, RouterLink],
  templateUrl: './forgot-password.component.html',
  styles: FORM_PAGE_STYLES,
})
export class ForgotPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly serverError = signal<string | null>(null);
  /** True once the BFF accepted the request: the answer is the same for any email. */
  protected readonly sent = signal(false);

  private readonly model = signal<ForgotPasswordModel>({ email: '' });

  protected readonly forgotForm = form(
    this.model,
    (path) => {
      required(path.email, { message: 'Ingresa tu correo' });
      email(path.email, { message: 'Ingresa un correo válido' });
    },
    {
      submission: {
        action: () => this.send(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, 'forgot-password-error');
        },
      },
    },
  );

  protected readonly emailError = computed(() => firstError(this.forgotForm.email));

  private async send() {
    this.serverError.set(null);
    try {
      await firstValueFrom(this.auth.requestPasswordReset(this.model().email.trim()));
    } catch (error: unknown) {
      return this.failure(toBffError(error));
    }
    this.sent.set(true);
    // The form (and the focused button) disappears: keep the focus inside the page.
    afterNextRender(
      () => {
        this.host.nativeElement.querySelector<HTMLElement>('#forgot-password-sent')?.focus();
      },
      { injector: this.injector },
    );
    return undefined;
  }

  private failure({ message, field }: BffError) {
    focusFirstProblem(this.host, this.injector, 'forgot-password-error');
    if (field === 'email') {
      return [{ fieldTree: this.emailField(), kind: 'server', message }];
    }
    this.serverError.set(message);
    return undefined;
  }

  /** The explicit type breaks the circular inference between the form and its submit action. */
  private emailField(): FieldTree<string> {
    return this.forgotForm.email;
  }
}
