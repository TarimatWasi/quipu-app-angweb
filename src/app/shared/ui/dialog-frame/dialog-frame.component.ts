import { Component, input } from '@angular/core';
import { MatDialogActions, MatDialogContent, MatDialogTitle } from '@angular/material/dialog';

/**
 * P-16 Diálogo: the visual frame of a dialog opened with MatDialog (which brings the veil, traps
 * the focus, closes on Escape and gives the focus back). The title in Fraunces 28 px labels the
 * dialog; the body is the projected content and the actions go in `[dialogActions]`, on the
 * right, with a single primary one.
 */
@Component({
  selector: 'app-dialog-frame',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions],
  template: `
    <h2 mat-dialog-title>{{ heading() }}</h2>
    <mat-dialog-content><ng-content /></mat-dialog-content>
    <mat-dialog-actions align="end"><ng-content select="[dialogActions]" /></mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
      max-width: 30rem;
      color: var(--quipu-tinta);
    }
    h2 {
      font-family: 'Fraunces', Georgia, serif;
      font-size: 1.75rem;
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }
    mat-dialog-content {
      font-size: 1rem;
      line-height: 1.5;
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
