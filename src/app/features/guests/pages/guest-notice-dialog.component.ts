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

/** What the person chose: the main action, or the optional second one. */
export type GuestNoticeChoice = 'main' | 'second';

export interface GuestNoticeData {
  readonly title: string;
  /** The BFF's own message (QP-UI-17), always interpolated as text. */
  readonly message: string;
  readonly mainLabel: string;
  readonly secondLabel?: string;
}

const NOTICE_TEXT_ID = 'guest-notice-text';

/**
 * A3.5: the rejections the SRS shows as a modal (environment occupied, guest not active, guest not
 * temporary), with the BFF's message. It answers which action was taken; dismissed, undefined.
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
      <button mat-flat-button type="button" mat-dialog-close="main" cdkFocusInitial>
        {{ data.mainLabel }}
      </button>
      @if (data.secondLabel; as label) {
        <button mat-button type="button" mat-dialog-close="second">{{ label }}</button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    mat-dialog-actions {
      gap: 0.5rem;
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
): MatDialogRef<GuestNoticeDialogComponent, GuestNoticeChoice> {
  return dialog.open<GuestNoticeDialogComponent, GuestNoticeData, GuestNoticeChoice>(
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
