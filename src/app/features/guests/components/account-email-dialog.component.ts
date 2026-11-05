import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import {
  email,
  FieldTree,
  form,
  FormField,
  FormRoot,
  maxLength,
  required,
} from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import {
  EMAIL_FIELD_HELP,
  EMAIL_INVALID_TEXT,
  EMAIL_LEAD,
  EMAIL_LONG_TEXT,
  EMAIL_REQUIRED_TEXT,
  EMAIL_TITLE,
  emailProblem,
} from '../model/detail-actions';
import { callFailure, MAX_EMAIL_LENGTH } from '../model/new-guest';
import { NEW_GUEST_DIALOG_STYLES } from './new-guest-dialog.styles';

export interface AccountEmailData {
  /** The account email it has now, to start from; null without one. */
  readonly current: string | null;
  /** The call to the BFF; the page owns the data, the dialog only the form. */
  readonly save: (email: string) => Observable<unknown>;
}

type FieldErrors = { fieldTree: FieldTree<string>; kind: 'server'; message: string }[];

const LEAD_ID = 'account-email-lead';
const ERROR_ID = 'account-email-error';

/**
 * A3.2 «Correo de cuenta» (RF-16, D-76) on P-16: the email the password recovery writes to, apart
 * from the contact email the guest changes. It checks it before calling the BFF (FE-ANG-FRM-03); a
 * taken email goes under the field, anything else above the buttons. Answers true once saved.
 */
@Component({
  selector: 'app-account-email-dialog',
  imports: [DialogFrameComponent, FormField, FormRoot],
  template: `
    <form novalidate [formRoot]="emailForm" [attr.aria-describedby]="error() ? errorId : null">
      <app-dialog-frame [heading]="title">
        <div class="body">
          <p [id]="leadId">{{ lead }}</p>
          <div class="quipu-field">
            <label class="quipu-label" for="account-email">Correo de cuenta</label>
            <input
              class="quipu-input"
              id="account-email"
              type="email"
              autocomplete="off"
              aria-required="true"
              [formField]="emailForm.email"
              [attr.aria-invalid]="emailError() ? 'true' : null"
              [attr.aria-describedby]="
                emailError() ? 'account-email-error account-email-help' : 'account-email-help'
              "
            />
            @if (emailError(); as message) {
              <p id="account-email-error" class="quipu-field-error">{{ message }}</p>
            }
            <p id="account-email-help" class="quipu-field-help">{{ help }}</p>
          </div>
          @if (error(); as message) {
            <p class="quipu-alert" role="alert" tabindex="-1" [id]="errorId">{{ message }}</p>
          }
        </div>
        <ng-container dialogActions>
          <button
            class="quipu-button quipu-button--tertiary"
            type="button"
            [disabled]="saving()"
            (click)="cancel()"
          >
            Cancelar
          </button>
          <button class="quipu-button quipu-button--primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Guardando…' : 'Guardar correo' }}
          </button>
        </ng-container>
      </app-dialog-frame>
    </form>
  `,
  styles: NEW_GUEST_DIALOG_STYLES,
})
export class AccountEmailDialogComponent {
  private readonly ref = inject<MatDialogRef<AccountEmailDialogComponent, boolean>>(MatDialogRef);
  private readonly data = inject<AccountEmailData>(MAT_DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly title = EMAIL_TITLE;
  protected readonly lead = EMAIL_LEAD;
  protected readonly help = EMAIL_FIELD_HELP;
  protected readonly leadId = LEAD_ID;
  protected readonly errorId = ERROR_ID;
  protected readonly error = signal<string | null>(null);

  private readonly model = signal({ email: this.data.current ?? '' });

  protected readonly emailForm = form(
    this.model,
    (path) => {
      required(path.email, { message: EMAIL_REQUIRED_TEXT });
      email(path.email, { message: EMAIL_INVALID_TEXT });
      maxLength(path.email, MAX_EMAIL_LENGTH, { message: EMAIL_LONG_TEXT });
    },
    {
      submission: {
        action: () => this.save(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, ERROR_ID);
        },
      },
    },
  );

  protected readonly emailError = computed(() => firstError(this.emailForm.email));
  protected readonly saving = computed(() => this.emailForm().submitting());

  protected cancel(): void {
    this.ref.close();
  }

  /** Runs when the form is valid. A failure comes back as errors, so the dialog stays editable. */
  // The explicit type breaks the circular inference between the form and its submit action.
  private async save(): Promise<FieldErrors | undefined> {
    this.error.set(null);
    this.ref.disableClose = true;
    try {
      await firstValueFrom(this.data.save(this.model().email.trim()), { defaultValue: null });
      this.ref.disableClose = false;
      this.ref.close(true);
      return undefined;
    } catch (error: unknown) {
      this.ref.disableClose = false;
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // The session interceptor already forgot the session and goes to the login.
        this.ref.close();
        return undefined;
      }
      const problem = emailProblem(callFailure(error));
      focusFirstProblem(this.host, this.injector, ERROR_ID);
      if (problem.place === 'general') {
        this.error.set(problem.message);
        return undefined;
      }
      return [{ fieldTree: this.emailForm.email, kind: 'server', message: problem.message }];
    }
  }
}

/** Opens «Correo de cuenta» described by its lead; `afterClosed()` gives true once saved. */
export function openAccountEmailDialog(
  dialog: MatDialog,
  data: AccountEmailData,
): MatDialogRef<AccountEmailDialogComponent, boolean> {
  return dialog.open<AccountEmailDialogComponent, AccountEmailData, boolean>(
    AccountEmailDialogComponent,
    {
      ariaDescribedBy: LEAD_ID,
      data,
      width: 'var(--quipu-dialogo-ancho)',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
