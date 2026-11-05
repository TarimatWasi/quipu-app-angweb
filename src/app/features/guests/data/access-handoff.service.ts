import { Injectable } from '@angular/core';
import type { AccessGrant, DocumentType } from '@core/api/clients/admin-guests.service';
import type { GuestType } from '../model/new-guest';

/**
 * An access just generated and who it is for, as A3.7 shows it. The secret is shown once (RN-32):
 * it only lives here, in memory, from the screen that generated it until A3.7 takes it.
 */
export interface AccessHandoff {
  readonly guestId: string;
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly type: GuestType;
  /** The phone the administrator typed, for WhatsApp; null without one. */
  readonly phone: string | null;
  /** The email the access was also sent to; null without one. */
  readonly contactEmail: string | null;
  readonly access: AccessGrant;
  /** true when it replaces a previous access («Acceso nuevo generado»), from the guest's page. */
  readonly regenerated: boolean;
}

/**
 * Hands an access from the screen that generated it to A3.7 (FE-ANG-SEC-02). It never goes to the
 * address, the history state, localStorage, sessionStorage or a log: it is a plain field of a
 * singleton, and reading it empties it, so a reload or a second visit of A3.7 finds nothing.
 */
@Injectable({ providedIn: 'root' })
export class AccessHandoffService {
  private held: AccessHandoff | null = null;

  /** Keeps the access for A3.7, replacing any other one not taken yet. */
  put(handoff: AccessHandoff): void {
    this.held = handoff;
  }

  /** The access of `guestId`, once: whatever was held is forgotten, for this guest or not. */
  take(guestId: string): AccessHandoff | null {
    const handoff = this.held;
    this.held = null;
    return handoff?.guestId === guestId ? handoff : null;
  }
}
