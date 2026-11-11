import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
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
import { isCsrfFailure } from '@core/http/csrf-failure';

type LoginOperation = operations['login'];
type LoginResponse = LoginOperation['responses'][200]['content']['application/json'];
type ActivateRequest = operations['activateAccess']['requestBody']['content']['application/json'];
type ChangePasswordRequest =
  operations['changePassword']['requestBody']['content']['application/json'];

// The API types come from the shared contract (TAR-23): nothing here is declared by hand.
export type DocumentType = components['schemas']['DocumentType'];
export type Role = LoginResponse['role'];
export type LoginRequest = Readonly<LoginOperation['requestBody']['content']['application/json']>;

/** A guest with a contract or a temporary one (RN-13); the administrator has none. */
export type GuestType = components['schemas']['GuestActiveSession']['guestType'];

/** Where a guest is in its life with the app: still registering, or active (RN-36). */
export type SessionGuestStatus = 'ONBOARDING' | 'ACTIVE';

/** The step of the registration a guest in onboarding goes to next, in the order of RN-33. */
export type OnboardingStepName = 'PASSWORD' | 'PERSONAL_DATA' | 'DOCUMENTS' | 'CONSENT';

/**
 * What the BFF answers to a login. The session token itself travels in an HttpOnly cookie.
 * `guestType` comes only with a guest session (SessionInfo); it decides which guest pages open.
 */
export type Session = Readonly<
  Pick<LoginResponse, 'role' | 'name' | 'mustChangePassword'> & {
    guestType?: GuestType;
    /** Only a guest session has it (TAR-141): it decides whether the guest is still registering. */
    guestStatus?: SessionGuestStatus;
    /** Only while `guestStatus` is ONBOARDING: the step the guest must do next. */
    nextOnboardingStep?: OnboardingStepName;
  }
>;

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

// One entry per guest type of the contract, as for the roles.
const GUEST_TYPES: Readonly<Record<GuestType, true>> = { CONTRACT: true, TEMPORARY: true };

function isGuestType(value: unknown): value is GuestType {
  return typeof value === 'string' && Object.hasOwn(GUEST_TYPES, value);
}

// The same for the status and the steps of the onboarding.
const GUEST_STATUSES: Readonly<Record<SessionGuestStatus, true>> = {
  ONBOARDING: true,
  ACTIVE: true,
};
const ONBOARDING_STEPS: Readonly<Record<OnboardingStepName, true>> = {
  PASSWORD: true,
  PERSONAL_DATA: true,
  DOCUMENTS: true,
  CONSENT: true,
};

function isGuestStatus(value: unknown): value is SessionGuestStatus {
  return typeof value === 'string' && Object.hasOwn(GUEST_STATUSES, value);
}

function isOnboardingStep(value: unknown): value is OnboardingStepName {
  return typeof value === 'string' && Object.hasOwn(ONBOARDING_STEPS, value);
}

// Leaving is best-effort: unlike the login it must not make the user wait for a sleeping backend.
const LOGOUT_TIMEOUT_MS = 10_000;

/** Not a definite answer of the BFF: it could not be reached in time, or failed (not a 401). */
function isUnreachable(error: unknown): boolean {
  return (
    error instanceof TimeoutError || (error instanceof HttpErrorResponse && error.status !== 401)
  );
}

/** Checks a session answer (login or /me) at the boundary: anything unexpected is an error, never a session. */
function toSession(body: unknown): Session {
  if (typeof body === 'object' && body !== null) {
    const { role, name, mustChangePassword, guestType, guestStatus, nextOnboardingStep } =
      body as Record<string, unknown>;
    if (isRole(role) && typeof name === 'string' && typeof mustChangePassword === 'boolean') {
      if (role !== 'GUEST') return { role, name, mustChangePassword };
      // A guest without a known type keeps its session but opens no guest page.
      return {
        role,
        name,
        mustChangePassword,
        ...(isGuestType(guestType) && { guestType }),
        ...(isGuestStatus(guestStatus) && { guestStatus }),
        // Only a guest that is still registering has a next step.
        ...(guestStatus === 'ONBOARDING' &&
          isOnboardingStep(nextOnboardingStep) && { nextOnboardingStep }),
      };
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
  private readonly csrf = inject(CsrfBootstrapService);
  private readonly bffBaseUrl = inject(BFF_BASE_URL);
  private readonly timing = inject(LOGIN_TIMING);
  private readonly current = signal<Session | null>(null);
  private restoration: Promise<void> | null = null;
  // Moves with every change of the session made here, so a late /me answer cannot overwrite it.
  private epoch = 0;

  readonly session = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  login(request: LoginRequest): Observable<Session> {
    return this.startSession(`${this.bffBaseUrl}/bff/auth/login`, request);
  }

  /**
   * A0.4 (CU-24, RN-32): the guest chooses a password with the single-use token of the link the
   * administrator handed over. Unlike a reset, the BFF starts the session right away.
   */
  activate(token: string, newPassword: string): Observable<Session> {
    const body: ActivateRequest = { token, newPassword };
    return this.startSession(`${this.bffBaseUrl}/bff/auth/activate`, body);
  }

  /** A call whose answer is a new session (login, activation): it replaces the one of this tab. */
  private startSession(url: string, body: unknown): Observable<Session> {
    return this.csrf
      .protect(() => this.http.post<unknown>(url, body))
      .pipe(
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

  /** Rechecks an already restored session without hiding a definitive 401 from stream recovery. */
  verifySession(): Observable<Session | null> {
    const epoch = this.epoch;
    return this.http.get<unknown>(`${this.bffBaseUrl}/bff/auth/me`).pipe(
      timeout({ first: this.timing.timeoutMs }),
      map(toSession),
      tap((session) => {
        if (this.epoch === epoch) this.current.set(session);
      }),
      map(() => this.current()),
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
   * RF-12 (A0.1) and A0.6. The forced change of the first login sends only the new password; the
   * change from the account menu also sends the current one. On success the BFF has already
   * replaced the session cookie with one that no longer forces the change, so only the client's
   * view of the session needs to be updated.
   */
  changePassword(newPassword: string, currentPassword?: string): Observable<null> {
    const body: ChangePasswordRequest =
      currentPassword === undefined ? { newPassword } : { currentPassword, newPassword };
    return this.csrf
      .protect(() => this.http.post<null>(`${this.bffBaseUrl}/bff/auth/change-password`, body))
      .pipe(
        timeout({ first: this.timing.timeoutMs }),
        tap(() => {
          this.epoch++;
          this.current.update(
            (session) =>
              session && {
                ...session,
                mustChangePassword: false,
                // The password was the first step of the registration (RN-33).
                ...(session.nextOnboardingStep === 'PASSWORD' && {
                  nextOnboardingStep: 'PERSONAL_DATA' as const,
                }),
              },
          );
        }),
      );
  }

  /**
   * TAR-141. A step of the registration was done (or the BFF said where it stands): the session
   * follows, so the guard that keeps the guest in its registration lets it into the next step. `next`
   * null is a closed registration (RN-36); `name` is the one the guest just saved.
   */
  onboardingAdvanced(next: Exclude<OnboardingStepName, 'PASSWORD'> | null, name?: string): void {
    this.epoch++;
    this.current.update((session) => {
      if (session?.role !== 'GUEST') return session;
      return {
        role: session.role,
        name: name ?? session.name,
        mustChangePassword: session.mustChangePassword,
        ...(session.guestType !== undefined && { guestType: session.guestType }),
        guestStatus: next === null ? 'ACTIVE' : 'ONBOARDING',
        ...(next !== null && { nextOnboardingStep: next }),
      };
    });
  }

  /** RF-16. The answer is the same for any email; no session is involved. */
  requestPasswordReset(email: string): Observable<null> {
    return this.csrf
      .protect(() => this.http.post<null>(`${this.bffBaseUrl}/bff/auth/forgot-password`, { email }))
      .pipe(timeout({ first: this.timing.timeoutMs }));
  }

  /**
   * RF-16. The person signs in afterwards: a reset does not start a session. `name` is only for an
   * administrator that activates the account another one created (A0.5, RF-22); the recovery of any
   * other account leaves it out.
   */
  resetPassword(code: string, newPassword: string, name?: string): Observable<null> {
    const body = name === undefined ? { code, newPassword } : { code, newPassword, name };
    return this.csrf
      .protect(() => this.http.post<null>(`${this.bffBaseUrl}/bff/auth/reset-password`, body))
      .pipe(timeout({ first: this.timing.timeoutMs }));
  }

  /**
   * TAR-74. The BFF expires the cookie (the JWT itself cannot be revoked). The session is forgotten
   * here whatever the answer: if the BFF was unreachable the cookie simply lives until it expires.
   */
  logout(): Observable<null> {
    return this.csrf
      .protect(() => this.http.post<null>(`${this.bffBaseUrl}/bff/auth/logout`, null))
      .pipe(
        timeout({ first: LOGOUT_TIMEOUT_MS }),
        catchError((error: unknown) => (isCsrfFailure(error) ? throwError(() => error) : of(null))),
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
