import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { toBffError } from '@core/http/bff-error';
import { DialogSubmission } from '@shared/forms/dialog-submission';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';

export interface DeleteMovementData {
  readonly title: string;
  /** What is deleted, in bold: the description of an expense or the guest of a fine. */
  readonly what: string;
  /** And its detail under it: «Mantenimiento y reparaciones · S/ 320.00». */
  readonly detail: string;
  /** What changes in the balance and that it does not come back (RN-24). */
  readonly text: string;
  readonly button: string;
  /** The call to the BFF; the page owns the data, the dialog only the confirmation. */
  readonly remove: () => Observable<unknown>;
}

const TEXT_ID = 'delete-movement-text';
const ERROR_ID = 'delete-movement-error';

/**
 * A6.2 «Eliminar egreso» and A6.4 «Eliminar multa» (RN-24) on P-16: asks before deleting and says
 * what leaves the balance of the month. A failure stays inside, in red; it answers true once deleted.
 */
@Component({
  selector: 'app-delete-movement-dialog',
  imports: [DialogFrameComponent],
  template: `
    <app-dialog-frame [heading]="data.title">
      <div class="body">
        <p class="what">
          <strong>{{ data.what }}</strong>
          <span>{{ data.detail }}</span>
        </p>
        <p [id]="textId">{{ data.text }}</p>
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
          (click)="remove()"
        >
          {{ pending() ? 'Eliminando…' : data.button }}
        </button>
      </ng-container>
    </app-dialog-frame>
  `,
  styles: `
    .body {
      display: grid;
      gap: 0.75rem;
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
export class DeleteMovementDialogComponent {
  private readonly ref = inject<MatDialogRef<DeleteMovementDialogComponent, boolean>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  protected readonly data = inject<DeleteMovementData>(MAT_DIALOG_DATA);

  protected readonly textId = TEXT_ID;
  protected readonly errorId = ERROR_ID;
  protected readonly pending = this.submission.pending;
  protected readonly error = signal<string | null>(null);

  protected close(): void {
    this.ref.close();
  }

  protected async remove(): Promise<void> {
    return this.submission.run(async () => {
      this.error.set(null);
      try {
        await firstValueFrom(this.data.remove(), { defaultValue: null });
        this.ref.close(true);
      } catch (error: unknown) {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          // The session interceptor already forgot the session and goes to the login.
          this.ref.close();
          return;
        }
        this.error.set(toBffError(error).message);
      }
    });
  }
}

/** Opens the confirmation; `afterClosed()` gives true once the movement is deleted. */
export function openDeleteMovementDialog(
  dialog: MatDialog,
  data: DeleteMovementData,
): MatDialogRef<DeleteMovementDialogComponent, boolean> {
  return dialog.open<DeleteMovementDialogComponent, DeleteMovementData, boolean>(
    DeleteMovementDialogComponent,
    { ariaDescribedBy: TEXT_ID, data, width: '30rem', maxWidth: 'calc(100vw - 2rem)' },
  );
}
