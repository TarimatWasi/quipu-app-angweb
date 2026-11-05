import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';

export interface GuestNoticeData {
  readonly title: string;
  /** Always interpolated as text. */
  readonly message: string;
  readonly buttonLabel: string;
}

const NOTICE_TEXT_ID = 'guest-notice-text';

/**
 * A3.5: the rejections shown as a modal (environment occupied, guest not active, guest not
 * temporary), with a single action. It answers true when that action is taken; dismissed, undefined.
 */
@Component({
  selector: 'app-guest-notice-dialog',
  imports: [DialogFrameComponent, MatButton, MatDialogClose],
  // Frame, title and text are P-16 (app-dialog-frame): nothing of its own to style.
  template: `
    <app-dialog-frame [heading]="data.title">
      <p class="message" [id]="textId">{{ data.message }}</p>
      <ng-container dialogActions>
        <button mat-flat-button type="button" [mat-dialog-close]="true" cdkFocusInitial>
          {{ data.buttonLabel }}
        </button>
      </ng-container>
    </app-dialog-frame>
  `,
  styles: `
    .message {
      margin: 0;
    }
  `,
})
export class GuestNoticeDialogComponent {
  protected readonly data = inject<GuestNoticeData>(MAT_DIALOG_DATA);
  protected readonly textId = NOTICE_TEXT_ID;
}

export function openGuestNoticeDialog(
  dialog: MatDialog,
  data: GuestNoticeData,
): MatDialogRef<GuestNoticeDialogComponent, boolean> {
  return dialog.open<GuestNoticeDialogComponent, GuestNoticeData, boolean>(
    GuestNoticeDialogComponent,
    {
      role: 'alertdialog',
      ariaModal: true,
      ariaDescribedBy: NOTICE_TEXT_ID,
      data,
      maxWidth: 'calc(100vw - 2rem)',
      width: '30rem',
    },
  );
}
