import { Component, DestroyRef, inject, input, linkedSignal, output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { openEmailChangeDialog } from './email-change-dialog.component';
import {
  ADD_EMAIL_LABEL,
  CHANGE_EMAIL_LABEL,
  EMAIL_FIELD_HELP,
  EMAIL_LABEL,
  ENTER_CODE_LABEL,
  NO_EMAIL_TEXT,
  pendingText,
} from './email-verification';
import type { EmailVerificationClient } from './email-verification';

/**
 * The email of the guest in its own data (O1, H5, T3; TAR-349): not a free field but the address
 * it has, with «Cambiar correo», which verifies the new one with a code before changing it. When a
 * code is pending (`pendingEmail`) it says so and offers to write it. The page keeps the data:
 * `changed` gives the new email once it changed.
 */
@Component({
  selector: 'app-email-change-field',
  template: `
    <div class="quipu-field">
      <p class="quipu-label">{{ label }}</p>
      <p class="value">{{ current() ?? noEmail }}</p>
      @if (waiting(); as address) {
        <div class="quipu-notice quipu-notice--info pending">
          <p>{{ pendingText(address) }}</p>
          <button class="quipu-button quipu-button--tertiary" type="button" (click)="open()">
            {{ enterCode }}
          </button>
        </div>
      }
      <p class="quipu-field-help">{{ help }}</p>
      <div>
        <button class="quipu-button quipu-button--secondary" type="button" (click)="open(true)">
          {{ current() === null ? addLabel : changeLabel }}
        </button>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    p {
      margin: 0;
    }
    .value {
      overflow-wrap: anywhere;
    }
    .pending {
      display: grid;
      justify-items: start;
      gap: 0.5rem;
    }
  `,
})
export class EmailChangeFieldComponent {
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  readonly current = input.required<string | null>();
  readonly pending = input<string | null>(null);
  readonly client = input.required<EmailVerificationClient>();
  readonly changed = output<string>();
  /**
   * The address waiting for its code: what the page read, until a code goes out from here (the
   * server keeps it pending even if the dialog closes) or the email changes.
   */
  protected readonly waiting = linkedSignal(() => this.pending());

  protected readonly label = EMAIL_LABEL;
  protected readonly noEmail = NO_EMAIL_TEXT;
  protected readonly help = EMAIL_FIELD_HELP;
  protected readonly enterCode = ENTER_CODE_LABEL;
  protected readonly addLabel = ADD_EMAIL_LABEL;
  protected readonly changeLabel = CHANGE_EMAIL_LABEL;
  protected readonly pendingText = pendingText;

  /** Opens on the code when one is pending, unless the guest asked to change the address. */
  protected open(fresh = false): void {
    const ref = openEmailChangeDialog(this.dialog, {
      current: this.current(),
      pending: fresh ? null : this.waiting(),
      client: this.client(),
      codeSent: (email) => {
        this.waiting.set(email);
      },
    });
    const subscription = ref.afterClosed().subscribe((email) => {
      if (email === undefined) return;
      this.waiting.set(null);
      this.changed.emit(email);
    });
    this.destroyRef.onDestroy(() => {
      subscription.unsubscribe();
    });
  }
}
