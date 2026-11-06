import { DialogSubmission } from '@shared/forms/dialog-submission';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom, Observable } from 'rxjs';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import {
  callFailure,
  INACTIVE_TEXT,
  INACTIVE_TITLE,
  pendingDebt,
  reactivateProblem,
} from '../model/new-guest';
import type { NonInactiveGuestSummary, PendingDebt } from '../model/new-guest';
import { NEW_GUEST_DIALOG_STYLES } from './new-guest-dialog.styles';

export interface InactiveGuestData {
  /** The document the administrator typed, «DNI 70412233». */
  readonly document: string;
  /** The call to the BFF; the page owns the data, the dialog only the action. */
  readonly reactivate: () => Observable<NonInactiveGuestSummary>;
}

/** How the dialog ended: reactivated, blocked by a debt, or nothing (closed or session gone). */
export type InactiveGuestResult =
  { readonly kind: 'reactivated' } | { readonly kind: 'debt'; readonly debt: PendingDebt };

const TEXT_ID = 'inactive-guest-text';
const ERROR_ID = 'inactive-guest-error';

/**
 * A3.1, the answer 409 GUEST_INACTIVE of createGuest (RN-12, RN-18): the document belongs to an
 * inactive guest, who can be reactivated from here (CU-28). A debt (RN-35) closes it with what is
 * owed, so the page explains it in its own dialog; any other failure stays inside, in red.
 */
@Component({
  selector: 'app-inactive-guest-dialog',
  imports: [DialogFrameComponent],
  template: `
    <app-dialog-frame [heading]="title">
      <div class="body">
        <div class="card">
          <span class="document">{{ data.document }}</span>
        </div>
        <p [id]="textId">{{ text }}</p>
        @if (error(); as message) {
          <p class="quipu-alert" role="alert" [id]="errorId">{{ message }}</p>
        }
      </div>
      <ng-container dialogActions>
        <button
          class="quipu-button quipu-button--tertiary"
          type="button"
          [disabled]="busy()"
          (click)="cancel()"
        >
          Cancelar
        </button>
        <button
          class="quipu-button quipu-button--primary"
          type="button"
          cdkFocusInitial
          [disabled]="busy()"
          (click)="reactivate()"
        >
          {{ busy() ? 'Reactivando…' : 'Reactivar huésped' }}
        </button>
      </ng-container>
    </app-dialog-frame>
  `,
  styles: NEW_GUEST_DIALOG_STYLES,
})
export class InactiveGuestDialogComponent {
  private readonly ref =
    inject<MatDialogRef<InactiveGuestDialogComponent, InactiveGuestResult>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  protected readonly data = inject<InactiveGuestData>(MAT_DIALOG_DATA);

  protected readonly title = INACTIVE_TITLE;
  protected readonly text = INACTIVE_TEXT;
  protected readonly textId = TEXT_ID;
  protected readonly errorId = ERROR_ID;
  protected readonly busy = this.submission.pending;
  protected readonly error = signal<string | null>(null);

  protected cancel(): void {
    this.ref.close();
  }

  protected async reactivate(): Promise<void> {
    return this.submission.run(async () => {
      this.error.set(null);
      try {
        await firstValueFrom(this.data.reactivate());
        this.finish({ kind: 'reactivated' });
      } catch (error: unknown) {
        this.failed(error);
      }
    });
  }

  private failed(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      // The session interceptor already forgot the session and goes to the login.
      this.finish();
      return;
    }
    const failure = callFailure(error);
    const debt = pendingDebt(failure);
    if (debt !== null) {
      this.finish({ kind: 'debt', debt });
      return;
    }
    this.error.set(reactivateProblem(failure));
  }

  private finish(result?: InactiveGuestResult): void {
    this.ref.close(result);
  }
}

export function openInactiveGuestDialog(
  dialog: MatDialog,
  data: InactiveGuestData,
): MatDialogRef<InactiveGuestDialogComponent, InactiveGuestResult> {
  return dialog.open<InactiveGuestDialogComponent, InactiveGuestData, InactiveGuestResult>(
    InactiveGuestDialogComponent,
    {
      ariaDescribedBy: TEXT_ID,
      data,
      width: 'var(--quipu-dialogo-ancho)',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
