import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import { map, Observable, tap, timeout } from 'rxjs';
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

/** Checks the login response at the boundary: anything unexpected is an error, never a session. */
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
 * (FE-ANG-HTTP-02), so after a page reload there is nothing to restore it from: the BFF has no
 * "who am I" endpoint yet, and the guard sends the user back to the login.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly bffBaseUrl = inject(BFF_BASE_URL);
  private readonly timing = inject(LOGIN_TIMING);
  private readonly current = signal<Session | null>(null);

  readonly session = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  login(request: LoginRequest): Observable<Session> {
    return this.http.post<unknown>(`${this.bffBaseUrl}/bff/auth/login`, request).pipe(
      timeout({ first: this.timing.timeoutMs }),
      map(toSession),
      tap((session) => {
        this.current.set(session);
      }),
    );
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

  /** Forgets the session in this tab. The BFF has no logout yet: the cookie lives until it expires. */
  clear(): void {
    this.current.set(null);
  }
}
