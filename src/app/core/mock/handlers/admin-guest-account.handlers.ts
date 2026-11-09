import type { components } from '@core/api/bff.generated';
import { accessGrant } from '../data/access-grants';
import { guestPeriods, periodStatus } from '../data/account-views';
import { nowInstant } from '../data/mock-dates';
import type { GuestRecord, MockDb } from '../data/mock-db';
import { invalid, MockFailure, noContent, notFound, ok, raise } from '../mock-reply';
import type { MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];

const ACCESS_MODES = new Set<unknown>(['LINK', 'TEMPORARY_PASSWORD']);
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 200;

function guestOf(db: MockDb, req: MockRequest): GuestRecord {
  return db.guest(req.params['id'] ?? '') ?? notFound();
}

function bodyOf(req: MockRequest): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {};
}

/** 409 GUEST_INACTIVE with the id, so the administrator can reactivate it (RN-12, CU-28). */
function refuseInactive(guest: GuestRecord): void {
  if (guest.status !== 'INACTIVE') return;
  const body: Schemas['GuestInactiveError'] = {
    code: 'GUEST_INACTIVE',
    message: 'El huésped está inactivo',
    guestId: guest.id,
  };
  throw new MockFailure({ status: 409, body });
}

/** Every month of every contract of the guest, the credit discounted once (RF-06, RN-38). */
function accountStatus(db: MockDb, guest: GuestRecord): Schemas['PeriodStatus'][] {
  return guestPeriods(db, guest.id).map(periodStatus);
}

/** deactivateGuest (RN-12): refused while a contract is in force; a debt does not block it. */
function deactivate(db: MockDb, guest: GuestRecord): void {
  const contract = db.data.contracts.find(
    (item) => item.guestId === guest.id && item.status === 'ACTIVE',
  );
  if (contract !== undefined) {
    const body: Schemas['GuestHasActiveContractError'] = {
      code: 'GUEST_HAS_ACTIVE_CONTRACT',
      message: 'El huésped tiene un contrato vigente',
      contractId: contract.id,
    };
    throw new MockFailure({ status: 409, body });
  }
  if (guest.status === 'INACTIVE') return;
  guest.status = 'INACTIVE';
  guest.deactivatedAt = nowInstant();
  guest.version += 1;
}

/** generateGuestAccess (RF-17): a new access that replaces the previous one. */
function generateAccess(guest: GuestRecord, body: Record<string, unknown>): Schemas['AccessGrant'] {
  const mode = body['accessMode'];
  if (!ACCESS_MODES.has(mode)) return invalid('accessMode');
  refuseInactive(guest);
  const access = accessGrant(guest, mode as Schemas['AccessMode'], guest.email);
  if (guest.status === 'PENDING_ACTIVATION') {
    guest.accessExpiresAt = access.expiresAt;
  }
  guest.version += 1;
  return access;
}

/** setGuestAccountEmail (RF-16, TAR-349): the one email, unique among the accounts, without a code. */
function setAccountEmail(db: MockDb, guest: GuestRecord, body: Record<string, unknown>): void {
  const email = body['email'];
  if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH || !EMAIL_SHAPE.test(email)) {
    invalid('email');
  }
  refuseInactive(guest);
  const wanted = email.toLowerCase();
  const taken =
    db.data.administrators.some((admin) => admin.email.toLowerCase() === wanted) ||
    db.data.guests.some((other) => other.id !== guest.id && other.email?.toLowerCase() === wanted);
  if (taken) {
    raise(409, 'ACCOUNT_EMAIL_TAKEN', 'El correo ya está registrado', 'email');
  }
  guest.email = email;
  delete guest.emailVerification;
}

/** A3.2: the months of a guest, deactivating it, a new access (A3.4) and its account email. */
export const ADMIN_GUEST_ACCOUNT_ROUTES: readonly MockRoute[] = [
  {
    key: 'GET /bff/admin/guests/{id}/account-status',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(accountStatus(ctx.db, guestOf(ctx.db, req)));
    },
  },
  {
    key: 'POST /bff/admin/guests/{id}/deactivate',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      deactivate(ctx.db, guestOf(ctx.db, req));
      return noContent();
    },
  },
  {
    key: 'POST /bff/admin/guests/{id}/access',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(generateAccess(guestOf(ctx.db, req), bodyOf(req)));
    },
  },
  {
    key: 'PUT /bff/admin/guests/{id}/account-email',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      setAccountEmail(ctx.db, guestOf(ctx.db, req), bodyOf(req));
      return noContent();
    },
  },
];
