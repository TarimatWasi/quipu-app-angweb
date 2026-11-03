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
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose, MatButton],
  template: `
    <div class="icon" aria-hidden="true">
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
    </div>
    <h2 mat-dialog-title>{{ title }}</h2>
    <mat-dialog-content>
      <p [id]="textId">{{ text }}</p>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-flat-button type="button" [mat-dialog-close]="reload" cdkFocusInitial>
        Volver a cargar
      </button>
      @if (backLabel; as label) {
        <button mat-button type="button" [mat-dialog-close]="back">{{ label }}</button>
      }
    </mat-dialog-actions>
  `,
  styles: `
    :host {
      display: block;
      padding: 0.5rem 0.5rem 0;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 3.25rem;
      height: 3.25rem;
      margin: 1.25rem 0 0 1.5rem;
      border-radius: 50%;
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    h2 {
      font-family: var(--mat-sys-display-small-font, 'Fraunces', Georgia, serif);
      font-weight: 600;
    }
    p {
      margin: 0 0 1rem;
    }
    mat-dialog-actions {
      gap: 1rem;
      padding: 0.5rem 1.5rem 1.5rem;
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
