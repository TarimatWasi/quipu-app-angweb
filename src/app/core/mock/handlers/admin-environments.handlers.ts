import type { components } from '@core/api/bff.generated';
import { environmentView, isOccupied } from '../data/account-views';
import { nowInstant, today } from '../data/mock-dates';
import { ID_KIND } from '../data/mock-db';
import type { MockDb } from '../data/mock-db';
import {
  invalid,
  MockFailure,
  noContent,
  notFound,
  ok,
  raise,
  raiseConcurrentModification,
} from '../mock-reply';
import type { MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];
type Environment = Schemas['Environment'];

/** Letters, digits, space and . _ / - (decided 2026-10-31, TAR-237); surrounding spaces ignored. */
const CODE = /^[A-Za-z0-9 ._/-]{1,50}$/;

function bodyOf(req: MockRequest): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {};
}

function environmentOf(db: MockDb, req: MockRequest): Environment {
  return db.environment(req.params['id'] ?? '') ?? notFound();
}

function codeOf(raw: unknown): string {
  const code = typeof raw === 'string' ? raw.trim() : '';
  return CODE.test(code) ? code : invalid('code');
}

function typeOf(raw: unknown): Environment['type'] {
  return raw === 'ROOM' || raw === 'CABIN' ? raw : invalid('type');
}

/** The code is unique among all the environments, active or not (RF-01). */
function checkCodeFree(db: MockDb, code: string, ignoreId?: string): void {
  const taken = db.data.environments.some(
    (environment) =>
      environment.id !== ignoreId && environment.code.toLowerCase() === code.toLowerCase(),
  );
  if (taken) {
    raise(409, 'ENVIRONMENT_CODE_TAKEN', 'Ya existe un ambiente con ese código', 'code');
  }
}

function create(db: MockDb, body: Record<string, unknown>): Environment {
  const code = codeOf(body['code']);
  const type = typeOf(body['type']);
  checkCodeFree(db, code);
  const environment: Environment = {
    id: db.newId(ID_KIND.environment),
    code,
    type,
    status: 'ACTIVE',
    occupant: null,
    nextOccupant: null,
    freeSince: today(),
    deactivatedAt: null,
    version: 1,
  };
  db.data.environments.push(environment);
  return environment;
}

function update(db: MockDb, environment: Environment, body: Record<string, unknown>): void {
  const version = body['version'];
  if (typeof version !== 'number') invalid('version');
  if (version !== environment.version) raiseConcurrentModification();
  const code = body['code'] === undefined ? environment.code : codeOf(body['code']);
  const type = body['type'] === undefined ? environment.type : typeOf(body['type']);
  checkCodeFree(db, code, environment.id);
  Object.assign(environment, { code, type, version: environment.version + 1 });
}

/** An environment with a contract in force or a stay, now or later, is not deactivated (RN-12). */
function deactivate(db: MockDb, environment: Environment): void {
  if (environment.status === 'INACTIVE') return;
  if (isOccupied(db, environment.id, { from: today(), to: '9999-12-31' })) {
    const view = environmentView(db, environment);
    throw new MockFailure({
      status: 409,
      body: {
        code: 'ENVIRONMENT_OCCUPIED',
        message: 'El ambiente está ocupado: no se puede desactivar.',
        occupant: view.occupant ?? view.nextOccupant ?? undefined,
      },
    });
  }
  Object.assign(environment, {
    status: 'INACTIVE',
    deactivatedAt: nowInstant(),
    version: environment.version + 1,
  });
}

function reactivate(environment: Environment): void {
  if (environment.status === 'ACTIVE') return;
  Object.assign(environment, {
    status: 'ACTIVE',
    deactivatedAt: null,
    freeSince: today(),
    version: environment.version + 1,
  });
}

/** The environments of the administrator (A2, A2.1 to A2.4); the list is with the guests. */
export const ADMIN_ENVIRONMENT_ROUTES: readonly MockRoute[] = [
  {
    key: 'POST /bff/admin/environments',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(environmentView(ctx.db, create(ctx.db, bodyOf(req))), 201);
    },
  },
  {
    key: 'GET /bff/admin/environments/{id}',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(environmentView(ctx.db, environmentOf(ctx.db, req)));
    },
  },
  {
    key: 'PATCH /bff/admin/environments/{id}',
    versioned: true,
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const environment = environmentOf(ctx.db, req);
      update(ctx.db, environment, bodyOf(req));
      return ok(environmentView(ctx.db, environment));
    },
  },
  {
    key: 'POST /bff/admin/environments/{id}/deactivate',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      deactivate(ctx.db, environmentOf(ctx.db, req));
      return noContent();
    },
  },
  {
    key: 'POST /bff/admin/environments/{id}/reactivate',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      reactivate(environmentOf(ctx.db, req));
      return noContent();
    },
  },
];
