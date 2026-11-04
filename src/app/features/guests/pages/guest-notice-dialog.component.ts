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
  imports: [MatButton, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p [id]="textId">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-flat-button type="button" [mat-dialog-close]="true" cdkFocusInitial>
        {{ data.buttonLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    h2 {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 28px;
      font-weight: 600;
      line-height: 1.15;
    }
    p {
      margin: 0;
      font-size: 17px;
      line-height: 1.5;
    }
    mat-dialog-actions {
      justify-content: end;
      padding: 0 1.5rem 1.5rem;
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
