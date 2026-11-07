import type { components } from '@core/api/bff.generated';
import { ADMIN_REVIEWER } from '../data/demo-users';
import { nowInstant, today } from '../data/mock-dates';
import { ID_KIND } from '../data/mock-db';
import type { DocumentActionRecord, DocumentRecord, GuestRecord, MockDb } from '../data/mock-db';
import { invalid, noContent, notFound, ok, paginate, raise } from '../mock-reply';
import type { MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];
type Reason = Schemas['DocumentActionReason'];
type Channel = Schemas['DocumentRequestChannel'];

const REASONS = new Set<unknown>(['ARCO_REQUEST', 'UPLOAD_ERROR']);
const CHANNELS = new Set<unknown>(['WHATSAPP', 'EMAIL', 'IN_PERSON', 'OTHER']);
const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTE_LENGTH = 500;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const FILE_TYPES = new Set<string>(['image/jpeg', 'image/png', 'application/pdf']);
/** The signed links last 15 minutes (RN-37). */
const LINK_MS = 15 * 60 * 1000;

/** What the reason, the date, the channel and the note of a deletion or a replacement say. */
interface ActionFields {
  readonly reason: Reason;
  readonly requestedAt: string | null;
  readonly requestChannel: Channel | null;
  readonly note: string | null;
}

function guestOf(db: MockDb, req: MockRequest): GuestRecord {
  return db.guest(req.params['id'] ?? '') ?? notFound();
}

function documentOf(db: MockDb, req: MockRequest, guest: GuestRecord): DocumentRecord {
  const id = req.params['documentId'];
  return db.documentsOf(guest.id).find((document) => document.id === id) ?? notFound();
}

/** A signed link as the BFF would give: it only identifies the document and when it ends. */
function guestDocument(document: DocumentRecord): Schemas['GuestDocument'] {
  const expires = Date.now() + LINK_MS;
  return {
    id: document.id,
    originalName: document.originalName,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    uploadedAt: document.uploadedAt,
    url: `/mock/documents/${document.id}?expira=${String(expires)}`,
    urlExpiresAt: new Date(expires).toISOString(),
  };
}

/** The evidence as the contract has it: the record without the guest it is kept under. */
function actionView(record: DocumentActionRecord): Schemas['GuestDocumentAction'] {
  return {
    id: record.id,
    action: record.action,
    documentId: record.documentId,
    replacementDocumentId: record.replacementDocumentId,
    reason: record.reason,
    requestedAt: record.requestedAt,
    requestChannel: record.requestChannel,
    note: record.note,
    contentType: record.contentType,
    sizeBytes: record.sizeBytes,
    actorId: record.actorId,
    ...(record.actorName !== undefined && { actorName: record.actorName }),
    performedAt: record.performedAt,
  };
}

function fieldOf(source: Record<string, unknown> | FormData, name: string): unknown {
  const value = source instanceof FormData ? source.get(name) : source[name];
  // An empty or blank multipart field counts as absent (replaceGuestDocument).
  return typeof value === 'string' && value.trim() === '' ? undefined : (value ?? undefined);
}

/**
 * The rules of DocumentActionRequest: with ARCO_REQUEST the date (not after today) and the channel
 * are required; with UPLOAD_ERROR neither may be sent; the note is a reference of 500 at most.
 */
function actionFields(source: Record<string, unknown> | FormData): ActionFields {
  const reason = fieldOf(source, 'reason');
  if (!REASONS.has(reason)) return invalid('reason');
  const requestedAt = fieldOf(source, 'requestedAt');
  const channel = fieldOf(source, 'requestChannel');
  const note = fieldOf(source, 'note');
  if (note !== undefined && (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH)) {
    return invalid('note');
  }
  const noteText = typeof note === 'string' ? note.trim() : null;
  if (reason === 'UPLOAD_ERROR') {
    if (requestedAt !== undefined) return invalid('requestedAt');
    if (channel !== undefined) return invalid('requestChannel');
    return { reason, requestedAt: null, requestChannel: null, note: noteText };
  }
  if (typeof requestedAt !== 'string' || !DAY_SHAPE.test(requestedAt) || requestedAt > today()) {
    return invalid('requestedAt');
  }
  if (!CHANNELS.has(channel)) return invalid('requestChannel');
  return {
    reason: 'ARCO_REQUEST',
    requestedAt,
    requestChannel: channel as Channel,
    note: noteText,
  };
}

function evidence(
  db: MockDb,
  guest: GuestRecord,
  document: DocumentRecord,
  fields: ActionFields,
  replacement: DocumentRecord | null,
): DocumentActionRecord {
  return {
    id: db.newId(ID_KIND.documentAction),
    guestId: guest.id,
    action: replacement === null ? 'DELETE' : 'REPLACE',
    documentId: document.id,
    replacementDocumentId: replacement?.id ?? null,
    ...fields,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    actorId: ADMIN_REVIEWER.id,
    actorName: ADMIN_REVIEWER.name,
    performedAt: nowInstant(),
  };
}

/** A file that is not JPG, PNG or PDF, or over 5 MB, is a 400 DOCUMENT_INVALID_FILE (RF-15). */
function uploadedFile(body: unknown): File {
  if (!(body instanceof FormData)) {
    return raise(
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'No se pudo enviar el formulario. Recarga la página e inténtalo de nuevo.',
    );
  }
  const file = body.get('file');
  if (!(file instanceof File) || !FILE_TYPES.has(file.type) || file.size > MAX_FILE_BYTES) {
    return raise(
      400,
      'DOCUMENT_INVALID_FILE',
      'El archivo debe ser JPG, PNG o PDF y pesar 5 MB como máximo.',
      'file',
    );
  }
  return file;
}

function replace(db: MockDb, guest: GuestRecord, document: DocumentRecord, body: unknown) {
  const file = uploadedFile(body);
  const fields = actionFields(body as FormData);
  const replacement: DocumentRecord = {
    id: db.newId(ID_KIND.document),
    guestId: guest.id,
    originalName: file.name,
    contentType: file.type as DocumentRecord['contentType'],
    sizeBytes: file.size,
    uploadedAt: nowInstant(),
  };
  const index = db.data.documents.indexOf(document);
  db.data.documents.splice(index, 1, replacement);
  db.data.documentActions.push(evidence(db, guest, document, fields, replacement));
  return replacement;
}

function remove(db: MockDb, guest: GuestRecord, document: DocumentRecord, body: unknown): void {
  const fields = actionFields(
    typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {},
  );
  db.data.documents.splice(db.data.documents.indexOf(document), 1);
  db.data.documentActions.push(evidence(db, guest, document, fields, null));
}

/** A3.8: the documents of a guest, their replacement and deletion with evidence (RN-37). */
export const ADMIN_GUEST_DOCUMENT_ROUTES: readonly MockRoute[] = [
  {
    key: 'GET /bff/admin/guests/{id}/documents',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(ctx.db.documentsOf(guestOf(ctx.db, req).id).map(guestDocument));
    },
  },
  {
    key: 'GET /bff/admin/guests/{id}/document-actions',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const guest = guestOf(ctx.db, req);
      return ok(paginate(ctx.db.documentActionsOf(guest.id).map(actionView), req.query));
    },
  },
  {
    key: 'PUT /bff/admin/guests/{id}/documents/{documentId}',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const guest = guestOf(ctx.db, req);
      const document = documentOf(ctx.db, req, guest);
      return ok(guestDocument(replace(ctx.db, guest, document, req.body)));
    },
  },
  {
    key: 'POST /bff/admin/guests/{id}/documents/{documentId}/deletion',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const guest = guestOf(ctx.db, req);
      remove(ctx.db, guest, documentOf(ctx.db, req, guest), req.body);
      return noContent();
    },
  },
];
