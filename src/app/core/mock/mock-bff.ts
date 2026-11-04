import type { HttpParams } from '@angular/common/http';
import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { DEMO_USERS, isDemoUserKey } from './data/demo-users';
import type { DemoUser } from './data/demo-users';
import type { MockDb } from './data/mock-db';
import { seedDb } from './data/seed';
import { MOCK_ROUTES } from './handlers/mock-routes';
import { MockRegistry } from './mock-registry';
import type { ResolvedRoute } from './mock-registry';
import { concurrentModification, failure, MockFailure, raise } from './mock-reply';
import { isMockScenario, MockScenario } from './mock-scenarios';
import { readMockSetting, writeMockSetting } from './mock-storage';
import type { GuestType, MockContext, MockReply } from './mock-types';

/**
 * Unique text of the simulated BFF. It travels in a header of every simulated answer, so it is in
 * any bundle that carries the mock; the prueba de build (QP-ANGWEB-ENV-01) fails if production has it.
 */
export const MOCK_BUNDLE_MARKER = 'quipu-mock-bff-7c41e2';
export const MOCK_HEADER = 'X-Quipu-Mock';

/** How long the simulated BFF takes to answer: enough to see the skeletons, or a slow server. */
export interface MockLatency {
  readonly normalMs: number;
  /** «Servidor lento»: past the 8 s after which the screens explain the wait (P-12). */
  readonly slowMs: number;
}

export const MOCK_LATENCY = new InjectionToken<MockLatency>('MOCK_LATENCY', {
  providedIn: 'root',
  factory: () => ({ normalMs: 400, slowMs: 9_000 }),
});

export interface MockCall {
  readonly method: string;
  readonly path: string;
  readonly query: HttpParams;
  readonly body: unknown;
}

const NO_SESSION = 'No hay una sesión activa.';
const FORBIDDEN = 'No tienes permiso para esta acción.';

/**
 * The simulated BFF: routes of the contract, data in memory and a demo session. The data starts
 * again on every load of the page; the role and the scenario survive it (see mock-storage).
 */
@Injectable({ providedIn: 'root' })
export class MockBff implements MockContext {
  private readonly registry = new MockRegistry(MOCK_ROUTES);
  private readonly latency = inject(MOCK_LATENCY);
  private currentScenario: MockScenario = this.storedScenario();
  private database: MockDb = seedDb(this.currentScenario);
  // The session lives here; the storage only carries it across a reload, so a browser that blocks
  // the storage still keeps the session for as long as the page is open.
  private readonly currentUser = signal<DemoUser | null>(this.storedUser());
  private changedPassword = readMockSetting('quipu-mock:password') === 'changed';

  /** The demo user of the session, as a signal: the panel shows the role in force. */
  readonly sessionUser = this.currentUser.asReadonly();

  get db(): MockDb {
    return this.database;
  }

  scenario(): MockScenario {
    return this.currentScenario;
  }

  /** Changes the scenario and starts its data again; true when it will survive a reload. */
  setScenario(scenario: MockScenario): boolean {
    this.currentScenario = scenario;
    this.database = seedDb(scenario);
    return writeMockSetting('quipu-mock:scenario', scenario);
  }

  user(): DemoUser | null {
    return this.currentUser();
  }

  signIn(user: DemoUser): void {
    this.currentUser.set(user);
    this.changedPassword = false;
    writeMockSetting('quipu-mock:role', user.key);
    writeMockSetting('quipu-mock:password', null);
  }

  signOut(): void {
    this.currentUser.set(null);
    this.changedPassword = false;
    writeMockSetting('quipu-mock:role', null);
    writeMockSetting('quipu-mock:password', null);
  }

  markPasswordChanged(): void {
    this.changedPassword = true;
    writeMockSetting('quipu-mock:password', 'changed');
  }

  passwordChanged(): boolean {
    return this.changedPassword;
  }

  requireAdmin(): DemoUser {
    const user = this.signedIn();
    return user.session.role === 'ADMIN' ? user : raise(403, 'AUTH_FORBIDDEN', FORBIDDEN);
  }

  requireGuest(type: GuestType): DemoUser & { readonly guestId: string } {
    const user = this.signedIn();
    const { guestId, session } = user;
    if (guestId === null || session.role !== 'GUEST' || session.guestType !== type) {
      return raise(403, 'AUTH_FORBIDDEN', FORBIDDEN);
    }
    return { ...user, guestId };
  }

  latencyMs(): number {
    return this.currentScenario === 'slow' ? this.latency.slowMs : this.latency.normalMs;
  }

  /** Answers a call to /bff/*: the reply of its route, of the scenario, or a 404 if not simulated. */
  async handle(call: MockCall): Promise<MockReply> {
    const resolved = this.registry.resolve(call.method, call.path);
    if (resolved === null) {
      return failure(404, 'RESOURCE_NOT_FOUND', 'Esta ruta no está simulada en el perfil mock.');
    }
    const forced = this.scenarioReply(call, resolved);
    if (forced !== null) {
      return forced;
    }
    try {
      return await resolved.route.handler(
        {
          method: call.method,
          path: call.path,
          params: resolved.params,
          query: call.query,
          body: call.body,
        },
        this,
      );
    } catch (error: unknown) {
      if (error instanceof MockFailure) {
        return error.reply;
      }
      // A bug of the mock itself: visible in the console, answered as the BFF would.
      reportError(error);
      return failure(500, 'UNEXPECTED_ERROR', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
    }
  }

  /** «Error de carga» fails every read but the session ones; «Conflicto 409» every versioned edit. */
  private scenarioReply(call: MockCall, resolved: ResolvedRoute): MockReply | null {
    const isAuth = call.path.startsWith('/bff/auth/');
    if (this.currentScenario === 'load-error' && call.method === 'GET' && !isAuth) {
      return failure(500, 'UNEXPECTED_ERROR', 'Ocurrió un error inesperado. Inténtalo de nuevo.');
    }
    if (this.currentScenario === 'conflict' && resolved.route.versioned === true) {
      return concurrentModification();
    }
    return null;
  }

  /** The user of the session, who must have changed a temporary password first (RF-12). */
  private signedIn(): DemoUser {
    const user = this.user() ?? raise(401, 'AUTH_NO_SESSION', NO_SESSION);
    if (user.session.mustChangePassword && !this.passwordChanged()) {
      raise(403, 'AUTH_PASSWORD_CHANGE_REQUIRED', 'Debes cambiar tu contraseña para continuar');
    }
    return user;
  }

  private storedUser(): DemoUser | null {
    const key = readMockSetting('quipu-mock:role');
    return isDemoUserKey(key) ? DEMO_USERS[key] : null;
  }

  private storedScenario(): MockScenario {
    const stored = readMockSetting('quipu-mock:scenario');
    return isMockScenario(stored) ? stored : 'normal';
  }
}
