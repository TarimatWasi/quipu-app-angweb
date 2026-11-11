import {
  HttpContextToken,
  HttpErrorResponse,
  HttpHeaders,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
  HttpXsrfTokenExtractor,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  defaultIfEmpty,
  filter,
  finalize,
  map,
  of,
  shareReplay,
  switchMap,
  take,
  throwError,
} from 'rxjs';
import type { Observable } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';

/** The request was already sent again after a refresh: another 401 ends the session. */
const RETRIED = new HttpContextToken<boolean>(() => false);

/** The calls that answer their own 401, or that are the refresh itself, never renew the session. */
const OWN_AUTH = ['/auth/login', '/auth/csrf', '/auth/refresh', '/auth/logout'];

/**
 * The refresh of the session in course (TAR-228, TAR-360): every 401 that arrives while it is on
 * its way waits for the same one, so the rotated refresh token is asked for once.
 */
@Injectable({ providedIn: 'root' })
export class SessionRefresh {
  private inFlight: Observable<boolean> | null = null;

  /** True when `send` renewed the session; false when it could not (the session is over). */
  renew(send: () => Observable<unknown>): Observable<boolean> {
    this.inFlight ??= send().pipe(
      // The chain also emits «sent»: only the answer says the session was renewed.
      filter((event) => event instanceof HttpResponse),
      take(1),
      map(() => true),
      defaultIfEmpty(false),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 401
          ? of(false)
          : throwError(() => error),
      ),
      finalize(() => {
        this.inFlight = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inFlight;
  }
}

/**
 * The access token lives 15 minutes and the refresh token renews it (contract v0.25.0, TAR-228). A
 * 401 from the BFF asks for one refresh (shared with every 401 in flight) and sends the request
 * again once; if the refresh fails, or the request answers 401 again, the 401 goes on and
 * `sessionExpiredInterceptor`, which wraps this one, ends the session as before. /me goes through
 * it too, so reloading the page after 15 minutes renews the session instead of asking to log in.
 * The refresh is sent from inside the chain, past the XSRF interceptor of Angular and
 * `credentialsInterceptor`: it carries the CSRF pair and the credentials itself.
 */
export const sessionRefreshInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(BFF_BASE_URL);
  const bff = `${base}/bff`.toLowerCase();
  const url = req.url.toLowerCase();
  const toBff = url === bff || url.startsWith(`${bff}/`) || url.startsWith(`${bff}?`);
  const own = OWN_AUTH.some((path) => url === `${bff}${path}`);
  if (!toBff || own || req.context.get(RETRIED)) return next(req);

  const refresh = inject(SessionRefresh);
  const xsrf = inject(HttpXsrfTokenExtractor);
  const refreshRequest = (): HttpRequest<null> => {
    const token = xsrf.getToken();
    return new HttpRequest<null>('POST', `${base}/bff/auth/refresh`, null, {
      headers: token === null ? new HttpHeaders() : new HttpHeaders({ 'X-XSRF-TOKEN': token }),
      withCredentials: base !== '',
    });
  };

  return next(req).pipe(
    catchError((error: unknown) => {
      if (!(error instanceof HttpErrorResponse && error.status === 401)) {
        return throwError(() => error);
      }
      return refresh
        .renew(() => next(refreshRequest()))
        .pipe(
          switchMap((renewed) =>
            renewed
              ? next(req.clone({ context: req.context.set(RETRIED, true) }))
              : throwError(() => error),
          ),
        );
    }),
  );
};
