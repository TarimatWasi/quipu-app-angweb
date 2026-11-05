import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { DEBT_TEXT, DEBT_TITLE } from '../model/new-guest';
import type { PendingDebt } from '../model/new-guest';
import { NEW_GUEST_DIALOG_STYLES } from './new-guest-dialog.styles';

export interface PendingDebtData {
  /** The document the administrator typed, «DNI 70412233». */
  readonly document: string;
  readonly debt: PendingDebt;
  /** The sentence under the title when the screen words it its own way (A3.2); A3.1's by default. */
  readonly text?: string;
}

const TEXT_ID = 'pending-debt-text';

/**
 * A3.1 and A3.2 «Primero salda su deuda» (RN-25, RN-35): the inactive guest owes, so it is not
 * reactivated.
 * It lists what is owed, oldest first, with the total; «Registrar pago» answers true and the page
 * opens the direct payment (A5.1) for that guest.
 */
@Component({
  selector: 'app-pending-debt-dialog',
  imports: [DialogFrameComponent, MatDialogClose],
  template: `
    <app-dialog-frame [heading]="title">
      <div class="body">
        <div class="card">
          <span class="document">{{ data.document }}</span>
        </div>
        <p [id]="textId">{{ text }}</p>
        <ul class="debts" aria-label="Lo que debe">
          @for (line of data.debt.lines; track $index) {
            <li>
              <span>{{ line.label }}</span>
              @if (line.amount; as amount) {
                <span class="amount">{{ amount }}</span>
              }
            </li>
          }
          @if (data.debt.total; as total) {
            <li class="total">
              <span>Total</span>
              <span class="amount">{{ total }}</span>
            </li>
          }
        </ul>
      </div>
      <ng-container dialogActions>
        <button class="quipu-button quipu-button--tertiary" type="button" mat-dialog-close>
          Cancelar
        </button>
        <button
          class="quipu-button quipu-button--primary"
          type="button"
          cdkFocusInitial
          [mat-dialog-close]="true"
        >
          Registrar pago
        </button>
      </ng-container>
    </app-dialog-frame>
  `,
  styles: NEW_GUEST_DIALOG_STYLES,
})
export class PendingDebtDialogComponent {
  protected readonly data = inject<PendingDebtData>(MAT_DIALOG_DATA);

  protected readonly title = DEBT_TITLE;
  protected readonly text = this.data.text ?? DEBT_TEXT;
  protected readonly textId = TEXT_ID;
}

/** Opens the notice; `afterClosed()` gives true when «Registrar pago» was chosen. */
export function openPendingDebtDialog(
  dialog: MatDialog,
  data: PendingDebtData,
): MatDialogRef<PendingDebtDialogComponent, boolean> {
  return dialog.open<PendingDebtDialogComponent, PendingDebtData, boolean>(
    PendingDebtDialogComponent,
    {
      role: 'alertdialog',
      ariaDescribedBy: TEXT_ID,
      data,
      width: 'var(--quipu-dialogo-ancho)',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
