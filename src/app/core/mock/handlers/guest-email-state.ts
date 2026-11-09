import type { GuestRecord } from '../data/mock-db';

/** Wrong codes a verification takes before it stops working (TAR-349). */
export const MAX_CODE_ATTEMPTS = 5;

/** The new email waiting for its code while it can still be confirmed (TAR-349). */
export function pendingEmailOf(guest: GuestRecord, now = Date.now()): string | undefined {
  const pending = guest.emailVerification;
  return pending !== undefined && pending.expiresAt > now && pending.attempts < MAX_CODE_ATTEMPTS
    ? pending.email
    : undefined;
}
