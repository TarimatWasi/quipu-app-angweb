import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';
import { documentText, GUEST_STATUS_BADGES } from '../model/guest-texts';
import type { Tone } from '../model/guest-texts';
import {
  ALREADY_REGISTERED_TEXT,
  ALREADY_REGISTERED_TITLE,
  LOST_ACCESS_TEXT,
  UNNAMED_TEXT,
} from '../model/new-guest';
import type { NonInactiveGuestSummary } from '../model/new-guest';
import { NEW_GUEST_DIALOG_STYLES } from './new-guest-dialog.styles';

/** The P-08 tone of each colour of a guest badge. */
const STATUS_TONES: Readonly<Record<Tone, StatusTone>> = {
  ok: 'paid',
  wait: 'review',
  none: 'unpaid',
  bad: 'overdue',
};

const TEXT_ID = 'already-registered-text';

/**
 * A3.1, the answer 200 of createGuest (RN-18): the document belongs to a guest who is not inactive.
 * Nothing was created or changed; «Ver huésped» answers true and the page opens its file.
 */
@Component({
  selector: 'app-already-registered-dialog',
  imports: [DialogFrameComponent, MatDialogClose, StatusBadgeComponent],
  template: `
    <app-dialog-frame [heading]="title">
      <div class="body">
        <div class="card">
          <span class="document">{{ document }}</span>
          @if (guest.name; as name) {
            <span class="quipu-name">{{ name }}</span>
          } @else {
            <span class="quipu-unnamed">{{ unnamed }}</span>
          }
          <app-status-badge [tone]="tone" [label]="badge.label" />
        </div>
        <p [id]="textId">{{ text }}</p>
      </div>
      <ng-container dialogActions>
        <button class="quipu-button quipu-button--tertiary" type="button" mat-dialog-close>
          Cerrar
        </button>
        <button
          class="quipu-button quipu-button--primary"
          type="button"
          cdkFocusInitial
          [mat-dialog-close]="true"
        >
          Ver huésped
        </button>
      </ng-container>
    </app-dialog-frame>
  `,
  styles: NEW_GUEST_DIALOG_STYLES,
})
export class AlreadyRegisteredDialogComponent {
  protected readonly guest = inject<NonInactiveGuestSummary>(MAT_DIALOG_DATA);

  protected readonly title = ALREADY_REGISTERED_TITLE;
  protected readonly unnamed = UNNAMED_TEXT;
  protected readonly textId = TEXT_ID;
  protected readonly document = documentText(this.guest);
  protected readonly badge = GUEST_STATUS_BADGES[this.guest.status];
  protected readonly tone = STATUS_TONES[this.badge.tone];
  protected readonly text =
    this.guest.status === 'PENDING_ACTIVATION'
      ? `${ALREADY_REGISTERED_TEXT}${LOST_ACCESS_TEXT}`
      : ALREADY_REGISTERED_TEXT;
}

/** Opens the notice; `afterClosed()` gives true when «Ver huésped» was chosen. */
export function openAlreadyRegisteredDialog(
  dialog: MatDialog,
  guest: NonInactiveGuestSummary,
): MatDialogRef<AlreadyRegisteredDialogComponent, boolean> {
  return dialog.open<AlreadyRegisteredDialogComponent, NonInactiveGuestSummary, boolean>(
    AlreadyRegisteredDialogComponent,
    {
      ariaDescribedBy: TEXT_ID,
      data: guest,
      width: 'var(--quipu-dialogo-ancho)',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
