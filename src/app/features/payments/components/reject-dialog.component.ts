import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, maxLength, validate } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstError } from '@shared/forms/form-feedback';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

export interface RejectDialogData {
  /** The payment was already rejected once: the action says "Rechazar de nuevo". */
  readonly again: boolean;
  /** The first name of the guest, who sees the reason; null while it has none. */
  readonly guest?: string | null;
}

/** The shortcuts of A5.2: they fill the reason, which can still be edited. */
export const REJECT_SHORTCUTS = [
  'El monto no coincide',
  'No se lee el voucher',
  'No es de este pago',
] as const;

/** Local text of the empty reason, the same as PAYMENT_REASON_REQUIRED (RN-05). */
export const REASON_REQUIRED_TEXT = 'El motivo de rechazo es obligatorio';

/** The longest reason the BFF keeps. */
export const REASON_MAX_LENGTH = 500;

/**
 * A5.2 «Rechazar pago» (tablero Revision): who sees the reason and that the proofs are kept, the
 * reason (required, RN-05) with the frequent ones as shortcuts and how many characters are left.
 * It answers the trimmed reason, or `undefined` when closed without rejecting; the page sends it.
 */
@Component({
  selector: 'app-reject-dialog',
  imports: [DialogFrameComponent, FieldControlDirective, FormField, FormFieldComponent, FormRoot],
  template: `
    <form [formRoot]="reasonForm" novalidate>
      <app-dialog-frame [heading]="title">
        <div class="body">
          <p class="lead">{{ lead }}</p>
          <app-form-field
            fieldId="reject-reason"
            label="Motivo"
            [help]="help()"
            [error]="reasonError()"
          >
            <textarea
              appFieldControl
              class="quipu-input quipu-input--multiline"
              rows="4"
              aria-required="true"
              [formField]="reasonForm.reason"
            ></textarea>
            <div class="quipu-segmented" role="group" aria-label="Motivos frecuentes">
              @for (shortcut of shortcuts; track shortcut) {
                <button
                  type="button"
                  [attr.aria-pressed]="reason() === shortcut"
                  (click)="use(shortcut)"
                >
                  {{ shortcut }}
                </button>
              }
            </div>
          </app-form-field>
        </div>
        <ng-container dialogActions>
          <button class="quipu-button quipu-button--tertiary" type="button" (click)="cancel()">
            Cancelar
          </button>
          <button class="quipu-button quipu-button--primary" type="submit">{{ title }}</button>
        </ng-container>
      </app-dialog-frame>
    </form>
  `,
  styles: `
    .body {
      display: grid;
      gap: 1.25rem;
    }
    .lead {
      margin: 0;
      color: var(--quipu-tinta-secundaria);
    }
  `,
})
export class RejectDialogComponent {
  private readonly ref = inject<MatDialogRef<RejectDialogComponent, string>>(MatDialogRef);
  private readonly data = inject<RejectDialogData>(MAT_DIALOG_DATA);

  protected readonly title = this.data.again ? 'Rechazar de nuevo' : 'Rechazar pago';
  protected readonly lead = `${this.data.guest ?? 'El huésped'} verá el motivo en su inicio, solo en la app. Sus comprobantes se conservan: podrá agregar otro o corregirlos.`;
  protected readonly shortcuts = REJECT_SHORTCUTS;

  private readonly model = signal({ reason: '' });
  protected readonly reason = computed(() => this.model().reason);
  protected readonly reasonForm = form(
    this.model,
    (path) => {
      maxLength(path.reason, REASON_MAX_LENGTH);
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
  protected readonly help = computed(
    () =>
      `Di qué está mal y qué tiene que hacer. ${String(this.reason().length)} de ${String(REASON_MAX_LENGTH)} caracteres.`,
  );

  protected use(shortcut: string): void {
    this.model.set({ reason: shortcut });
  }

  protected cancel(): void {
    this.ref.close();
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
