import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { FieldTree, form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { BffError, toBffError } from '@core/http/bff-error';
import { AuthShellComponent } from '@shared/auth-shell/auth-shell.component';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { FORM_PAGE_STYLES } from '@shared/forms/form-page.styles';
import { NewPasswordFieldComponent } from '@shared/forms/new-password-field.component';
import { newPasswordRules } from '@shared/forms/new-password-rules';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { adminNameProblem } from '../model/admin-name';

interface ActivateAdminModel {
  name: string;
  newPassword: string;
}

/** The code of the link; an empty one is the same as none. */
function codeOf(route: ActivatedRoute): string | null {
  const code = route.snapshot.queryParamMap.get('code');
  return code === '' ? null : code;
}

/**
 * A0.5 (RF-22): the email that gives an administrator access links here. The new administrator
 * writes their name and chooses a password; then they sign in with their document, because the BFF
 * does not start a session. It is the recovery of A0.2 with the name added.
 */
@Component({
  selector: 'app-activate-admin',
  imports: [
    FieldControlDirective,
    FormFieldComponent,
    AuthShellComponent,
    FormRoot,
    FormField,
    NewPasswordFieldComponent,
    RouterLink,
  ],
  templateUrl: './activate-admin.component.html',
  styles: FORM_PAGE_STYLES,
})
export class ActivateAdminComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Read once from the link; the address bar is cleaned right away so the code is not kept in it. */
  protected readonly code = signal(codeOf(inject(ActivatedRoute)));
  protected readonly serverError = signal<string | null>(null);
  /** True when the server said the code cannot be used: the only way forward is a new link. */
  protected readonly codeRejected = signal(false);

  private readonly model = signal<ActivateAdminModel>({ name: '', newPassword: '' });

  protected readonly activateForm = form(
    this.model,
    (path) => {
      // The BFF trims the name and wants 1 to 100 characters, none of control and not only spaces.
      validate(path.name, ({ value }) => adminNameProblem(value()) ?? undefined);
      newPasswordRules(path.newPassword);
    },
    {
      submission: {
        action: () => this.activate(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, 'activate-admin-error');
        },
      },
    },
  );

  protected readonly nameError = computed(() => firstError(this.activateForm.name));

  constructor() {
    if (this.code() !== null) {
      void this.router.navigate([], { replaceUrl: true, queryParams: {} });
    }
  }

  private async activate() {
    const code = this.code();
    if (code === null) {
      return undefined; // unreachable: without a code the form is not shown
    }
    this.serverError.set(null);
    const { name, newPassword } = this.model();
    try {
      await firstValueFrom(this.auth.resetPassword(code, newPassword, name.trim()));
    } catch (error: unknown) {
      return this.failure(toBffError(error));
    }
    // A session left open in this tab must not bounce the person away from the login page.
    this.auth.clear();
    await this.router.navigate(['/login'], { queryParams: { updated: '1' } });
    return undefined;
  }

  private failure({ code, message, field }: BffError) {
    focusFirstProblem(this.host, this.injector, 'activate-admin-error');
    // A wrong name or password does not use up the code: the person corrects it and tries again.
    if (field === 'name') {
      return [{ fieldTree: this.nameField(), kind: 'server', message }];
    }
    if (field === 'newPassword') {
      return [{ fieldTree: this.newPasswordField(), kind: 'server', message }];
    }
    this.codeRejected.set(code === 'AUTH_INVALID_OR_EXPIRED_CODE');
    this.serverError.set(message);
    return undefined;
  }

  /** The explicit types break the circular inference between the form and its submit action. */
  private nameField(): FieldTree<string> {
    return this.activateForm.name;
  }

  private newPasswordField(): FieldTree<string> {
    return this.activateForm.newPassword;
  }
}
