import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { toBffError } from '@core/http/bff-error';
import { DialogSubmission } from '@shared/forms/dialog-submission';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';

export interface TerminateContractData {
  readonly title: string;
  /** What finalizing does, one sentence each (CU-12, RN-25). */
  readonly points: readonly string[];
  /** The call to the BFF; the page owns the data, the dialog only the action. */
  readonly terminate: () => Observable<unknown>;
}

const TEXT_ID = 'terminate-contract-text';
const ERROR_ID = 'terminate-contract-error';

/**
 * A4.3 «Finalizar contrato» (CU-12) on P-16: says what changes before changing it. Finalizing frees
 * the environment, does not erase what is owed and does not close the account of the guest. A
 * failure stays inside, in red; it answers true once the contract is finalized.
 */
@Component({
  selector: 'app-terminate-contract-dialog',
  imports: [DialogFrameComponent],
  template: `
    <app-dialog-frame [heading]="data.title">
      <div class="body">
        <ul [id]="textId">
          @for (point of data.points; track point) {
            <li>{{ point }}</li>
          }
        </ul>
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
          (click)="terminate()"
        >
          {{ pending() ? 'Finalizando…' : 'Finalizar contrato' }}
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
  `,
})
export class TerminateContractDialogComponent {
  private readonly ref =
    inject<MatDialogRef<TerminateContractDialogComponent, boolean>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  protected readonly data = inject<TerminateContractData>(MAT_DIALOG_DATA);

  protected readonly textId = TEXT_ID;
  protected readonly errorId = ERROR_ID;
  protected readonly pending = this.submission.pending;
  protected readonly error = signal<string | null>(null);

  protected close(): void {
    this.ref.close();
  }

  protected async terminate(): Promise<void> {
    return this.submission.run(async () => {
      this.error.set(null);
      try {
        await firstValueFrom(this.data.terminate(), { defaultValue: null });
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

export function openTerminateContractDialog(
  dialog: MatDialog,
  data: TerminateContractData,
): MatDialogRef<TerminateContractDialogComponent, boolean> {
  return dialog.open<TerminateContractDialogComponent, TerminateContractData, boolean>(
    TerminateContractDialogComponent,
    {
      ariaDescribedBy: TEXT_ID,
      data,
      width: '30rem',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
