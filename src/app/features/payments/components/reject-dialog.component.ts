import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { firstError } from '@shared/forms/form-feedback';

export interface RejectDialogData {
  /** The payment was already rejected once: the action says "Rechazar de nuevo". */
  readonly again: boolean;
}

/** The shortcuts of A5.2: they fill the reason, which can still be edited. */
export const REJECT_SHORTCUTS = [
  'El monto no coincide',
  'No se lee el voucher',
  'No es de este pago',
] as const;

/** Local text of the empty reason, the same as PAYMENT_REASON_REQUIRED (RN-05). */
export const REASON_REQUIRED_TEXT = 'El motivo de rechazo es obligatorio';

/**
 * A5.2: asks the reason of a rejection (required, RN-05). It answers the trimmed reason, or
 * `undefined` when closed without rejecting; the page sends it to the BFF.
 */
@Component({
  selector: 'app-reject-dialog',
  imports: [
    FormRoot,
    FormField,
    MatButton,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatFormField,
    MatLabel,
    MatInput,
  ],
  template: `
    <form [formRoot]="reasonForm" novalidate>
      <h2 mat-dialog-title>{{ title }}</h2>
      <mat-dialog-content>
        <p id="reject-help">El motivo se muestra al huésped solo en la app.</p>
        <div class="shortcuts" role="group" aria-label="Motivos frecuentes">
          @for (shortcut of shortcuts; track shortcut) {
            <button mat-stroked-button type="button" (click)="use(shortcut)">{{ shortcut }}</button>
          }
        </div>
        <mat-form-field>
          <mat-label>Motivo</mat-label>
          <textarea
            matInput
            id="reject-reason"
            rows="3"
            aria-required="true"
            [formField]="reasonForm.reason"
            [attr.aria-invalid]="reasonError() ? 'true' : null"
            [attr.aria-describedby]="reasonError() ? 'reject-reason-error' : 'reject-help'"
          ></textarea>
        </mat-form-field>
        @if (reasonError(); as message) {
          <p id="reject-reason-error" class="error">{{ message }}</p>
        }
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-flat-button type="submit">Rechazar pago</button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .shortcuts {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    mat-form-field {
      width: 100%;
    }
    .error {
      margin: 0;
      color: var(--mat-sys-error);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class RejectDialogComponent {
  private readonly ref = inject<MatDialogRef<RejectDialogComponent, string>>(MatDialogRef);
  private readonly data = inject<RejectDialogData>(MAT_DIALOG_DATA);

  protected readonly title = this.data.again ? 'Rechazar de nuevo' : 'Rechazar pago';
  protected readonly shortcuts = REJECT_SHORTCUTS;
  private readonly model = signal({ reason: '' });

  protected readonly reasonForm = form(
    this.model,
    (path) => {
      validate(path.reason, ({ value }) =>
        value().trim() === '' ? { kind: 'required', message: REASON_REQUIRED_TEXT } : undefined,
      );
    },
    {
      submission: {
        action: () => {
          this.ref.close(this.model().reason.trim());
          return Promise.resolve(undefined);
        },
      },
    },
  );

  protected readonly reasonError = computed(() => firstError(this.reasonForm.reason));

  protected use(shortcut: string): void {
    this.model.set({ reason: shortcut });
  }
}

export function openRejectDialog(
  dialog: MatDialog,
  data: RejectDialogData,
): MatDialogRef<RejectDialogComponent, string> {
  return dialog.open<RejectDialogComponent, RejectDialogData, string>(RejectDialogComponent, {
    data,
    maxWidth: 'calc(100vw - 2rem)',
    width: '32rem',
  });
}
