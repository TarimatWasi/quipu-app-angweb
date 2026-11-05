import type { components } from '@core/api/bff.generated';
import { payablePeriods } from '../data/account-views';
import { findDemoUserByDocument } from '../data/demo-users';
import { ID_KIND } from '../data/mock-db';
import type { DocumentType, GuestRecord, MockDb } from '../data/mock-db';
import { UNSENT_EMAIL_MARK } from '../data/seed-administrators';
import { invalid, MockFailure, notFound, ok, raise } from '../mock-reply';
import type { MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];

/** How long an access lasts (RN-32). */
const ACCESS_MINUTES = 30;
const DOCUMENT_TYPES = new Set<unknown>(['DNI', 'CE', 'PASSPORT']);
const GUEST_TYPES = new Set<unknown>(['CONTRACT', 'TEMPORARY']);
const ACCESS_MODES = new Set<unknown>(['LINK', 'TEMPORARY_PASSWORD']);
// The shapes of GuestInput: a DNI of 8 digits; a CE or a passport, letters, digits or hyphen.
const DOCUMENT_SHAPES: Readonly<Record<DocumentType, RegExp>> = {
  DNI: /^\d{8}$/,
  CE: /^[A-Za-z0-9-]{1,20}$/,
  PASSPORT: /^[A-Za-z0-9-]{1,20}$/,
};
const PHONE_SHAPE = /^\+?[0-9][0-9 -]{5,28}$/;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_PHONE_LENGTH = 30;
const MAX_EMAIL_LENGTH = 200;

function bodyOf(req: MockRequest): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {};
}

function optionalText(body: Record<string, unknown>, name: string, valid: (v: string) => boolean) {
  const value = body[name];
  if (value === undefined) return null;
  return typeof value === 'string' && valid(value) ? value : invalid(name);
}

type GuestInput = Schemas['GuestInput'];

function guestInputOf(body: Record<string, unknown>): GuestInput {
  const { documentType, documentNumber, type, accessMode } = body;
  if (!DOCUMENT_TYPES.has(documentType)) return invalid('documentType');
  const kind = documentType as DocumentType;
  if (typeof documentNumber !== 'string' || !DOCUMENT_SHAPES[kind].test(documentNumber)) {
    return invalid('documentNumber');
  }
  if (!GUEST_TYPES.has(type)) return invalid('type');
  if (!ACCESS_MODES.has(accessMode)) return invalid('accessMode');
  const phone = optionalText(
    body,
    'phone',
    (value) => value.length <= MAX_PHONE_LENGTH && PHONE_SHAPE.test(value),
  );
  const contactEmail = optionalText(
    body,
    'contactEmail',
    (value) => value.length <= MAX_EMAIL_LENGTH && EMAIL_SHAPE.test(value),
  );
  return {
    documentType: kind,
    documentNumber,
    type: type as GuestInput['type'],
    accessMode: accessMode as GuestInput['accessMode'],
    ...(phone === null ? {} : { phone }),
    ...(contactEmail === null ? {} : { contactEmail }),
  };
}

function nonInactive(guest: GuestRecord): Schemas['NonInactiveGuestSummary'] {
  if (guest.status === 'INACTIVE') return raise(500, 'UNEXPECTED_ERROR', 'Error inesperado');
  return {
    id: guest.id,
    documentType: guest.documentType,
    documentNumber: guest.documentNumber,
    name: guest.name,
    type: guest.type,
    status: guest.status,
    hasLoginAccess: guest.hasLoginAccess,
  };
}

/** The guest of the document, inactive included (RN-18). */
function sameDocument(db: MockDb, input: GuestInput): GuestRecord | undefined {
  return db.data.guests.find(
    (guest) =>
      guest.documentType === input.documentType && guest.documentNumber === input.documentNumber,
  );
}

/** Whether the document is an administrator's account (D-34e). */
function administratorDocument(db: MockDb, input: GuestInput): boolean {
  const same = (other: { documentType: DocumentType; documentNumber: string }) =>
    other.documentType === input.documentType && other.documentNumber === input.documentNumber;
  return (
    db.data.administrators.some(same) ||
    findDemoUserByDocument(input.documentType, input.documentNumber)?.guestId === null
  );
}

/** GUEST_EMAIL_TAKEN before ACCOUNT_EMAIL_TAKEN, both case-insensitive (D-33, D-77). */
function checkEmail(db: MockDb, email: string | undefined): void {
  if (email === undefined) return;
  const wanted = email.toLowerCase();
  if (db.data.guests.some((guest) => guest.contactEmail?.toLowerCase() === wanted)) {
    raise(409, 'GUEST_EMAIL_TAKEN', 'El correo ya está registrado', 'contactEmail');
  }
  const accounts = [
    ...db.data.administrators.map((record) => record.email),
    ...db.data.guests.map((guest) => guest.accountEmail),
  ];
  if (accounts.some((account) => account?.toLowerCase() === wanted)) {
    raise(409, 'ACCOUNT_EMAIL_TAKEN', 'El correo ya está registrado', 'contactEmail');
  }
}

/** The first access of a new guest: made-up secrets, valid 30 minutes (RN-32). */
function accessFor(guest: GuestRecord, input: GuestInput): Schemas['AccessGrant'] {
  const expiresAt = new Date(Date.now() + ACCESS_MINUTES * 60_000).toISOString();
  const email = input.contactEmail;
  const emailSent = email !== undefined && !email.toLowerCase().includes(UNSENT_EMAIL_MARK);
  if (input.accessMode === 'LINK') {
    const activationUrl = `${globalThis.location.origin}/activate#token=demo-${guest.id.slice(-4)}`;
    const shareMessage = `Hola, este es tu acceso a Quipu: ${activationUrl}\nÁbrelo en los próximos 30 minutos para elegir tu contraseña. Sirve una sola vez.`;
    return { mode: 'LINK', activationUrl, expiresAt, emailSent, shareMessage };
  }
  const temporaryPassword = `demo-${guest.id.slice(-4)}`;
  const shareMessage = `Hola, entra a Quipu con tu número de documento y esta clave temporal: ${temporaryPassword}\nVence en 30 minutos y sirve una sola vez; luego eliges tu contraseña.`;
  return { mode: 'TEMPORARY_PASSWORD', temporaryPassword, expiresAt, emailSent, shareMessage };
}

/**
 * createGuest (RN-18, RN-31): a document already registered answers its guest (200) or, inactive,
 * a 409 GUEST_INACTIVE with its id; an administrator's document is GUEST_DOCUMENT_TAKEN; otherwise
 * the guest is created pending activation with its access. An email with «sin-envio» is not sent.
 */
function createGuest(db: MockDb, body: Record<string, unknown>) {
  const input = guestInputOf(body);
  const existing = sameDocument(db, input);
  if (existing?.status === 'INACTIVE') {
    const inactive: Schemas['GuestInactiveError'] = {
      code: 'GUEST_INACTIVE',
      message: 'El huésped está inactivo',
      guestId: existing.id,
    };
    throw new MockFailure({ status: 409, body: inactive });
  }
  if (existing) {
    const answer: Schemas['GuestAlreadyRegistered'] = {
      guest: nonInactive(existing),
      alreadyRegistered: true,
    };
    return ok(answer);
  }
  if (administratorDocument(db, input)) {
    raise(409, 'GUEST_DOCUMENT_TAKEN', 'El documento ya está registrado', 'documentNumber');
  }
  checkEmail(db, input.contactEmail);
  const guest: GuestRecord = {
    id: db.newId(ID_KIND.guest),
    version: 1,
    documentType: input.documentType,
    documentNumber: input.documentNumber,
    name: null,
    type: input.type,
    status: 'PENDING_ACTIVATION',
    phone: input.phone ?? null,
    contactEmail: input.contactEmail ?? null,
    accountEmail: null,
    hasLoginAccess: false,
    accessExpiresAt: null,
    deactivatedAt: null,
    documentCount: 0,
  };
  const access = accessFor(guest, input);
  db.data.guests.push({ ...guest, accessExpiresAt: access.expiresAt });
  const created: Schemas['GuestCreated'] = {
    guest: { ...nonInactive(guest), name: null, status: 'PENDING_ACTIVATION' },
    alreadyRegistered: false,
    access,
  };
  return ok(created, 201);
}

/** reactivateGuest (CU-28): refused while it owes overdue periods or stays (RN-25, RN-35). */
function reactivateGuest(db: MockDb, guest: GuestRecord): Schemas['NonInactiveGuestSummary'] {
  if (guest.status !== 'INACTIVE') return nonInactive(guest);
  const owed = payablePeriods(db, guest.id).filter((item) => item.status === 'OVERDUE');
  if (owed.length > 0) {
    const debt: Schemas['GuestHasPendingDebtError'] = {
      code: 'GUEST_HAS_PENDING_DEBT',
      message: 'El huésped tiene deuda pendiente',
      periods: owed.map((item) => item.period ?? item.dueDate.slice(0, 7)),
      debts: owed.map((item) => ({
        period: item.period,
        stayId: item.stayId,
        stayStartDate: item.stayStartDate,
        stayEndDate: item.stayEndDate,
        amountDue: item.amountDue,
      })),
    };
    throw new MockFailure({ status: 409, body: debt });
  }
  guest.status = guest.name === null ? 'PENDING_ACTIVATION' : 'ACTIVE';
  guest.deactivatedAt = null;
  guest.version += 1;
  return nonInactive(guest);
}

/** A3.1: the registration of a guest and the reactivation of an inactive one. */
export const ADMIN_GUEST_REGISTRATION_ROUTES: readonly MockRoute[] = [
  {
    key: 'POST /bff/admin/guests',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return createGuest(ctx.db, bodyOf(req));
    },
  },
  {
    key: 'POST /bff/admin/guests/{id}/reactivate',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const guest = ctx.db.guest(req.params['id'] ?? '') ?? notFound();
      return ok(reactivateGuest(ctx.db, guest));
    },
  },
];
