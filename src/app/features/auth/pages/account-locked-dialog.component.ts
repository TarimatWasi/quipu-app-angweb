import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
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
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatDialogClose,
    MatButton,
    RouterLink,
  ],
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
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </svg>
    </div>
    <h2 mat-dialog-title>Cuenta bloqueada por un rato</h2>
    <mat-dialog-content>
      <p [id]="textId">
        Hubo 5 intentos fallidos seguidos. Por seguridad, podrás volver a intentarlo en:
      </p>
      <div class="remaining">
        <p class="time" aria-hidden="true">{{ countdown.display() }}</p>
        <p class="until">Disponible de nuevo a las {{ countdown.clockTime() }} (hora de Lima)</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-flat-button type="button" mat-dialog-close cdkFocusInitial>Entendido</button>
      <a routerLink="/forgot-password" (click)="close()">Restablecer mi contraseña</a>
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
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-error);
    }
    h2 {
      font-family: var(--mat-sys-display-small-font, 'Fraunces', Georgia, serif);
      font-weight: 600;
    }
    p {
      margin: 0 0 1rem;
    }
    .remaining {
      display: grid;
      gap: 0.5rem;
      padding: 1rem 1.25rem;
      border-radius: 12px;
      background: var(--quipu-crema);
    }
    .remaining p {
      margin: 0;
    }
    .time {
      font-size: 3.25rem;
      font-weight: 700;
      line-height: 1;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.02em;
    }
    .until {
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    mat-dialog-actions {
      gap: 1rem;
      padding: 0.5rem 1.5rem 1.5rem;
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
