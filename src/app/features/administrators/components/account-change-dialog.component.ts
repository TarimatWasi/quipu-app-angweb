import { DialogSubmission } from '@shared/forms/dialog-submission';
import { Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { FieldTree, form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { toBffError } from '@core/http/bff-error';
import { firstError, focusFirstProblem, focusWhenInvalid } from '@shared/forms/form-feedback';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import type { AdministratorAction } from '../model/administrator';
import {
  changeProblem,
  changeTexts,
  MAX_PASSWORD_LENGTH,
  PASSWORD_HELP_TEXT,
  PASSWORD_LENGTH_TEXT,
  PASSWORD_TEXT,
} from '../model/administrator-texts';
import { ADMIN_DIALOG_STYLES } from './admin-dialog.styles';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

export interface AccountChangeData {
  readonly action: AdministratorAction;
  /** Its name, or its email while it has none. */
  readonly who: string;
  /** The call to the BFF with the password of the session; the page owns the data. */
  readonly change: (currentPassword: string) => Observable<void>;
}

/** Id the dialog is described by (`aria-describedby`): the sentence under the title. */
export const ACCOUNT_CHANGE_LEAD_ID = 'account-change-lead';

const TOP_ERROR_ID = 'account-change-top-error';
const BOTTOM_ERROR_ID = 'account-change-error';

/**
 * A7 «¿Desactivar a …?» and «¿Reactivar a …?» (RF-22, TAR-127) on P-16: only the password of the
 * session, which the BFF checks before anything else. Deactivating uses the danger button. What
 * blocks the change whatever is typed (the maximum, the own account, the last active one) is the
 * red notice above the field. It closes with `true` once the change is done.
 */
@Component({
  selector: 'app-account-change-dialog',
  imports: [
    FieldControlDirective,
    FormFieldComponent,
    DialogFrameComponent,
    FormRoot,
    FormField,
    PageNoticeComponent,
  ],
  template: `
    <form
      [formRoot]="changeForm"
      novalidate
      [attr.aria-describedby]="bottomError() ? bottomErrorId : null"
    >
      <app-dialog-frame [heading]="texts.title">
        <div class="body">
          <p [id]="leadId">{{ texts.lead }}</p>
          @if (topError(); as message) {
            <app-page-notice tone="error" [id]="topErrorId" tabindex="-1" [heading]="message" />
          }
          <app-form-field
            fieldId="account-change-password"
            label="Tu contraseña"
            [help]="passwordHelp"
            [error]="passwordError()"
          >
            <input
              appFieldControl
              class="quipu-input"
              type="password"
              autocomplete="current-password"
              aria-required="true"
              [formField]="changeForm.currentPassword"
            />
          </app-form-field>
          @if (bottomError(); as message) {
            <p [id]="bottomErrorId" class="quipu-alert" role="alert" tabindex="-1">
              {{ message }}
            </p>
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
          <button [class]="confirmClass" type="submit" [disabled]="saving()">
            {{ saving() ? texts.busyButton : texts.button }}
          </button>
        </ng-container>
      </app-dialog-frame>
    </form>
  `,
  styles: ADMIN_DIALOG_STYLES,
})
export class AccountChangeDialogComponent {
  private readonly ref = inject<MatDialogRef<AccountChangeDialogComponent, boolean>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  private readonly data = inject<AccountChangeData>(MAT_DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly texts = changeTexts(this.data.action, this.data.who);
  protected readonly confirmClass =
    this.data.action === 'deactivate'
      ? 'quipu-button quipu-button--danger'
      : 'quipu-button quipu-button--primary';
  protected readonly leadId = ACCOUNT_CHANGE_LEAD_ID;
  protected readonly passwordHelp = PASSWORD_HELP_TEXT;
  protected readonly topErrorId = TOP_ERROR_ID;
  protected readonly bottomErrorId = BOTTOM_ERROR_ID;
  protected readonly topError = signal<string | null>(null);
  protected readonly bottomError = signal<string | null>(null);

  private readonly model = signal({ currentPassword: '' });

  protected readonly changeForm = form(
    this.model,
    (path) => {
      required(path.currentPassword, { message: PASSWORD_TEXT });
      maxLength(path.currentPassword, MAX_PASSWORD_LENGTH, { message: PASSWORD_LENGTH_TEXT });
    },
    {
      submission: {
        action: () => this.confirm(),
        onInvalid: focusWhenInvalid(this.host, this.injector, BOTTOM_ERROR_ID),
      },
    },
  );

  protected readonly passwordError = computed(() => firstError(this.changeForm.currentPassword));
  protected readonly saving = computed(() => this.changeForm().submitting());

  protected cancel(): void {
    this.ref.close();
  }

  /** Runs when the form is valid. A failure comes back as errors, so the dialog stays editable. */
  private async confirm() {
    return this.submission.run(async () => {
      this.topError.set(null);
      this.bottomError.set(null);

      try {
        await firstValueFrom(this.data.change(this.model().currentPassword), {
          defaultValue: undefined,
        });

        this.ref.close(true);
        return undefined;
      } catch (error: unknown) {
        if (this.submission.sessionEnded(error)) return undefined;
        return this.failure(error);
      }
    });
  }

  private failure(error: unknown) {
    const problem = changeProblem(toBffError(error));
    const generalId = problem.place === 'top' ? TOP_ERROR_ID : BOTTOM_ERROR_ID;
    focusFirstProblem(this.host, this.injector, generalId);
    switch (problem.place) {
      case 'field':
        return [{ fieldTree: this.passwordField(), kind: 'server', message: problem.message }];
      case 'top':
        this.topError.set(problem.message);
        return undefined;
      case 'bottom':
        this.bottomError.set(problem.message);
        return undefined;
    }
  }

  // The explicit type breaks the circular inference between the form and its submit action.
  private passwordField(): FieldTree<string> {
    return this.changeForm.currentPassword;
  }
}

/** Opens the deactivation or the reactivation, described by its lead; `true` once it is done. */
export function openAccountChangeDialog(
  dialog: MatDialog,
  data: AccountChangeData,
): MatDialogRef<AccountChangeDialogComponent, boolean> {
  return dialog.open<AccountChangeDialogComponent, AccountChangeData, boolean>(
    AccountChangeDialogComponent,
    {
      ariaDescribedBy: ACCOUNT_CHANGE_LEAD_ID,
      data,
      width: 'var(--quipu-dialogo-ancho)',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
