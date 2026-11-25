import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, timer } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';

/** The code of the global 503 of contract v0.29.0: the database did not serve the call in time. */
export const SERVICE_BUSY = 'SERVICE_BUSY';

/** Wait when `Retry-After` is missing or unusable (the BFF sends 5 s today). */
export const SERVICE_BUSY_DEFAULT_WAIT_S = 5;
/** Longest wait before the one automatic retry; a longer `Retry-After` goes straight to the page. */
export const SERVICE_BUSY_MAX_WAIT_S = 10;

const READS = new Set(['GET', 'HEAD']);

export function isServiceBusy(error: unknown): error is HttpErrorResponse {
  if (!(error instanceof HttpErrorResponse) || error.status !== 503) return false;
  const body: unknown = error.error;
  return typeof body === 'object' && body !== null && 'code' in body && body.code === SERVICE_BUSY;
}

/** The seconds of `Retry-After` (a whole number, at least one), or the default wait. */
export function serviceBusyWait(error: HttpErrorResponse): number {
  const header = error.headers.get('Retry-After');
  return header !== null && /^[1-9]\d*$/.test(header)
    ? Number(header)
    : SERVICE_BUSY_DEFAULT_WAIT_S;
}

/**
 * 503 SERVICE_BUSY (contract v0.29.0): nothing was saved, so retrying is safe. A read of the BFF
 * waits `Retry-After` and is sent once more, without the page noticing; if it is still busy (or the
 * wait is too long) the error reaches the page, which says «El servicio está ocupado…» with its
 * «Reintentar». A write is never resent in silence: the person sees the text and decides, so an
 * action never hangs for seconds without a word. A 503 is not about the session: it neither renews
 * nor ends it (the 401 interceptors only look at 401). FILE_STORAGE_UNAVAILABLE, the other 503, is
 * left alone.
 */
export const serviceBusyInterceptor: HttpInterceptorFn = (req, next) => {
  const bff = `${inject(BFF_BASE_URL)}/bff`.toLowerCase();
  const url = req.url.toLowerCase();
  const toBff = url === bff || url.startsWith(`${bff}/`) || url.startsWith(`${bff}?`);
  if (!toBff || !READS.has(req.method)) return next(req);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (!isServiceBusy(error)) return throwError(() => error);
      const wait = serviceBusyWait(error);
      if (wait > SERVICE_BUSY_MAX_WAIT_S) return throwError(() => error);
      return timer(wait * 1000).pipe(switchMap(() => next(req)));
    }),
  );
};
