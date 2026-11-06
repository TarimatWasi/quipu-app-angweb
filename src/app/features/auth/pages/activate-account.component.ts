import { Component, ElementRef, inject, Injector, signal } from '@angular/core';
import { FieldTree, form, FormRoot } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { BffError, toBffError } from '@core/http/bff-error';
import { AuthShellComponent } from '@shared/auth-shell/auth-shell.component';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import { FORM_PAGE_STYLES } from '@shared/forms/form-page.styles';
import { NewPasswordFieldComponent } from '@shared/forms/new-password-field.component';
import { newPasswordRules } from '@shared/forms/new-password-rules';

interface ActivateAccountModel {
  newPassword: string;
}

/**
 * The token of the link. The BFF puts it in the fragment (`/activate#token=…`), which the browser
 * never sends, so it reaches no Referer nor access log; an empty one is the same as none.
 */
function tokenOf(route: ActivatedRoute): string | null {
  const token = new URLSearchParams(route.snapshot.fragment ?? '').get('token');
  return token === '' ? null : token;
}

/**
 * A0.4 (CU-24, RN-32): the link the administrator hands a guest opens here. The guest chooses a
 * password and the BFF starts the session right away, so there is no login afterwards.
 */
@Component({
  selector: 'app-activate-account',
  imports: [AuthShellComponent, FormRoot, NewPasswordFieldComponent, RouterLink],
  templateUrl: './activate-account.component.html',
  styles: FORM_PAGE_STYLES,
})
export class ActivateAccountComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Read once from the link; the address bar is cleaned right away so the token is not kept in it. */
  protected readonly token = signal(tokenOf(inject(ActivatedRoute)));
  protected readonly serverError = signal<string | null>(null);
  /** True when the server said the token cannot be used: only the administrator can give a new one. */
  protected readonly tokenRejected = signal(false);

  private readonly model = signal<ActivateAccountModel>({ newPassword: '' });

  protected readonly activateForm = form(
    this.model,
    (path) => {
      newPasswordRules(path.newPassword);
    },
    {
      submission: {
        action: () => this.activate(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, 'activate-account-error');
        },
      },
    },
  );

  constructor() {
    if (this.token() !== null) {
      void this.router.navigate([], { replaceUrl: true, fragment: undefined });
    }
  }

  private async activate() {
    const token = this.token();
    if (token === null) {
      return undefined; // unreachable: without a token the form is not shown
    }
    this.serverError.set(null);
    try {
      await firstValueFrom(this.auth.activate(token, this.model().newPassword));
    } catch (error: unknown) {
      return this.failure(toBffError(error));
    }
    // TODO(TAR-141): a guest with onboarding steps left goes to O1 instead of the home.
    await this.router.navigateByUrl('/home');
    return undefined;
  }

  private failure({ code, message, field }: BffError) {
    focusFirstProblem(this.host, this.injector, 'activate-account-error');
    // A weak password does not use up the token: the person corrects it and tries again.
    if (field === 'newPassword') {
      return [{ fieldTree: this.newPasswordField(), kind: 'server', message }];
    }
    this.tokenRejected.set(code === 'AUTH_INVALID_OR_EXPIRED_CODE');
    this.serverError.set(message);
    return undefined;
  }

  /** The explicit type breaks the circular inference between the form and its submit action. */
  private newPasswordField(): FieldTree<string> {
    return this.activateForm.newPassword;
  }
}
