import { Component, input } from '@angular/core';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';

/**
 * P-16 Diálogo: the visual frame of a dialog opened with MatDialog (which brings the veil, traps
 * the focus, closes on Escape and gives the focus back). The title labels the dialog; an optional
 * `[dialogIcon]` goes above it, the body is the projected content and the actions go in
 * `[dialogActions]`, on the right, with a single primary one. Box, width, title and text come from
 * the Material dialog tokens of styles.scss; here only the order and the gaps.
 */
@Component({
  selector: 'app-dialog-frame',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions],
  template: `
    <div class="icon"><ng-content select="[dialogIcon]" /></div>
    <h2 mat-dialog-title>{{ heading() }}</h2>
    <mat-dialog-content><ng-content /></mat-dialog-content>
    <mat-dialog-actions align="end"><ng-content select="[dialogActions]" /></mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
    }
    .icon:empty {
      display: none;
    }
    .icon {
      padding: 1.5rem 1.5rem 0;
    }
    mat-dialog-actions {
      flex-wrap: wrap;
      gap: 0.75rem;
      padding: 0.5rem 1.5rem 1.5rem;
    }
  `,
})
export class DialogFrameComponent {
  readonly heading = input.required<string>();
}
