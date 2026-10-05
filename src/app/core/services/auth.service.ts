import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import {
  catchError,
  firstValueFrom,
  map,
  Observable,
  of,
  tap,
  throwError,
  timeout,
  TimeoutError,
} from 'rxjs';
import type { components, operations } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';

type LoginOperation = operations['login'];
type LoginResponse = LoginOperation['responses'][200]['content']['application/json'];

// The API types come from the shared contract (TAR-23): nothing here is declared by hand.
export type DocumentType = components['schemas']['DocumentType'];
export type Role = LoginResponse['role'];
export type LoginRequest = Readonly<LoginOperation['requestBody']['content']['application/json']>;

/** What the BFF answers to a login. The session token itself travels in an HttpOnly cookie. */
export type Session = Readonly<Pick<LoginResponse, 'role' | 'name' | 'mustChangePassword'>>;

/**
 * How long a login may take. The free Render plan can need 60 to 90 seconds to wake the backend,
 * so the call waits 90 s and the screen explains the wait after 8 s. Tests provide shorter values.
 */
export interface LoginTiming {
  readonly slowHintAfterMs: number;
  readonly timeoutMs: number;
}

export const LOGIN_TIMING = new InjectionToken<LoginTiming>('LOGIN_TIMING', {
  providedIn: 'root',
  factory: () => ({ slowHintAfterMs: 8_000, timeoutMs: 90_000 }),
});

// One entry per role of the contract: a role added to the contract fails to compile here.
const ROLES: Readonly<Record<Role, true>> = { ADMIN: true, GUEST: true };

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && Object.hasOwn(ROLES, value);
}

/** Not a definite answer of the BFF: it could not be reached in time, or failed (not a 401). */
function isUnreachable(error: unknown): boolean {
  return (
    error instanceof TimeoutError || (error instanceof HttpErrorResponse && error.status !== 401)
  );
}

/** Checks a session answer (login or /me) at the boundary: anything unexpected is an error, never a session. */
function toSession(body: unknown): Session {
  if (typeof body === 'object' && body !== null) {
    const { role, name, mustChangePassword } = body as Record<string, unknown>;
    if (isRole(role) && typeof name === 'string' && typeof mustChangePassword === 'boolean') {
      return { role, name, mustChangePassword };
    }
  }
  throw new Error('Unexpected login response');
}

/**
 * Client-side view of the BFF session. The token is never readable from JavaScript
 * (FE-ANG-HTTP-02), so after a page reload the session is restored by asking the BFF who it is
 * (GET /bff/auth/me, TAR-74); the guards wait for that answer before deciding.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly bffBaseUrl = inject(BFF_BASE_URL);
  private readonly timing = inject(LOGIN_TIMING);
  private readonly current = signal<Session | null>(null);
  private restoration: Promise<void> | null = null;
  // Moves with every change of the session made here, so a late /me answer cannot overwrite it.
  private epoch = 0;

  readonly session = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  login(request: LoginRequest): Observable<Session> {
    return this.http.post<unknown>(`${this.bffBaseUrl}/bff/auth/login`, request).pipe(
      timeout({ first: this.timing.timeoutMs }),
      map(toSession),
      tap((session) => {
        this.epoch++;
        this.current.set(session);
        this.restoration ??= Promise.resolve();
      }),
    );
  }

  /**
   * TAR-74. Asks the BFF who the session of this browser is (the cookie is HttpOnly). A 401 or an
   * answer that is not a session means there is none to restore (null); a failure to reach the BFF
   * (timeout, network, 5xx) is an error, so that the caller can try again later. A late answer never
   * overwrites a session that was opened or closed in this tab while it was on its way.
   */
  restore(): Observable<Session | null> {
    const epoch = this.epoch;
    return this.http.get<unknown>(`${this.bffBaseUrl}/bff/auth/me`).pipe(
      timeout({ first: this.timing.timeoutMs }),
      map(toSession),
      tap((session) => {
        if (this.epoch === epoch) {
          this.current.set(session);
        }
      }),
      map(() => this.current()),
      catchError((error: unknown) =>
        isUnreachable(error) ? throwError(() => error) : of(this.current()),
      ),
    );
  }

  /**
   * Resolves once the session of a page reload has been restored. The first caller asks the BFF;
   * the others share its answer. Nothing is asked after a login or a logout in this tab, nor after
   * a definite answer; if the BFF could not be reached the next caller asks again.
   */
  restored(): Promise<void> {
    this.restoration ??= firstValueFrom(this.restore()).then(
      () => undefined,
      () => {
        this.restoration = this.current() ? Promise.resolve() : null;
      },
    );
    return this.restoration;
  }

  /**
   * RF-12. On success the BFF has already replaced the session cookie with one that no longer
   * forces the change, so only the client's view of the session needs to be updated.
   */
  changePassword(newPassword: string): Observable<null> {
    return this.http
      .post<null>(`${this.bffBaseUrl}/bff/auth/change-password`, { newPassword })
      .pipe(
        timeout({ first: this.timing.timeoutMs }),
        tap(() => {
          this.epoch++;
          this.current.update((session) => session && { ...session, mustChangePassword: false });
        }),
      );
  }

  /** RF-16. The answer is the same for any email; no session is involved. */
  requestPasswordReset(email: string): Observable<null> {
    return this.http
      .post<null>(`${this.bffBaseUrl}/bff/auth/forgot-password`, { email })
      .pipe(timeout({ first: this.timing.timeoutMs }));
  }

  /** RF-16. The person signs in afterwards: a reset does not start a session. */
  resetPassword(code: string, newPassword: string): Observable<null> {
    return this.http
      .post<null>(`${this.bffBaseUrl}/bff/auth/reset-password`, { code, newPassword })
      .pipe(timeout({ first: this.timing.timeoutMs }));
  }

  /**
   * TAR-74. The BFF expires the cookie (the JWT itself cannot be revoked). The session is forgotten
   * here whatever the answer: if the BFF was unreachable the cookie simply lives until it expires.
   */
  logout(): Observable<null> {
    return this.http.post<null>(`${this.bffBaseUrl}/bff/auth/logout`, null).pipe(
      timeout({ first: this.timing.timeoutMs }),
      catchError(() => of(null)),
      tap(() => {
        this.clear();
      }),
    );
  }

  /** Forgets the session in this tab only; {@link logout} also expires the cookie. */
  clear(): void {
    this.epoch++;
    this.current.set(null);
    this.restoration ??= Promise.resolve();
  }
}
