import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { FieldTree, form, FormField, FormRoot } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { BffError, toBffError } from '@core/services/bff-error';
import { AuthShellComponent } from '@shared/auth-shell/auth-shell.component';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { FORM_PAGE_STYLES } from '@shared/forms/form-page.styles';
import { newPasswordRules } from '@shared/forms/new-password-rules';

interface ResetPasswordModel {
  newPassword: string;
}

/** The code of the link; an empty one is the same as none. */
function codeOf(route: ActivatedRoute): string | null {
  const code = route.snapshot.queryParamMap.get('code');
  return code === '' ? null : code;
}

/** A0.2 (RF-16): the link of the email brings the code; here the person chooses a new password. */
@Component({
  selector: 'app-reset-password',
  imports: [AuthShellComponent, FormRoot, FormField, MatFormField, MatLabel, MatInput, MatButton, RouterLink],
  templateUrl: './reset-password.component.html',
  styles: FORM_PAGE_STYLES,
})
export class ResetPasswordComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Read once from the link; the address bar is cleaned right away so the code is not kept in it. */
  protected readonly code = signal(codeOf(inject(ActivatedRoute)));
  protected readonly serverError = signal<string | null>(null);
  /** True when the server said the code cannot be used: the only way forward is a new link. */
  protected readonly codeRejected = signal(false);

  private readonly model = signal<ResetPasswordModel>({ newPassword: '' });

  protected readonly resetForm = form(
    this.model,
    (path) => {
      newPasswordRules(path.newPassword);
    },
    {
      submission: {
        action: () => this.reset(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, 'reset-password-error');
        },
      },
    },
  );

  protected readonly newPasswordError = computed(() => firstError(this.resetForm.newPassword));

  constructor() {
    if (this.code() !== null) {
      void this.router.navigate([], { replaceUrl: true, queryParams: {} });
    }
  }

  private async reset() {
    const code = this.code();
    if (code === null) {
      return undefined; // unreachable: without a code the form is not shown
    }
    this.serverError.set(null);
    try {
      await firstValueFrom(this.auth.resetPassword(code, this.model().newPassword));
    } catch (error: unknown) {
      return this.failure(toBffError(error));
    }
    // A session left open in this tab must not bounce the person away from the login page.
    this.auth.clear();
    await this.router.navigate(['/login'], { queryParams: { updated: '1' } });
    return undefined;
  }

  private failure({ code, message, field }: BffError) {
    focusFirstProblem(this.host, this.injector, 'reset-password-error');
    if (field === 'newPassword') {
      return [{ fieldTree: this.newPasswordField(), kind: 'server', message }];
    }
    this.codeRejected.set(code === 'AUTH_INVALID_OR_EXPIRED_CODE');
    this.serverError.set(message);
    return undefined;
  }

  /** The explicit type breaks the circular inference between the form and its submit action. */
  private newPasswordField(): FieldTree<string> {
    return this.resetForm.newPassword;
  }
}
