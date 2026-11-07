import type { components } from '@core/api/bff.generated';
import { contactEmailError, phoneError } from '@shared/forms/contact-rules';
import { guestSummary, signedDocument } from '../data/guest-views';
import { nowInstant } from '../data/mock-dates';
import { ID_KIND } from '../data/mock-db';
import type { DocumentRecord, GuestRecord, MockDb } from '../data/mock-db';
import { readDocumentFile } from '../mock-multipart';
import { invalid, ok, raise } from '../mock-reply';
import type { GuestType, MockContext, MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];
type EmergencyContact = Schemas['EmergencyContact'];

/** How many documents a guest may have, those of the onboarding included (RN-37). */
const DOCUMENTS_LIMIT = 5;
const MAX_NAME_LENGTH = 200;
const MAX_RELATIONSHIP_LENGTH = 50;
const MAX_PHONE_LENGTH = 30;
const PROFILE_FIELDS = new Set(['name', 'phone', 'contactEmail', 'emergencyContact']);
const EMERGENCY_FIELDS = new Set(['name', 'relationship', 'phone']);

function ownGuest(ctx: MockContext, type: GuestType): GuestRecord {
  const { guestId } = ctx.requireGuest(type);
  return ctx.db.guest(guestId) ?? raise(404, 'RESOURCE_NOT_FOUND', 'No encontramos lo que buscas.');
}

/** A document as a list shows it, without a link and without the guest it is kept under. */
function documentRef(record: DocumentRecord): Schemas['GuestDocumentRef'] {
  return {
    id: record.id,
    originalName: record.originalName,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    uploadedAt: record.uploadedAt,
  };
}

/** getOwnProfile (H5, T3): the data, the account email and the documents without links. */
function ownProfile(db: MockDb, guest: GuestRecord): Schemas['OwnProfile'] {
  return {
    documentType: guest.documentType,
    documentNumber: guest.documentNumber,
    name: guest.name ?? '',
    phone: guest.phone,
    contactEmail: guest.contactEmail,
    emergencyContact: guest.emergencyContact ?? null,
    accountEmail: guest.accountEmail,
    documents: db.documentsOf(guest.id).map(documentRef),
    documentsLimit: DOCUMENTS_LIMIT,
  };
}

function text(body: Record<string, unknown>, field: string, max: number): string | undefined {
  const value = body[field];
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || value.trim() === '' || value.length > max) return invalid(field);
  return value.trim();
}

function emergencyOf(value: unknown): EmergencyContact {
  if (typeof value !== 'object' || value === null) return invalid('emergencyContact');
  const body = value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !EMERGENCY_FIELDS.has(key))) {
    return invalid('emergencyContact');
  }
  const field = (name: string, max: number) => {
    const entry = body[name];
    if (entry === undefined) return undefined;
    return typeof entry === 'string' && entry.length <= max
      ? entry.trim()
      : invalid(`emergencyContact.${name}`);
  };
  const name = field('name', MAX_NAME_LENGTH);
  const relationship = field('relationship', MAX_RELATIONSHIP_LENGTH);
  const phone = field('phone', MAX_PHONE_LENGTH);
  if (phone !== undefined && phoneError(phone) !== null) return invalid('emergencyContact.phone');
  return {
    ...(name !== undefined && { name }),
    ...(relationship !== undefined && { relationship }),
    ...(phone !== undefined && { phone }),
  };
}

/** The email of another guest is taken, whatever its case (D-76). */
function emailTaken(db: MockDb, guest: GuestRecord, email: string): boolean {
  const wanted = email.toLowerCase();
  return db.data.guests.some(
    (other) => other.id !== guest.id && other.contactEmail?.toLowerCase() === wanted,
  );
}

/** updateOwnProfile (RN-17): only what is sent changes; an absent field keeps its value. */
function updateProfile(db: MockDb, guest: GuestRecord, req: MockRequest): Schemas['GuestSummary'] {
  const body =
    typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};
  const keys = Object.keys(body);
  if (keys.length === 0 || keys.some((key) => !PROFILE_FIELDS.has(key))) return invalid('body');
  const name = text(body, 'name', MAX_NAME_LENGTH);
  const phone = text(body, 'phone', MAX_PHONE_LENGTH);
  if (phone !== undefined && phoneError(phone) !== null) invalid('phone');
  const email = text(body, 'contactEmail', 200);
  if (email !== undefined && contactEmailError(email) !== null) invalid('contactEmail');
  const emergency =
    body['emergencyContact'] === undefined ? undefined : emergencyOf(body['emergencyContact']);
  if (email !== undefined && emailTaken(db, guest, email)) {
    raise(409, 'GUEST_EMAIL_TAKEN', 'El correo ya está registrado', 'contactEmail');
  }
  if (name !== undefined) guest.name = name;
  if (phone !== undefined) guest.phone = phone;
  if (email !== undefined) guest.contactEmail = email;
  if (emergency !== undefined) guest.emergencyContact = emergency;
  guest.version += 1;
  return guestSummary(db, guest);
}

/** uploadOwnDocument (TAR-242): one file, up to the limit; the guest cannot delete it later. */
function uploadDocument(
  db: MockDb,
  guest: GuestRecord,
  body: unknown,
): Schemas['GuestDocumentRef'] {
  const file = readDocumentFile(body);
  if (db.documentsOf(guest.id).length >= DOCUMENTS_LIMIT) {
    raise(409, 'DOCUMENT_LIMIT_REACHED', 'Ya subiste el máximo de documentos');
  }
  const record: DocumentRecord = {
    id: db.newId(ID_KIND.document),
    guestId: guest.id,
    originalName: file.name,
    contentType: file.type as DocumentRecord['contentType'],
    sizeBytes: file.size,
    uploadedAt: nowInstant(),
  };
  db.data.documents.push(record);
  return documentRef(record);
}

/** getOwnDocument (TAR-241): only the guest's own; another's or a deleted one is a 404. */
function openDocument(db: MockDb, guest: GuestRecord, req: MockRequest): Schemas['GuestDocument'] {
  const record = db.documentsOf(guest.id).find((item) => item.id === req.params['documentId']);
  return record === undefined
    ? raise(404, 'RESOURCE_NOT_FOUND', 'No encontramos lo que buscas.')
    : signedDocument(record);
}

type Handler = MockRoute['handler'];

const profileOf =
  (type: GuestType): Handler =>
  (_req, ctx) =>
    ok(ownProfile(ctx.db, ownGuest(ctx, type)));
const updateOf =
  (type: GuestType): Handler =>
  (req, ctx) =>
    ok(updateProfile(ctx.db, ownGuest(ctx, type), req));
const uploadOf =
  (type: GuestType): Handler =>
  (req, ctx) =>
    ok(uploadDocument(ctx.db, ownGuest(ctx, type), req.body), 201);
const openOf =
  (type: GuestType): Handler =>
  (req, ctx) =>
    ok(openDocument(ctx.db, ownGuest(ctx, type), req));

/** H5 and T3: the own data of the guest and its documents, for both kinds of guest. */
export const GUEST_PROFILE_ROUTES: readonly MockRoute[] = [
  { key: 'GET /bff/guest/profile', handler: profileOf('CONTRACT') },
  { key: 'PATCH /bff/guest/profile', handler: updateOf('CONTRACT') },
  { key: 'POST /bff/guest/documents', handler: uploadOf('CONTRACT') },
  { key: 'GET /bff/guest/documents/{documentId}', handler: openOf('CONTRACT') },
  { key: 'GET /bff/temporary-guest/profile', handler: profileOf('TEMPORARY') },
  { key: 'PATCH /bff/temporary-guest/profile', handler: updateOf('TEMPORARY') },
  { key: 'POST /bff/temporary-guest/documents', handler: uploadOf('TEMPORARY') },
  { key: 'GET /bff/temporary-guest/documents/{documentId}', handler: openOf('TEMPORARY') },
];
