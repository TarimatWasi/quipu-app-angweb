import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { DialogSubmission } from '@shared/forms/dialog-submission';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';

/** What a screen gives to ask «¿Seguro?» before an action that cannot be undone (TAR-323). */
export interface ConfirmActionData {
  readonly title: string;
  /** What the action does, one sentence each (a list). */
  readonly points?: readonly string[];
  /** What the action is about, in bold, and its detail under it («Mantenimiento · S/ 320.00»). */
  readonly lead?: { readonly what: string; readonly detail: string };
  /** The sentence of the dialog; it is also what a screen reader reads when it opens. */
  readonly text?: string;
  /** The button that does it, and what it says while it does. */
  readonly button: string;
  readonly pendingButton: string;
  /** The call to the BFF; the page owns the data, the dialog only the confirmation. */
  readonly run: () => Observable<unknown>;
  /** What the dialog says when the call fails, in red (the caller words it: shared knows no BFF). */
  readonly failureText: (error: unknown) => string;
}

const TEXT_ID = 'confirm-action-text';
const ERROR_ID = 'confirm-action-error';

/**
 * P-16 confirmation of an action (finalize a contract, delete an expense or a fine): says what
 * changes before changing it, with «Cancelar» and the button that does it. A failure stays inside,
 * in red; a 401 is the session interceptor's and the dialog only goes away. It answers true once
 * the action is done.
 */
@Component({
  selector: 'app-confirm-action-dialog',
  imports: [DialogFrameComponent],
  template: `
    <app-dialog-frame [heading]="data.title">
      <div class="body">
        @if (data.lead; as lead) {
          <p class="what">
            <strong>{{ lead.what }}</strong>
            <span>{{ lead.detail }}</span>
          </p>
        }
        @if (data.points; as points) {
          <ul [id]="textId">
            @for (point of points; track point) {
              <li>{{ point }}</li>
            }
          </ul>
        }
        @if (data.text; as text) {
          <p [id]="textId">{{ text }}</p>
        }
        @if (error(); as message) {
          <p class="quipu-alert" role="alert" [id]="errorId">{{ message }}</p>
        }
      </div>
      <ng-container dialogActions>
        <button
          class="quipu-button quipu-button--tertiary"
          type="button"
          [disabled]="pending()"
          (click)="close()"
        >
          Cancelar
        </button>
        <button
          class="quipu-button quipu-button--primary"
          type="button"
          cdkFocusInitial
          [disabled]="pending()"
          (click)="confirm()"
        >
          {{ pending() ? data.pendingButton : data.button }}
        </button>
      </ng-container>
    </app-dialog-frame>
  `,
  styles: `
    .body {
      display: grid;
      gap: 0.75rem;
    }
    ul {
      display: grid;
      gap: 0.5rem;
      margin: 0;
      padding-left: 1.25rem;
    }
    p {
      margin: 0;
    }
    .what {
      display: grid;
      gap: 0.25rem;
    }
    .what span {
      color: var(--quipu-tinta-secundaria);
    }
  `,
})
export class ConfirmActionDialogComponent {
  private readonly ref = inject<MatDialogRef<ConfirmActionDialogComponent, boolean>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  protected readonly data = inject<ConfirmActionData>(MAT_DIALOG_DATA);

  protected readonly textId = TEXT_ID;
  protected readonly errorId = ERROR_ID;
  protected readonly pending = this.submission.pending;
  protected readonly error = signal<string | null>(null);

  protected close(): void {
    this.ref.close();
  }

  protected async confirm(): Promise<void> {
    return this.submission.run(async () => {
      this.error.set(null);
      try {
        await firstValueFrom(this.data.run(), { defaultValue: null });
        this.ref.close(true);
      } catch (error: unknown) {
        if (this.submission.sessionEnded(error)) return;
        this.error.set(this.data.failureText(error));
      }
    });
  }
}

/** Opens the confirmation; `afterClosed()` gives true once the action is done. */
export function openConfirmActionDialog(
  dialog: MatDialog,
  data: ConfirmActionData,
): MatDialogRef<ConfirmActionDialogComponent, boolean> {
  return dialog.open<ConfirmActionDialogComponent, ConfirmActionData, boolean>(
    ConfirmActionDialogComponent,
    { ariaDescribedBy: TEXT_ID, data, width: '30rem', maxWidth: 'calc(100vw - 2rem)' },
  );
}
