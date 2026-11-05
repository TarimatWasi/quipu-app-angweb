import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogClose, MatDialogRef } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { DialogFrameComponent } from '@shared/ui/dialog-frame/dialog-frame.component';
import type { LockCountdown } from './lock-countdown';

export interface AccountLockedDialogData {
  readonly countdown: LockCountdown;
}

/** Id the dialog is described by (`aria-describedby`): the sentence that explains the lock. */
export const ACCOUNT_LOCKED_TEXT_ID = 'account-locked-text';

/**
 * Told once, when the lock happens (SRS 17, AUTH_ACCOUNT_LOCKED). It does not repeat what the
 * banner of the login says afterwards: it is the moment the person learns why the form closed.
 * The digits that change every second are hidden from screen readers; the time of day is not.
 */
@Component({
  selector: 'app-account-locked-dialog',
  imports: [DialogFrameComponent, MatDialogClose, RouterLink],
  template: `
    <app-dialog-frame heading="Cuenta bloqueada por un rato">
      <span class="quipu-dialog-icon quipu-dialog-icon--error" dialogIcon aria-hidden="true">
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
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </span>
      <p [id]="textId">
        Hubo 5 intentos fallidos seguidos. Por seguridad, podrás volver a intentarlo en:
      </p>
      <p class="time" aria-hidden="true">{{ countdown.display() }}</p>
      <p class="until">Disponible de nuevo a las {{ countdown.clockTime() }} (hora de Lima)</p>
      <ng-container dialogActions>
        <button
          class="quipu-button quipu-button--primary"
          type="button"
          mat-dialog-close
          cdkFocusInitial
        >
          Entendido
        </button>
        <a routerLink="/forgot-password" (click)="close()">Restablecer mi contraseña</a>
      </ng-container>
    </app-dialog-frame>
  `,
  // The frame, the icon, the title and the text are P-16; here only the clock under the text.
  styles: `
    p {
      margin: 0 0 0.75rem;
    }
    .time {
      margin: 0;
      font: var(--mat-sys-headline-medium);
      font-variant-numeric: tabular-nums;
    }
    .until {
      color: var(--quipu-tinta-secundaria);
      font: var(--mat-sys-body-medium);
    }
  `,
})
export class AccountLockedDialogComponent {
  private readonly ref = inject<MatDialogRef<AccountLockedDialogComponent>>(MatDialogRef);
  protected readonly countdown = inject<AccountLockedDialogData>(MAT_DIALOG_DATA).countdown;
  protected readonly textId = ACCOUNT_LOCKED_TEXT_ID;

  protected close(): void {
    this.ref.close();
  }
}
