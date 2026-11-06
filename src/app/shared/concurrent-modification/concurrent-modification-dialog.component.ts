import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';

/** What the person chose: reload the record, or take the secondary action (leave the screen). */
export type ConcurrentModificationChoice = 'reload' | 'back';

/**
 * What the dialog answers when it closes. `undefined` means it was dismissed (Escape) without
 * choosing: like 'back', it never means reload, so the screen keeps what it shows and saves nothing.
 */
export type ConcurrentModificationDialogResult = ConcurrentModificationChoice | undefined;

export interface ConcurrentModificationDialogData {
  /** Defaults to {@link CONCURRENT_MODIFICATION_DEFAULT_TITLE}; e.g. "El ambiente cambió". */
  readonly title?: string;
  /** Label of the secondary action, e.g. "Volver a Ambientes". Without one, only "Volver a cargar". */
  readonly backLabel?: string;
}

export const CONCURRENT_MODIFICATION_DEFAULT_TITLE = 'El registro cambió';

/** The sentence of the dialog, always the same (BE-SPR-DAT-13). */
export const CONCURRENT_MODIFICATION_TEXT =
  'El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo';

/** Id the dialog is described by (`aria-describedby`): the sentence that explains the conflict. */
export const CONCURRENT_MODIFICATION_TEXT_ID = 'concurrent-modification-text';

function nonBlank(text: string | undefined): string | undefined {
  const trimmed = text?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}

/**
 * Shown when a save answers 409 CONCURRENT_MODIFICATION: someone else changed the record after it
 * was loaded, nothing was saved, and the only safe way on is to reload it. The title and the label
 * are interpolated as text.
 */
@Component({
  selector: 'app-concurrent-modification-dialog',
  imports: [DialogFrameComponent, MatDialogClose],
  // Frame, icon, title and text are P-16 (app-dialog-frame): nothing of its own to style.
  template: `
    <app-dialog-frame [heading]="title">
      <span class="quipu-dialog-icon quipu-dialog-icon--success" dialogIcon aria-hidden="true">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <path d="M21 3v6h-6" />
        </svg>
      </span>
      <p class="message" [id]="textId">{{ text }}</p>
      <ng-container dialogActions>
        <button
          class="quipu-button quipu-button--primary"
          type="button"
          [mat-dialog-close]="reload"
          cdkFocusInitial
        >
          Volver a cargar
        </button>
        @if (backLabel; as label) {
          <button
            class="quipu-button quipu-button--tertiary"
            type="button"
            [mat-dialog-close]="back"
          >
            {{ label }}
          </button>
        }
      </ng-container>
    </app-dialog-frame>
  `,
  styles: `
    .message {
      margin: 0;
    }
  `,
})
export class ConcurrentModificationDialogComponent {
  private readonly data =
    inject<ConcurrentModificationDialogData | null>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  protected readonly title = nonBlank(this.data.title) ?? CONCURRENT_MODIFICATION_DEFAULT_TITLE;
  protected readonly backLabel = nonBlank(this.data.backLabel);
  protected readonly text = CONCURRENT_MODIFICATION_TEXT;
  protected readonly textId = CONCURRENT_MODIFICATION_TEXT_ID;
  protected readonly reload: ConcurrentModificationChoice = 'reload';
  protected readonly back: ConcurrentModificationChoice = 'back';
}

/**
 * Opens the dialog the way every screen should: an alert dialog, modal, described by its sentence.
 * `afterClosed()` gives the {@link ConcurrentModificationDialogResult}.
 */
export function openConcurrentModificationDialog(
  dialog: MatDialog,
  data: ConcurrentModificationDialogData = {},
): MatDialogRef<ConcurrentModificationDialogComponent, ConcurrentModificationChoice> {
  return dialog.open<
    ConcurrentModificationDialogComponent,
    ConcurrentModificationDialogData,
    ConcurrentModificationChoice
  >(ConcurrentModificationDialogComponent, {
    role: 'alertdialog',
    ariaModal: true,
    ariaDescribedBy: CONCURRENT_MODIFICATION_TEXT_ID,
    data,
    maxWidth: 'calc(100vw - 2rem)',
  });
}
