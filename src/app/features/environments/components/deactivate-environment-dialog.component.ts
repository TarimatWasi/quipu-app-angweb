import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { DialogSubmission } from '@shared/forms/dialog-submission';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import { busyText, busyTitle, CONFIRM_TEXT, confirmTitle } from '../model/environment';
import type { Occupant } from '../model/environment';

type OccupiedError = components['schemas']['EnvironmentOccupiedError'];

export interface DeactivateEnvironmentData {
  readonly code: string;
  /** Who is in it or comes next, when the list already says so: the dialog tells without calling. */
  readonly occupant: Occupant | null;
  /** The day in Lima, yyyy-mm-dd, to tell a stay that is now from one that comes later. */
  readonly today: string;
  /** The call to the BFF; the page owns the data, the dialog only the action. */
  readonly deactivate: () => Observable<unknown>;
}

const TEXT_ID = 'deactivate-environment-text';
const ERROR_ID = 'deactivate-environment-error';

/** The 409 ENVIRONMENT_OCCUPIED of the BFF, with who is in it when it says so; null for any other error. */
function occupiedBy(error: unknown): { readonly occupant: Occupant | undefined } | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) return null;
  const body = error.error as Partial<OccupiedError> | null;
  return body?.code === 'ENVIRONMENT_OCCUPIED' ? { occupant: body.occupant } : null;
}

/**
 * A2.2 «Desactivar ambiente» (CU-10, RN-12) on P-16. An occupant — known before or answered as 409
 * ENVIRONMENT_OCCUPIED — turns the dialog into the notice that says who and what to do; a stay has
 * its guest to open. Any other failure stays inside, in red. It answers true once it is deactivated.
 */
@Component({
  selector: 'app-deactivate-environment-dialog',
  imports: [DialogFrameComponent, RouterLink],
  template: `
    <app-dialog-frame [heading]="heading()">
      <div class="body">
        <p [id]="textId">{{ text() }}</p>
        @if (error(); as message) {
          <p class="quipu-alert" role="alert" [id]="errorId">{{ message }}</p>
        }
      </div>
      <ng-container dialogActions>
        @if (isBusy()) {
          <button
            class="quipu-button quipu-button--tertiary"
            type="button"
            cdkFocusInitial
            (click)="close()"
          >
            Cerrar
          </button>
          @if (guestLink(); as link) {
            <a class="quipu-button quipu-button--primary" [routerLink]="link" (click)="close()"
              >Ver huésped</a
            >
          }
          @if (contractLink(); as link) {
            <a class="quipu-button quipu-button--primary" [routerLink]="link" (click)="close()"
              >Ver contrato vigente</a
            >
          }
        } @else {
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
            (click)="deactivate()"
          >
            {{ pending() ? 'Desactivando…' : 'Desactivar ambiente' }}
          </button>
        }
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
  `,
})
export class DeactivateEnvironmentDialogComponent {
  private readonly ref =
    inject<MatDialogRef<DeactivateEnvironmentDialogComponent, boolean>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  protected readonly data = inject<DeactivateEnvironmentData>(MAT_DIALOG_DATA);

  protected readonly textId = TEXT_ID;
  protected readonly errorId = ERROR_ID;
  /** Who is in it or comes next, from the list or from the answer of the BFF. */
  private readonly occupied = signal<{ readonly occupant: Occupant | undefined } | null>(
    this.data.occupant === null ? null : { occupant: this.data.occupant },
  );
  protected readonly isBusy = computed(() => this.occupied() !== null);
  protected readonly pending = this.submission.pending;
  protected readonly error = signal<string | null>(null);
  protected readonly heading = computed(() =>
    this.isBusy() ? busyTitle(this.data.code) : confirmTitle(this.data.code),
  );
  protected readonly text = computed(() =>
    this.isBusy() ? busyText(this.occupied()?.occupant, this.data.today) : CONFIRM_TEXT,
  );
  /** The contract in it, or the guest of a stay, to open from the notice. */
  protected readonly guestLink = computed(() => {
    const occupant = this.occupied()?.occupant;
    return occupant?.kind === 'STAY' ? ['/admin/guests', occupant.guestId] : null;
  });
  protected readonly contractLink = computed(() => {
    const occupant = this.occupied()?.occupant;
    return occupant?.kind === 'CONTRACT' && occupant.contractId !== null
      ? ['/admin/contracts', occupant.contractId]
      : null;
  });

  protected close(): void {
    this.ref.close();
  }

  protected async deactivate(): Promise<void> {
    return this.submission.run(async () => {
      this.error.set(null);
      try {
        await firstValueFrom(this.data.deactivate(), { defaultValue: null });
        this.ref.close(true);
      } catch (error: unknown) {
        this.failed(error);
      }
    });
  }

  private failed(error: unknown): void {
    if (error instanceof HttpErrorResponse && error.status === 401) {
      // The session interceptor already forgot the session and goes to the login.
      this.ref.close();
      return;
    }
    const occupied = occupiedBy(error);
    if (occupied !== null) {
      this.occupied.set(occupied);
      return;
    }
    this.error.set(toBffErrorWithServerMessage(error).message);
  }
}

export function openDeactivateEnvironmentDialog(
  dialog: MatDialog,
  data: DeactivateEnvironmentData,
): MatDialogRef<DeactivateEnvironmentDialogComponent, boolean> {
  return dialog.open<DeactivateEnvironmentDialogComponent, DeactivateEnvironmentData, boolean>(
    DeactivateEnvironmentDialogComponent,
    {
      ariaDescribedBy: TEXT_ID,
      data,
      width: '30rem',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
