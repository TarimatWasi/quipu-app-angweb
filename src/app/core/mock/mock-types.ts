import type { HttpParams } from '@angular/common/http';
import type { components, paths } from '@core/api/bff.generated';
import type { MockDb } from './data/mock-db';
import type { DemoUser } from './data/demo-users';

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

/**
 * `METHOD /bff/<path of the contract>`, only for the operations the contract declares: a path or a
 * method removed from the contract makes the route that uses it fail to compile.
 */
export type MockRouteKey = {
  [P in keyof paths]: {
    [M in Method]: [NonNullable<paths[P][M]>] extends [never] ? never : `${Uppercase<M>} /bff${P}`;
  }[Method];
}[keyof paths];

/** What a handler answers: the status and the JSON body (null for 202 and 204). */
export interface MockReply {
  readonly status: number;
  readonly body: unknown;
}

/** A request already matched to a route: `params` are the `{name}` segments, decoded. */
export interface MockRequest {
  readonly method: string;
  readonly path: string;
  readonly params: Readonly<Record<string, string>>;
  readonly query: HttpParams;
  readonly body: unknown;
}

export type GuestType = components['schemas']['GuestActiveSession']['guestType'];

/** What a handler may use besides the request: the data in memory and the simulated session. */
export interface MockContext {
  readonly db: MockDb;
  /** The demo user of the session, or null without one. */
  user(): DemoUser | null;
  signIn(user: DemoUser): void;
  signOut(): void;
  /**
   * POST /auth/refresh (TAR-228, TAR-364): renews an expired access token while the refresh token
   * lives. False when there is no session to renew; the session is then closed.
   */
  renewSession(): boolean;
  markPasswordChanged(): void;
  passwordChanged(): boolean;
  /** The administrator of the session; otherwise it throws the 401 or 403 of the contract. */
  requireAdmin(): DemoUser;
  /** The guest of the session with its id, of the given type; otherwise the 401 or 403. */
  requireGuest(type: GuestType): DemoUser & { readonly guestId: string };
}

export type MockHandler = (req: MockRequest, ctx: MockContext) => MockReply | Promise<MockReply>;

export interface MockRoute {
  readonly key: MockRouteKey;
  readonly handler: MockHandler;
  /** The operation sends a `version` (or the contract answers 409 CONCURRENT_MODIFICATION). */
  readonly versioned?: true;
}
