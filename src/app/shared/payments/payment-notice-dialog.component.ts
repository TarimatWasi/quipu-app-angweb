import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';

export interface PaymentNoticeAction {
  readonly label: string;
  readonly value: string;
}

export interface PaymentNoticeData {
  readonly title: string;
  /** The BFF's own message (QP-UI-17), shown as text. */
  readonly message: string;
  /** The first one is the main action and takes the focus. */
  readonly actions: readonly PaymentNoticeAction[];
}

export const PAYMENT_NOTICE_TEXT_ID = 'payment-notice-text';

/**
 * A5.2: the conflicts the SRS shows as a modal (already resolved, already an approved payment, the
 * month is no longer charged, it can no longer be corrected). It answers the chosen action's value.
 */
@Component({
  selector: 'app-payment-notice-dialog',
  imports: [DialogFrameComponent, MatDialogClose],
  template: `
    <app-dialog-frame [heading]="data.title">
      <p class="text" [id]="textId">{{ data.message }}</p>
      <ng-container dialogActions>
        @for (action of data.actions; track action.value; let first = $first) {
          @if (first) {
            <button
              class="quipu-button quipu-button--primary"
              type="button"
              cdkFocusInitial
              [mat-dialog-close]="action.value"
            >
              {{ action.label }}
            </button>
          } @else {
            <button
              class="quipu-button quipu-button--tertiary"
              type="button"
              [mat-dialog-close]="action.value"
            >
              {{ action.label }}
            </button>
          }
        }
      </ng-container>
    </app-dialog-frame>
  `,
  styles: `
    .text {
      margin: 0;
    }
  `,
})
export class PaymentNoticeDialogComponent {
  protected readonly data = inject<PaymentNoticeData>(MAT_DIALOG_DATA);
  protected readonly textId = PAYMENT_NOTICE_TEXT_ID;
}

export function openPaymentNoticeDialog(
  dialog: MatDialog,
  data: PaymentNoticeData,
): MatDialogRef<PaymentNoticeDialogComponent, string> {
  return dialog.open<PaymentNoticeDialogComponent, PaymentNoticeData, string>(
    PaymentNoticeDialogComponent,
    {
      role: 'alertdialog',
      ariaModal: true,
      ariaDescribedBy: PAYMENT_NOTICE_TEXT_ID,
      data,
      maxWidth: 'calc(100vw - 2rem)',
      width: '30rem',
    },
  );
}
