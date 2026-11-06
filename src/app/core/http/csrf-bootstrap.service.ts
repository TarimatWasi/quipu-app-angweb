import { HttpClient, HttpXsrfTokenExtractor } from '@angular/common/http';
import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import {
  catchError,
  defer,
  finalize,
  map,
  Observable,
  of,
  shareReplay,
  switchMap,
  throwError,
  timeout,
} from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { CSRF_INVALID_TEXT, CSRF_PREPARATION_TEXT } from './csrf-failure';

export const CSRF_TIMEOUT_MS = new InjectionToken<number>('CSRF_TIMEOUT_MS', {
  providedIn: 'root',
  factory: () => 90_000,
});

/** Coordinates readiness only. Angular's native interceptor owns cookie extraction and headers. */
@Injectable({ providedIn: 'root' })
export class CsrfBootstrapService {
  private readonly http = inject(HttpClient);
  private readonly extractor = inject(HttpXsrfTokenExtractor);
  private readonly base = inject(BFF_BASE_URL);
  private readonly timeoutMs = inject(CSRF_TIMEOUT_MS);
  private flight: Observable<void> | null = null;
  private invalidated = false;
  private epoch = 0;
  private readonly failure = signal<string | null>(null);
  private readonly preparing = signal(false);

  readonly error = this.failure.asReadonly();
  readonly pending = this.preparing.asReadonly();

  ensureReady(): Observable<void> {
    return defer(() => {
      this.requireSameOrigin();
      if (this.flight) return this.flight;
      // Check the actual cookie on every action: logout, another tab or browser cleanup may change it.
      return !this.invalidated && this.extractor.getToken() ? of(undefined) : this.refresh();
    });
  }

  refresh(): Observable<void> {
    if (this.flight) return this.flight;
    const epoch = this.epoch;
    const request: Observable<void> = defer(() => {
      this.requireSameOrigin();
      this.preparing.set(true);
      return this.http.get<null>('/bff/auth/csrf', { cache: 'no-store' });
    }).pipe(
      timeout({ first: this.timeoutMs }),
      map(() => {
        if (!this.extractor.getToken() || this.epoch !== epoch) {
          throw new Error('CSRF preparation did not produce a usable cookie');
        }
        this.invalidated = false;
        this.failure.set(null);
      }),
      catchError((error: unknown) => {
        this.invalidated = true;
        this.failure.set(CSRF_PREPARATION_TEXT);
        return throwError(() => error);
      }),
      finalize(() => {
        if (this.flight === request) this.flight = null;
        this.preparing.set(false);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.flight = request;
    return request;
  }

  /** Call before creating the HTTP mutation, so the native XSRF interceptor sees the new cookie. */
  protect<T>(mutation: () => Observable<T>): Observable<T> {
    return this.ensureReady().pipe(switchMap(() => defer(mutation)));
  }

  invalidate(): void {
    this.epoch++;
    this.invalidated = true;
    this.failure.set(CSRF_INVALID_TEXT);
  }

  private requireSameOrigin(): void {
    if (this.base !== '') {
      throw new Error(
        'CSRF requires same-origin /bff URLs. Remove NG_APP_BFF_BASE_URL and use the local/dev proxy.',
      );
    }
  }
}
