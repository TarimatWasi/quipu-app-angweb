import { DialogSubmission } from '@shared/forms/dialog-submission';
import { Component, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import {
  ACTIVE_CONTRACT_TEXT,
  ACTIVE_CONTRACT_TITLE,
  DEACTIVATE_TEXT,
  deactivateProblem,
  deactivateTitle,
  hasActiveContract,
} from '../model/detail-actions';
import { callFailure } from '../model/new-guest';
import { NEW_GUEST_DIALOG_STYLES } from './new-guest-dialog.styles';

export interface DeactivateGuestData {
  /** How the page names the guest: its name, or its document while it has none. */
  readonly who: string;
  /** It is already known to have a contract in force: the dialog says so without calling. */
  readonly blocked: boolean;
  /** The contract in force, to open it from the notice; null when it is not known. */
  readonly contractId: string | null;
  /** The call to the BFF; the page owns the data, the dialog only the action. */
  readonly deactivate: () => Observable<unknown>;
}

const TEXT_ID = 'deactivate-guest-text';
const ERROR_ID = 'deactivate-guest-error';

/**
 * A3.3 «Desactivar huésped» (CU-10, RN-12) on P-16. A contract in force blocks it: known before or
 * answered as 409 GUEST_HAS_ACTIVE_CONTRACT, the dialog turns into that notice. Any other failure
 * stays inside, in red. It answers true once the guest is deactivated.
 */
@Component({
  selector: 'app-deactivate-guest-dialog',
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
        @if (blocked()) {
          <button
            class="quipu-button quipu-button--tertiary"
            type="button"
            cdkFocusInitial
            (click)="close()"
          >
            Cerrar
          </button>
          @if (data.contractId; as id) {
            <a
              class="quipu-button quipu-button--primary"
              [routerLink]="['/admin/contracts', id]"
              (click)="close()"
              >Ver contrato vigente</a
            >
          }
        } @else {
          <button
            class="quipu-button quipu-button--tertiary"
            type="button"
            [disabled]="busy()"
            (click)="close()"
          >
            Cancelar
          </button>
          <button
            class="quipu-button quipu-button--primary"
            type="button"
            cdkFocusInitial
            [disabled]="busy()"
            (click)="deactivate()"
          >
            {{ busy() ? 'Desactivando…' : 'Desactivar huésped' }}
          </button>
        }
      </ng-container>
    </app-dialog-frame>
  `,
  styles: NEW_GUEST_DIALOG_STYLES,
})
export class DeactivateGuestDialogComponent {
  private readonly ref =
    inject<MatDialogRef<DeactivateGuestDialogComponent, boolean>>(MatDialogRef);
  private readonly submission = new DialogSubmission(this.ref);
  protected readonly data = inject<DeactivateGuestData>(MAT_DIALOG_DATA);

  protected readonly textId = TEXT_ID;
  protected readonly errorId = ERROR_ID;
  protected readonly blocked = signal(this.data.blocked);
  protected readonly busy = this.submission.pending;
  protected readonly error = signal<string | null>(null);
  protected readonly heading = computed(() =>
    this.blocked() ? ACTIVE_CONTRACT_TITLE : deactivateTitle(this.data.who),
  );
  protected readonly text = computed(() =>
    this.blocked() ? ACTIVE_CONTRACT_TEXT : DEACTIVATE_TEXT,
  );

  protected close(): void {
    this.ref.close();
  }

  protected async deactivate(): Promise<void> {
    return this.submission.run(async () => {
      this.error.set(null);
      try {
        await firstValueFrom(this.data.deactivate(), { defaultValue: null });
        this.finish(true);
      } catch (error: unknown) {
        this.failed(error);
      }
    });
  }

  private failed(error: unknown): void {
    if (this.submission.sessionEnded(error)) return;
    const failure = callFailure(error);
    if (hasActiveContract(failure)) {
      this.blocked.set(true);
      return;
    }
    this.error.set(deactivateProblem(failure));
  }

  private finish(result?: boolean): void {
    this.ref.close(result);
  }
}

export function openDeactivateGuestDialog(
  dialog: MatDialog,
  data: DeactivateGuestData,
): MatDialogRef<DeactivateGuestDialogComponent, boolean> {
  return dialog.open<DeactivateGuestDialogComponent, DeactivateGuestData, boolean>(
    DeactivateGuestDialogComponent,
    {
      role: 'alertdialog',
      ariaDescribedBy: TEXT_ID,
      data,
      width: 'var(--quipu-dialogo-ancho)',
      maxWidth: 'calc(100vw - 2rem)',
    },
  );
}
