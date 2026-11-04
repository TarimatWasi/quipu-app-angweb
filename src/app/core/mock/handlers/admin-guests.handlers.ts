import type { components } from '@core/api/bff.generated';
import { environmentView, isOccupied, stayView } from '../data/account-views';
import { guestDetail, guestSummary } from '../data/guest-views';
import { overlaps, today } from '../data/mock-dates';
import { ID_KIND } from '../data/mock-db';
import type { GuestRecord, MockDb, StayRecord } from '../data/mock-db';
import { invalid, notFound, ok, paginate, raise, raiseConcurrentModification } from '../mock-reply';
import type { MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];
type StayFields = Pick<StayRecord, 'environmentId' | 'startDate' | 'endDate' | 'agreedAmount'>;

const GUEST_FILTERS = new Map<string, (guest: GuestRecord) => boolean>([
  ['ALL', () => true],
  ['CURRENT', (guest) => guest.status !== 'INACTIVE'],
  ['PENDING_ACTIVATION', (guest) => guest.status === 'PENDING_ACTIVATION'],
  ['ONBOARDING', (guest) => guest.status === 'ONBOARDING'],
  ['ACTIVE', (guest) => guest.status === 'ACTIVE'],
  ['INACTIVE', (guest) => guest.status === 'INACTIVE'],
]);

const DOCUMENT_TYPES = new Set<unknown>(['DNI', 'CE', 'PASSPORT']);

function isDocumentType(value: unknown): value is GuestRecord['documentType'] {
  return DOCUMENT_TYPES.has(value);
}

function guestOf(db: MockDb, req: MockRequest): GuestRecord {
  return db.guest(req.params['id'] ?? '') ?? notFound();
}

function bodyOf(req: MockRequest): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {};
}

function versionOf(body: Record<string, unknown>): number {
  const version = body['version'];
  return typeof version === 'number' ? version : invalid('version');
}

function listGuests(db: MockDb, req: MockRequest): Schemas['PagedGuests'] {
  const filter = GUEST_FILTERS.get(req.query.get('status') ?? 'CURRENT') ?? invalid('status');
  const type = req.query.get('type');
  const guests = db.data.guests
    .filter((guest) => filter(guest) && (type === null || guest.type === type))
    .sort((a, b) =>
      `${a.documentType}${a.documentNumber}`.localeCompare(`${b.documentType}${b.documentNumber}`),
    )
    .map((guest) => guestSummary(db, guest));
  const count = (status: GuestRecord['status']) =>
    db.data.guests.filter((guest) => guest.status === status).length;
  return {
    ...paginate(guests, req.query),
    pendingActivationCount: count('PENDING_ACTIVATION'),
    onboardingCount: count('ONBOARDING'),
  };
}

/** Corrects the document of a guest pending activation, with the `version` loaded (RN-36). */
function updateGuest(db: MockDb, guest: GuestRecord, body: Record<string, unknown>): void {
  if (versionOf(body) !== guest.version) {
    raiseConcurrentModification();
  }
  if (guest.status !== 'PENDING_ACTIVATION') {
    raise(409, 'GUEST_DOCUMENT_LOCKED', 'El documento ya no se puede corregir.', 'documentNumber');
  }
  const documentType = body['documentType'] ?? guest.documentType;
  const documentNumber = body['documentNumber'] ?? guest.documentNumber;
  if (!isDocumentType(documentType)) {
    return invalid('documentType');
  }
  if (typeof documentNumber !== 'string' || documentNumber.trim() === '') {
    return invalid('documentNumber');
  }
  const taken = db.data.guests.some(
    (other) =>
      other.id !== guest.id &&
      other.documentType === documentType &&
      other.documentNumber === documentNumber,
  );
  if (taken) {
    raise(
      409,
      'GUEST_DOCUMENT_TAKEN',
      'Ese documento ya pertenece a otra persona.',
      'documentNumber',
    );
  }
  guest.documentType = documentType;
  guest.documentNumber = documentNumber;
  guest.version += 1;
}

/** Checks a stay as it would be saved: dates, amount, own overlaps and the environment (RN-20). */
function checkStay(db: MockDb, guest: GuestRecord, fields: StayFields, stayId?: string): void {
  if (!(fields.agreedAmount > 0)) {
    invalid('agreedAmount');
  }
  if (fields.endDate < fields.startDate) {
    invalid('endDate');
  }
  const crosses = db
    .staysOf(guest.id)
    .some(
      (stay) =>
        stay.id !== stayId &&
        overlaps(stay.startDate, stay.endDate, fields.startDate, fields.endDate),
    );
  if (crosses) {
    raise(409, 'STAY_OVERLAP', 'Las fechas se cruzan con otra estadía del huésped.');
  }
  const environment = db.environment(fields.environmentId);
  const range = { from: fields.startDate, to: fields.endDate, ignoreStayId: stayId };
  if (
    fields.environmentId !== null &&
    (environment?.status !== 'ACTIVE' || isOccupied(db, fields.environmentId, range))
  ) {
    raise(409, 'ENVIRONMENT_OCCUPIED', 'El ambiente ya está ocupado en esas fechas');
  }
}

/** The fields of a new stay, or of a corrected one over its current values (`base`). */
function stayFields(body: Record<string, unknown>, base?: StayFields): StayFields {
  const pick = <K extends keyof StayFields>(name: K, type: 'string' | 'number'): StayFields[K] => {
    const value = body[name] ?? base?.[name];
    return typeof value === type ? (value as StayFields[K]) : invalid(name);
  };
  // A stay registered before TAR-237 has no environment and keeps none until one is chosen.
  const keepsNoEnvironment = body['environmentId'] === undefined && base?.environmentId === null;
  return {
    environmentId: keepsNoEnvironment ? null : pick('environmentId', 'string'),
    startDate: pick('startDate', 'string'),
    endDate: pick('endDate', 'string'),
    agreedAmount: pick('agreedAmount', 'number'),
  };
}

function createStay(db: MockDb, guest: GuestRecord, body: Record<string, unknown>): StayRecord {
  if (guest.type !== 'TEMPORARY') {
    raise(409, 'GUEST_NOT_TEMPORARY', 'Solo los huéspedes temporales tienen estadías.');
  }
  if (guest.status !== 'ACTIVE') {
    raise(409, 'GUEST_NOT_ACTIVE', 'El huésped no está activo.');
  }
  const fields = stayFields(body);
  checkStay(db, guest, fields);
  const stay: StayRecord = { id: db.newId(ID_KIND.stay), guestId: guest.id, version: 1, ...fields };
  db.data.stays.push(stay);
  return stay;
}

function updateStay(db: MockDb, req: MockRequest, guest: GuestRecord): StayRecord {
  const stay = db.stay(req.params['stayId'] ?? '');
  if (stay?.guestId !== guest.id) {
    return notFound();
  }
  const body = bodyOf(req);
  if (versionOf(body) !== stay.version) {
    raiseConcurrentModification();
  }
  const fields = stayFields(body, stay);
  checkStay(db, guest, fields, stay.id);
  Object.assign(stay, fields, { version: stay.version + 1 });
  return stay;
}

function listEnvironments(db: MockDb, req: MockRequest): Schemas['PagedEnvironments'] {
  const status = req.query.get('status') ?? 'ALL';
  const freeFrom = req.query.get('freeFrom');
  const freeTo = req.query.get('freeTo') ?? freeFrom;
  if (freeTo !== null && freeFrom === null) {
    invalid('freeFrom');
  }
  const environments = db.data.environments
    .filter((environment) => status === 'ALL' || environment.status === status)
    .filter(
      (environment) =>
        freeFrom === null ||
        freeTo === null ||
        !isOccupied(db, environment.id, { from: freeFrom, to: freeTo }),
    )
    .map((environment) => environmentView(db, environment));
  const freeCount = db.data.environments.filter(
    (environment) =>
      environment.status === 'ACTIVE' &&
      !isOccupied(db, environment.id, { from: today(), to: '9999-12-31' }),
  ).length;
  return { ...paginate(environments, req.query), freeCount };
}

/** The guests of the administrator (A3, A3.2, A3.5), their stays and the environments picker. */
export const ADMIN_GUEST_ROUTES: readonly MockRoute[] = [
  {
    key: 'GET /bff/admin/guests',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(listGuests(ctx.db, req));
    },
  },
  {
    key: 'GET /bff/admin/guests/{id}',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(guestDetail(ctx.db, guestOf(ctx.db, req)));
    },
  },
  {
    key: 'PATCH /bff/admin/guests/{id}',
    versioned: true,
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const guest = guestOf(ctx.db, req);
      updateGuest(ctx.db, guest, bodyOf(req));
      return ok(guestSummary(ctx.db, guest));
    },
  },
  {
    key: 'GET /bff/admin/guests/{id}/stays',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const stays = ctx.db.staysOf(guestOf(ctx.db, req).id).map((stay) => stayView(ctx.db, stay));
      return ok(paginate(stays, req.query));
    },
  },
  {
    key: 'POST /bff/admin/guests/{id}/stays',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const stay = createStay(ctx.db, guestOf(ctx.db, req), bodyOf(req));
      return ok(stayView(ctx.db, stay), 201);
    },
  },
  {
    key: 'PATCH /bff/admin/guests/{id}/stays/{stayId}',
    versioned: true,
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(stayView(ctx.db, updateStay(ctx.db, req, guestOf(ctx.db, req))));
    },
  },
  {
    key: 'GET /bff/admin/environments',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(listEnvironments(ctx.db, req));
    },
  },
];
