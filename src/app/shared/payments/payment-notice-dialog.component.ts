import { Component, inject } from '@angular/core';
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
  imports: [MatButton, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p [id]="textId">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      @for (action of data.actions; track action.value; let first = $first) {
        @if (first) {
          <button mat-flat-button type="button" [mat-dialog-close]="action.value" cdkFocusInitial>
            {{ action.label }}
          </button>
        } @else {
          <button mat-button type="button" [mat-dialog-close]="action.value">
            {{ action.label }}
          </button>
        }
      }
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-actions {
      gap: 0.5rem;
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
