import { DialogSubmission } from '@shared/forms/dialog-submission';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { FieldTree, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import type { RestoreFocusValue } from '@angular/cdk/dialog';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { BffError, toBffError } from '@core/http/bff-error';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { NewPasswordFieldComponent } from '@shared/forms/new-password-field.component';
import { newPasswordRules } from '@shared/forms/new-password-rules';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';

/** Id the dialog is described by (`aria-describedby`): the sentence under the title. */
export const CHANGE_PASSWORD_TEXT_ID = 'change-password-text';

const GENERAL_ERROR_ID = 'change-password-dialog-error';

// Texts that depend on this dialog: the catalog ones speak of the login and of the temporary
// password of A0.1.
const CURRENT_PASSWORD_WRONG_TEXT = 'Tu contraseña actual no es correcta.';
const PASSWORD_UNCHANGED_TEXT = 'Elige una contraseña distinta de la actual';

interface ChangePasswordModel {
  currentPassword: string;
  newPassword: string;
}

/**
 * A0.6, from the account menu of the bar (P-01): the person changes the password with the current
 * one and stays signed in (the BFF already replaced the cookie). It closes with `true` once the
 * password changed; the bar tells it with a toast. A 401 is the session interceptor's: the dialog
 * only goes away. «¿No la recuerdas?» leads to the recovery, which needs no session.
 */
@Component({
  selector: 'app-change-password-dialog',
  imports: [
    DialogFrameComponent,
    FormRoot,
    FormField,
    NewPasswordFieldComponent,
    FormFieldComponent,
    FieldControlDirective,
  ],
  template: `
    <form
      [formRoot]="changeForm"
      novalidate
      [attr.aria-describedby]="serverError() ? generalErrorId : null"
    >
      <app-dialog-frame heading="Cambiar contraseña">
        <div class="body">
          <p [id]="textId">
            Seguirás con la sesión abierta aquí. La próxima vez entra con la contraseña nueva.
          </p>
          <app-form-field
            fieldId="current-password"
            label="Contraseña actual"
            [error]="currentError()"
          >
            <input
              appFieldControl
              class="quipu-input"
              type="password"
              autocomplete="current-password"
              aria-required="true"
              [formField]="changeForm.currentPassword"
            />
            <a
              fieldAfter
              class="recover"
              href="/forgot-password"
              [attr.aria-disabled]="saving() ? 'true' : null"
              (click)="recover($event)"
              >¿No la recuerdas?</a
            >
          </app-form-field>
          <app-new-password-field [field]="changeForm.newPassword" />
          @if (serverError(); as message) {
            <p [id]="generalErrorId" class="quipu-alert" tabindex="-1">{{ message }}</p>
          }
        </div>
        <ng-container dialogActions>
          <button
            class="quipu-button quipu-button--secondary"
            type="button"
            [disabled]="saving()"
            (click)="cancel()"
          >
            Cancelar
          </button>
          <button class="quipu-button quipu-button--primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Cambiar contraseña' }}
          </button>
        </ng-container>
      </app-dialog-frame>
    </form>
  `,
  // The frame, the fields, the alert and the buttons are the kit's; here only the gaps.
  styles: `
    .body {
      display: grid;
      gap: 1rem;
    }
    p {
      margin: 0;
    }
    .recover {
      display: inline-flex;
      align-items: center;
      justify-self: start;
      min-height: var(--quipu-toque);
    }
  `,
})
export class ChangePasswordDialogComponent {
  private readonly ref = inject<MatDialogRef<ChangePasswordDialogComponent, boolean>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly textId = CHANGE_PASSWORD_TEXT_ID;
  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly serverError = signal<string | null>(null);
  private readonly leaving = signal(false);

  private readonly model = signal<ChangePasswordModel>({ currentPassword: '', newPassword: '' });

  protected readonly changeForm = form(
    this.model,
    (path) => {
      required(path.currentPassword, { message: 'Ingresa tu contraseña actual' });
      newPasswordRules(path.newPassword);
    },
    {
      submission: {
        action: () => this.change(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
        },
      },
    },
  );

  protected readonly currentError = computed(() => firstError(this.changeForm.currentPassword));
  protected readonly saving = computed(() => this.changeForm().submitting() || this.leaving());

  protected cancel(): void {
    this.ref.close();
  }

  /**
   * The recovery (/forgot-password) is for someone without a session: the dialog closes, the
   * session is closed in the BFF and the person goes there.
   */
  protected async recover(event: Event): Promise<void> {
    event.preventDefault();
    // While a change is on its way its answer may replace the cookie after the logout expired it.
    if (this.saving()) return;
    this.leaving.set(true);
    try {
      await this.submission.run(async () => {
        await firstValueFrom(this.auth.logout());
        this.ref.close();
        await this.router.navigateByUrl('/forgot-password');
      });
    } catch (error: unknown) {
      this.serverError.set(toBffError(error).message);
    } finally {
      this.leaving.set(false);
    }
  }

  /** Runs when the form is valid. A failure comes back as errors, so the dialog stays editable. */
  private async change() {
    return this.submission.run(async () => {
      this.serverError.set(null);

      const { currentPassword, newPassword } = this.model();
      try {
        await firstValueFrom(this.auth.changePassword(newPassword, currentPassword));
      } catch (error: unknown) {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // The session interceptor already forgot the session and goes to the login.
          this.ref.close();
          return undefined;
        }
        return this.failure(toBffError(error));
      }

      this.ref.close(true);
      return undefined;
    });
  }

  private failure({ code, field, message }: BffError) {
    focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
    if (code === 'AUTH_INVALID_CREDENTIALS' || field === 'currentPassword') {
      const text = code === 'AUTH_INVALID_CREDENTIALS' ? CURRENT_PASSWORD_WRONG_TEXT : message;
      return [{ fieldTree: this.currentPasswordField(), kind: 'server', message: text }];
    }
    if (field === 'newPassword') {
      const text = code === 'AUTH_PASSWORD_UNCHANGED' ? PASSWORD_UNCHANGED_TEXT : message;
      return [{ fieldTree: this.newPasswordField(), kind: 'server', message: text }];
    }
    this.serverError.set(message);
    return undefined;
  }

  // The explicit types break the circular inference between the form and its submit action.
  private currentPasswordField(): FieldTree<string> {
    return this.changeForm.currentPassword;
  }

  private newPasswordField(): FieldTree<string> {
    return this.changeForm.newPassword;
  }
}

/**
 * Opens A0.6 described by its sentence. `restoreFocus` is where the focus goes back once it closes
 * (the menu that opened it is gone by then). `afterClosed()` gives `true` when the password changed.
 */
export function openChangePasswordDialog(
  dialog: MatDialog,
  restoreFocus: RestoreFocusValue = true,
): MatDialogRef<ChangePasswordDialogComponent, boolean> {
  return dialog.open<ChangePasswordDialogComponent, undefined, boolean>(
    ChangePasswordDialogComponent,
    {
      ariaDescribedBy: CHANGE_PASSWORD_TEXT_ID,
      restoreFocus,
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}

/** Keeps Material and the password form behind the account-menu interaction. */
export function openChangePasswordFromInjector(
  injector: Injector,
  restoreFocus: RestoreFocusValue = true,
) {
  return openChangePasswordDialog(injector.get(MatDialog), restoreFocus);
}
