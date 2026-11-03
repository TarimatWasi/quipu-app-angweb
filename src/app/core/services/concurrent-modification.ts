import { HttpErrorResponse } from '@angular/common/http';
import type { components } from '@core/api/bff.generated';

type ConcurrentModificationError = components['schemas']['ConcurrentModificationError'];

/**
 * A 409 of the BFF that says the record changed after it was loaded (optimistic locking,
 * BE-SPR-DAT-13). Only the `code` is relied on; the server's `message` is never shown.
 */
export type ConcurrentModificationResponse = HttpErrorResponse & {
  readonly status: 409;
  readonly error: Pick<ConcurrentModificationError, 'code'>;
};

const CONCURRENT_MODIFICATION: ConcurrentModificationError['code'] = 'CONCURRENT_MODIFICATION';

/**
 * Whether a failed call is the 409 `CONCURRENT_MODIFICATION` of the PATCH of an environment, a
 * pending guest, a stay or an expense: the `version` sent is no longer the current one, nothing was
 * saved and the screen must reload the record before trying again.
 */
export function isConcurrentModification(error: unknown): error is ConcurrentModificationResponse {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) {
    return false;
  }
  const body: unknown = error.error;
  return (
    typeof body === 'object' &&
    body !== null &&
    (body as Partial<Record<'code', unknown>>).code === CONCURRENT_MODIFICATION
  );
}

/** A record loaded from the BFF with its optimistic-locking `version`. */
export interface Versioned {
  readonly version: number;
}

/**
 * The body of a PATCH: the `changes` plus the `version` of the record as it was loaded. The loaded
 * `version` always wins, so a stale one inside `changes` can never slip through. Nothing else of
 * the loaded record is copied.
 */
export function withVersion<C extends object>(
  loaded: Versioned,
  changes: C,
): Omit<C, 'version'> & { version: number } {
  return { ...changes, version: loaded.version };
}
