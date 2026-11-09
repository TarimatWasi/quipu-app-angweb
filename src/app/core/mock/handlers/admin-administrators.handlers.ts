import type { components } from '@core/api/bff.generated';
import { DEMO_CLAVE, findDemoUserByDocument } from '../data/demo-users';
import type { DemoUser } from '../data/demo-users';
import { nowInstant } from '../data/mock-dates';
import { ID_KIND } from '../data/mock-db';
import type { AdministratorRecord, DocumentType, MockDb } from '../data/mock-db';
import { UNSENT_EMAIL_MARK } from '../data/seed-administrators';
import { invalid, noContent, ok, raise } from '../mock-reply';
import type { MockContext, MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];

/** The configurable maximum of active administrators of the BFF (RF-22). */
export const MAX_ACTIVE_ADMINISTRATORS = 5;

const DOCUMENT_TYPES = new Set<unknown>(['DNI', 'CE', 'PASSPORT']);
// The shape the BFF checks: a DNI of 8 digits; a CE or a passport, letters, digits or hyphen.
const DOCUMENT_SHAPES: Readonly<Record<DocumentType, RegExp>> = {
  DNI: /^\d{8}$/,
  CE: /^[A-Za-z0-9-]{1,20}$/,
  PASSPORT: /^[A-Za-z0-9-]{1,20}$/,
};
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 200;
const MAX_PASSWORD_LENGTH = 128;

function isDocumentType(value: unknown): value is DocumentType {
  return DOCUMENT_TYPES.has(value);
}

function bodyOf(req: MockRequest): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {};
}

/** Only the last 3 characters are shown, every other one is replaced by `*`. */
function masked(documentNumber: string): string {
  return '*'.repeat(Math.max(documentNumber.length - 3, 0)) + documentNumber.slice(-3);
}

function isSelf(record: AdministratorRecord, user: DemoUser): boolean {
  return record.documentType === user.documentType && record.documentNumber === user.documentNumber;
}

function summaryOf(record: AdministratorRecord, user: DemoUser): Schemas['AdministratorSummary'] {
  return {
    id: record.id,
    name: record.name,
    documentType: record.documentType,
    documentNumber: masked(record.documentNumber),
    email: record.email,
    status: record.status,
    createdAt: record.createdAt,
    self: isSelf(record, user),
  };
}

function activeCount(db: MockDb): number {
  return db.data.administrators.filter((record) => record.status === 'ACTIVE').length;
}

/** The re-authentication of the caller with the demo password, checked before anything else. */
function reauthenticate(body: Record<string, unknown>): void {
  const password = body['currentPassword'];
  if (typeof password !== 'string' || password === '' || password.length > MAX_PASSWORD_LENGTH) {
    invalid('currentPassword');
  }
  if (password !== DEMO_CLAVE) {
    raise(403, 'AUTH_INVALID_CREDENTIALS', 'Contraseña incorrecta', 'currentPassword');
  }
}

interface NewAdministrator {
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly email: string;
}

function newAdministratorOf(body: Record<string, unknown>): NewAdministrator {
  const { documentType, documentNumber, email } = body;
  if (!isDocumentType(documentType)) return invalid('documentType');
  if (typeof documentNumber !== 'string' || !DOCUMENT_SHAPES[documentType].test(documentNumber)) {
    return invalid('documentNumber');
  }
  if (typeof email !== 'string' || email.length > MAX_EMAIL_LENGTH || !EMAIL_SHAPE.test(email)) {
    return invalid('email');
  }
  return { documentType, documentNumber, email };
}

/** Whether the document belongs to any account: an administrator, a guest or a demo account. */
function documentTaken(db: MockDb, { documentType, documentNumber }: NewAdministrator): boolean {
  const same = (other: { documentType: DocumentType; documentNumber: string }) =>
    other.documentType === documentType && other.documentNumber === documentNumber;
  return (
    db.data.administrators.some(same) ||
    db.data.guests.some(same) ||
    findDemoUserByDocument(documentType, documentNumber) !== undefined
  );
}

/** Whether the email (case-insensitive) is the account email of any account (D-33). */
function emailTaken(db: MockDb, email: string): boolean {
  const wanted = email.toLowerCase();
  return (
    db.data.administrators.some((record) => record.email.toLowerCase() === wanted) ||
    db.data.guests.some((guest) => guest.email?.toLowerCase() === wanted)
  );
}

function createAdministrator(
  db: MockDb,
  body: Record<string, unknown>,
): Schemas['AdministratorCreated'] {
  const input = newAdministratorOf(body);
  reauthenticate(body);
  if (activeCount(db) >= MAX_ACTIVE_ADMINISTRATORS) {
    raise(409, 'ADMIN_LIMIT_REACHED', 'Ya hay 5 administradores, el máximo.');
  }
  if (documentTaken(db, input)) {
    raise(409, 'ACCOUNT_DOCUMENT_TAKEN', 'El documento ya está registrado', 'documentNumber');
  }
  if (emailTaken(db, input.email)) {
    raise(409, 'ACCOUNT_EMAIL_TAKEN', 'El correo ya está registrado', 'email');
  }
  const id = db.newId(ID_KIND.admin);
  db.data.administrators.push({
    id,
    name: null,
    ...input,
    status: 'ACTIVE',
    createdAt: nowInstant(),
  });
  return { id, emailSent: !input.email.toLowerCase().includes(UNSENT_EMAIL_MARK) };
}

function targetOf(db: MockDb, req: MockRequest): AdministratorRecord {
  return (
    db.administrator(req.params['id'] ?? '') ??
    raise(404, 'ADMIN_NOT_FOUND', 'El administrador no existe')
  );
}

function deactivate(req: MockRequest, ctx: MockContext): void {
  const user = ctx.requireAdmin();
  reauthenticate(bodyOf(req));
  const target = targetOf(ctx.db, req);
  if (isSelf(target, user)) {
    raise(409, 'ADMIN_SELF_DEACTIVATION', 'No puedes desactivar tu propia cuenta');
  }
  if (target.status === 'INACTIVE') return;
  if (activeCount(ctx.db) <= 1) {
    raise(409, 'LAST_ACTIVE_ADMIN', 'No puedes desactivar al último administrador activo');
  }
  target.status = 'INACTIVE';
}

function reactivate(req: MockRequest, ctx: MockContext): void {
  ctx.requireAdmin();
  reauthenticate(bodyOf(req));
  const target = targetOf(ctx.db, req);
  if (target.status === 'ACTIVE') return;
  if (activeCount(ctx.db) >= MAX_ACTIVE_ADMINISTRATORS) {
    raise(409, 'ADMIN_LIMIT_REACHED', 'Ya hay 5 administradores, el máximo.');
  }
  target.status = 'ACTIVE';
}

/**
 * A7 (RF-22, TAR-127): list, create, deactivate and reactivate administrators. The caller
 * re-authenticates with the demo password; an email containing «sin-envio» is created without
 * sending its link.
 */
export const ADMIN_ADMINISTRATOR_ROUTES: readonly MockRoute[] = [
  {
    key: 'GET /bff/admin/administrators',
    handler: (_req, ctx) => {
      const user = ctx.requireAdmin();
      const records = [...ctx.db.data.administrators].sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      );
      return ok(records.map((record) => summaryOf(record, user)));
    },
  },
  {
    key: 'POST /bff/admin/administrators',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(createAdministrator(ctx.db, bodyOf(req)), 201);
    },
  },
  {
    key: 'POST /bff/admin/administrators/{id}/deactivate',
    handler: (req, ctx) => {
      deactivate(req, ctx);
      return noContent();
    },
  },
  {
    key: 'POST /bff/admin/administrators/{id}/reactivate',
    handler: (req, ctx) => {
      reactivate(req, ctx);
      return noContent();
    },
  },
];
