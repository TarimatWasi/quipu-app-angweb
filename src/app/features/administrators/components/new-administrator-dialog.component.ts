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
  validate,
} from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { toBffError } from '@core/http/bff-error';
import { firstError, focusFirstProblem } from '@shared/forms/form-feedback';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import type {
  AdministratorCreated,
  AdministratorInput,
  DocumentType,
} from '../model/administrator';
import {
  createProblem,
  DOCUMENT_TYPE_OPTIONS,
  documentNumberError,
  EMAIL_HELP_TEXT,
  EMAIL_LENGTH_TEXT,
  EMAIL_TEXT,
  MAX_EMAIL_LENGTH,
  MAX_PASSWORD_LENGTH,
  NEW_ADMIN_LEAD,
  PASSWORD_HELP_TEXT,
  PASSWORD_LENGTH_TEXT,
  PASSWORD_TEXT,
} from '../model/administrator-texts';
import type { CreateField } from '../model/administrator-texts';
import { ADMIN_DIALOG_STYLES } from './admin-dialog.styles';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

export interface NewAdministratorData {
  /** The call to the BFF; the page owns the data, the dialog only the form. */
  readonly create: (input: AdministratorInput) => Observable<AdministratorCreated>;
}

/** What the dialog answers once the account exists: the email, for the notice when it was not sent. */
export interface NewAdministratorResult {
  readonly email: string;
  readonly emailSent: boolean;
}

/** Id the dialog is described by (`aria-describedby`): the sentence under the title. */
export const NEW_ADMIN_LEAD_ID = 'new-admin-lead';

const TOP_ERROR_ID = 'new-admin-top-error';
const BOTTOM_ERROR_ID = 'new-admin-error';

interface NewAdministratorModel {
  documentType: DocumentType;
  documentNumber: string;
  email: string;
  currentPassword: string;
}

/**
 * A7 «Nuevo administrador» (RF-22, CU-30) on P-16: the document and the account email of the new
 * administrator, and the password of the session to confirm it. It checks what the contract checks
 * before calling the BFF (FE-ANG-FRM-03) and puts each server error where it belongs: under its
 * field, as the red notice above the form (the maximum) or under the form (too many attempts).
 * A 401 is the session interceptor's: the dialog only goes away.
 */
@Component({
  selector: 'app-new-administrator-dialog',
  imports: [
    FieldControlDirective,
    FormFieldComponent,
    DialogFrameComponent,
    FormRoot,
    FormField,
    PageNoticeComponent,
  ],
  templateUrl: './new-administrator-dialog.component.html',
  styles: ADMIN_DIALOG_STYLES,
})
export class NewAdministratorDialogComponent {
  private readonly ref =
    inject<MatDialogRef<NewAdministratorDialogComponent, NewAdministratorResult>>(MatDialogRef);
  private readonly data = inject<NewAdministratorData>(MAT_DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly leadId = NEW_ADMIN_LEAD_ID;
  protected readonly lead = NEW_ADMIN_LEAD;
  protected readonly emailHelp = EMAIL_HELP_TEXT;
  protected readonly passwordHelp = PASSWORD_HELP_TEXT;
  protected readonly documentTypes = DOCUMENT_TYPE_OPTIONS;
  protected readonly topErrorId = TOP_ERROR_ID;
  protected readonly bottomErrorId = BOTTOM_ERROR_ID;
  protected readonly topError = signal<string | null>(null);
  protected readonly bottomError = signal<string | null>(null);

  private readonly model = signal<NewAdministratorModel>({
    documentType: 'DNI',
    documentNumber: '',
    email: '',
    currentPassword: '',
  });

  protected readonly adminForm = form(
    this.model,
    (path) => {
      validate(path.documentNumber, (field) => {
        const message = documentNumberError(field.valueOf(path.documentType), field.value());
        return message === null ? undefined : { kind: 'documentNumber', message };
      });
      required(path.email, { message: EMAIL_TEXT });
      email(path.email, { message: EMAIL_TEXT });
      maxLength(path.email, MAX_EMAIL_LENGTH, { message: EMAIL_LENGTH_TEXT });
      required(path.currentPassword, { message: PASSWORD_TEXT });
      maxLength(path.currentPassword, MAX_PASSWORD_LENGTH, { message: PASSWORD_LENGTH_TEXT });
    },
    {
      submission: {
        action: () => this.create(),
        onInvalid: () => {
          focusFirstProblem(this.host, this.injector, BOTTOM_ERROR_ID);
        },
      },
    },
  );

  protected readonly documentType = computed(() => this.model().documentType);
  protected readonly numberError = computed(() => firstError(this.adminForm.documentNumber));
  protected readonly emailError = computed(() => firstError(this.adminForm.email));
  protected readonly passwordError = computed(() => firstError(this.adminForm.currentPassword));
  protected readonly saving = computed(() => this.adminForm().submitting());

  protected chooseType(documentType: DocumentType): void {
    this.model.update((model) => ({ ...model, documentType }));
  }

  protected cancel(): void {
    this.ref.close();
  }

  /** Runs when the form is valid. A failure comes back as errors, so the dialog stays editable. */
  private async create() {
    this.topError.set(null);
    this.bottomError.set(null);
    this.ref.disableClose = true;
    const { documentType, documentNumber, email: account, currentPassword } = this.model();
    const input = {
      documentType,
      documentNumber: documentNumber.trim(),
      email: account.trim(),
      currentPassword,
    };
    try {
      const created = await firstValueFrom(this.data.create(input));
      this.ref.disableClose = false;
      this.ref.close({ email: input.email, emailSent: created.emailSent });
      return undefined;
    } catch (error: unknown) {
      this.ref.disableClose = false;
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // The session interceptor already forgot the session and goes to the login.
        this.ref.close();
        return undefined;
      }
      return this.failure(error);
    }
  }

  private failure(error: unknown) {
    const problem = createProblem(toBffError(error));
    focusFirstProblem(
      this.host,
      this.injector,
      problem.place === 'top' ? TOP_ERROR_ID : BOTTOM_ERROR_ID,
    );
    switch (problem.place) {
      case 'field':
        return [
          { fieldTree: this.fieldOf(problem.field), kind: 'server', message: problem.message },
        ];
      case 'top':
        this.topError.set(problem.message);
        return undefined;
      case 'bottom':
        this.bottomError.set(problem.message);
        return undefined;
    }
  }

  // The explicit type breaks the circular inference between the form and its submit action.
  private fieldOf(field: CreateField): FieldTree<string> {
    const fields: Record<CreateField, FieldTree<string>> = {
      documentNumber: this.adminForm.documentNumber,
      email: this.adminForm.email,
      currentPassword: this.adminForm.currentPassword,
    };
    return fields[field];
  }
}

/** Opens «Nuevo administrador» described by its lead. `afterClosed()` gives the result once created. */
export function openNewAdministratorDialog(
  dialog: MatDialog,
  data: NewAdministratorData,
): MatDialogRef<NewAdministratorDialogComponent, NewAdministratorResult> {
  return dialog.open<NewAdministratorDialogComponent, NewAdministratorData, NewAdministratorResult>(
    NewAdministratorDialogComponent,
    {
      ariaDescribedBy: NEW_ADMIN_LEAD_ID,
      data,
      width: 'var(--quipu-dialogo-ancho)',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
