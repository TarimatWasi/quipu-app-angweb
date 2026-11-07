import type {
  DocumentActionReason,
  DocumentActionRequest,
  DocumentRequestChannel,
  GuestDocument,
  GuestDocumentAction,
} from '@core/api/clients/admin-guest-documents.service';
import { formatDate, formatDateTime } from '@shared/payments/payment-format';
import { INVALID_FILE_TEXT, isValidVoucher } from '@shared/payments/proof-rules';
import { STORAGE_UNAVAILABLE_TEXT } from '@shared/text/error-text';
import { fileMeta, fileSize, uploadedText } from '@shared/text/file-text';
import { whenText } from './guest-list-texts';
import { NETWORK_TEXT, RATE_LIMITED_TEXT } from './new-guest';
import type { CallFailure } from './new-guest';

export type { DocumentActionReason, DocumentActionRequest, DocumentRequestChannel };

/** A3.8 «Documentos del huésped» and its dialogs, as the canvas «Documentos» words them. */

export const DOCUMENTS_TITLE = 'Documentos';
export const LOAD_DOCUMENTS_TEXT = 'No se pudieron cargar los documentos.';
export const DOCUMENTS_WHO_NOTE =
  'Los subió el huésped al registrarse. Solo la administración los ve; no se aprueban, se guardan. Se borran o reemplazan solo si el titular lo pide (ARCO) o si hubo un error de carga.';
export const NO_DOCUMENTS_TITLE = 'El huésped no subió documentos.';
export const NO_DOCUMENTS_TEXT = 'Era un paso opcional de su registro.';
export const LINK_NOTE =
  '«Abrir» descarga el archivo con un enlace que vale 15 minutos; si venció, vuelve a pulsarlo.';
export const LINK_EXPIRED_TEXT = 'El enlace venció: ya hay uno nuevo, pulsa «Abrir» otra vez.';
export const NO_ACTIONS_TEXT = 'Ningún documento se borró ni se reemplazó.';
export const DOCUMENT_DELETED_TEXT = 'Documento borrado.';
export const DOCUMENT_REPLACED_TEXT = 'Documento reemplazado.';

/** The most documents a guest may have (RN-37). */
export const MAX_DOCUMENTS = 5;

// The dialog of delete and replace (P-16).
export type ActionKind = 'delete' | 'replace';
export const REASON_OPTIONS: readonly { value: DocumentActionReason; label: string }[] = [
  { value: 'ARCO_REQUEST', label: 'Lo pidió el titular (ARCO)' },
  { value: 'UPLOAD_ERROR', label: 'Error de carga' },
];
export const CHANNEL_OPTIONS: readonly { value: DocumentRequestChannel; label: string }[] = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Correo' },
  { value: 'IN_PERSON', label: 'En persona' },
  { value: 'OTHER', label: 'Otro' },
];
const CHANNEL_LABELS: Readonly<Record<DocumentRequestChannel, string>> = Object.fromEntries(
  CHANNEL_OPTIONS.map((option) => [option.value, option.label]),
) as Record<DocumentRequestChannel, string>;
export const MAX_NOTE_LENGTH = 500;

export function actionTitle(kind: ActionKind, name: string): string {
  return kind === 'delete' ? `¿Borrar ${name}?` : `Reemplazar ${name}`;
}
export function actionLead(kind: ActionKind): string {
  return kind === 'delete'
    ? 'Se borra para siempre. Queda registro de quién lo borró, cuándo y por qué, sin el archivo.'
    : 'El archivo anterior se borra y queda registro de quién lo reemplazó, cuándo y por qué.';
}
export function actionSubmitLabel(kind: ActionKind, sending: boolean): string {
  if (kind === 'delete') return sending ? 'Borrando…' : 'Borrar documento';
  return sending ? 'Reemplazando…' : 'Reemplazar documento';
}
export const NOTE_HELP =
  'Solo una referencia, por ejemplo el número del mensaje. Sin datos personales.';
export const NEW_FILE_PROMPT = 'Elige el archivo que lo reemplaza.';

const REASON_TEXT = 'Elige el motivo.';
const DATE_MISSING_TEXT = 'Elige la fecha en que lo pidió.';
const DATE_FUTURE_TEXT = 'La fecha no puede ser futura.';
const CHANNEL_TEXT = 'Elige por dónde lo pidió.';
const NOTE_LONG_TEXT = `La nota admite hasta ${String(MAX_NOTE_LENGTH)} caracteres.`;
const FILE_MISSING_TEXT = NEW_FILE_PROMPT;
const GONE_TEXT =
  'Este documento ya no está: lo borraron o lo reemplazaron. Cierra y revisa la lista.';
const UNEXPECTED_TEXT = 'No se pudo completar la acción. Inténtalo de nuevo.';
const FORM_TEXT = 'No se pudo enviar el formulario. Recarga la página e inténtalo de nuevo.';

/** What the administrator filled in; the file is only asked for when replacing. */
export interface ActionDraft {
  readonly reason: DocumentActionReason | null;
  readonly requestedAt: string;
  readonly channel: DocumentRequestChannel | null;
  readonly note: string;
  readonly file: File | null;
  /** The chosen file is not JPG, PNG or PDF of 5 MB at most. */
  readonly fileInvalid: boolean;
}

export const EMPTY_DRAFT: ActionDraft = {
  reason: null,
  requestedAt: '',
  channel: null,
  note: '',
  file: null,
  fileInvalid: false,
};

export type DraftField = 'reason' | 'requestedAt' | 'requestChannel' | 'note' | 'file';
export type DraftProblems = Partial<Record<DraftField, string>>;

/** Whether a chosen file can replace a document: the same rule as a voucher (RF-15, RN-37). */
export function isValidDocumentFile(file: File): boolean {
  return isValidVoucher(file);
}

/**
 * What is missing or wrong before calling the BFF (FE-ANG-FRM-03). With ARCO the date (not after
 * `today`) and the channel are required; with an upload error neither is asked.
 */
export function draftProblems(draft: ActionDraft, kind: ActionKind, today: string): DraftProblems {
  const problems: DraftProblems = {};
  if (draft.reason === null) problems.reason = REASON_TEXT;
  if (draft.reason === 'ARCO_REQUEST') {
    if (draft.requestedAt === '') problems.requestedAt = DATE_MISSING_TEXT;
    else if (draft.requestedAt > today) problems.requestedAt = DATE_FUTURE_TEXT;
    if (draft.channel === null) problems.requestChannel = CHANNEL_TEXT;
  }
  if (draft.note.trim().length > MAX_NOTE_LENGTH) problems.note = NOTE_LONG_TEXT;
  if (kind === 'replace') {
    if (draft.fileInvalid) problems.file = INVALID_FILE_TEXT;
    else if (draft.file === null) problems.file = FILE_MISSING_TEXT;
  }
  return problems;
}

/** The body of DocumentActionRequest for a valid draft: only what the reason asks for. */
export function actionRequest(draft: ActionDraft): DocumentActionRequest {
  const note = draft.note.trim();
  const base = note === '' ? {} : { note };
  if (draft.reason !== 'ARCO_REQUEST' || draft.channel === null) {
    return { reason: 'UPLOAD_ERROR', ...base };
  }
  return {
    reason: 'ARCO_REQUEST',
    requestedAt: draft.requestedAt,
    requestChannel: draft.channel,
    ...base,
  };
}

/** Where the answer of a failed deletion or replacement goes: under a field or above the buttons. */
export type ActionProblem =
  | { readonly place: 'field'; readonly field: DraftField; readonly message: string }
  | { readonly place: 'general'; readonly message: string };

const FIELD_PROBLEMS: Readonly<Record<string, ActionProblem>> = {
  reason: { place: 'field', field: 'reason', message: REASON_TEXT },
  requestedAt: { place: 'field', field: 'requestedAt', message: DATE_MISSING_TEXT },
  requestChannel: { place: 'field', field: 'requestChannel', message: CHANNEL_TEXT },
  note: { place: 'field', field: 'note', message: NOTE_LONG_TEXT },
};

export function actionProblem({ status, code, field }: CallFailure): ActionProblem {
  if (status === 0) return { place: 'general', message: NETWORK_TEXT };
  if (status === 429) return { place: 'general', message: RATE_LIMITED_TEXT };
  if (status === 404) return { place: 'general', message: GONE_TEXT };
  if (status === 415) return { place: 'general', message: FORM_TEXT };
  if (status === 503 && code === 'FILE_STORAGE_UNAVAILABLE') {
    return { place: 'general', message: STORAGE_UNAVAILABLE_TEXT };
  }
  if (code === 'DOCUMENT_INVALID_FILE') {
    return { place: 'field', field: 'file', message: INVALID_FILE_TEXT };
  }
  if (code === 'VALIDATION_ERROR' && field !== null) {
    return FIELD_PROBLEMS[field] ?? { place: 'general', message: UNEXPECTED_TEXT };
  }
  return { place: 'general', message: UNEXPECTED_TEXT };
}

/** A document of the list: its name, what it is and when it came, and the link to download it. */
export interface DocumentRow {
  readonly id: string;
  readonly name: string;
  /** «Imagen JPG · 1.2 MB · subido el 2 mar 2026». */
  readonly meta: string;
  readonly url: string;
  readonly urlExpiresAt: string;
}

export function toDocumentRow(document: GuestDocument, now: Date): DocumentRow {
  return {
    id: document.id,
    name: document.originalName,
    meta: `${fileMeta(document.contentType, document.sizeBytes)} · ${uploadedText(document.uploadedAt, now)}`,
    url: document.url,
    urlExpiresAt: document.urlExpiresAt,
  };
}

/** Whether the signed link of a document no longer opens (it lasts 15 minutes). */
export function isLinkExpired(row: DocumentRow, now: Date): boolean {
  const expires = new Date(row.urlExpiresAt).getTime();
  return Number.isNaN(expires) || expires <= now.getTime();
}

/** One entry of «Borrados y reemplazos». */
export interface ActionRow {
  readonly id: string;
  /** «Borrado · lo pidió el titular». */
  readonly title: string;
  /** «hoy a las 10:05». */
  readonly when: string;
  readonly detail: string;
}

const KIND_SHORT: Readonly<Record<string, string>> = {
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'application/pdf': 'PDF',
};

function actionDetail(action: GuestDocumentAction): string {
  const file = `${KIND_SHORT[action.contentType] ?? 'Archivo'}, ${fileSize(action.sizeBytes)}.`;
  const note = action.note === null ? '' : ` · ${action.note}`;
  const why =
    action.reason === 'ARCO_REQUEST' &&
    action.requestChannel !== null &&
    action.requestedAt !== null
      ? `Lo pidió por ${CHANNEL_LABELS[action.requestChannel]} el ${formatDate(action.requestedAt)}${note}.`
      : `Error de carga${note}.`;
  const who = action.actorName === undefined ? '' : ` Lo hizo ${action.actorName}.`;
  return `${file} ${why}${who}`;
}

export function toActionRow(action: GuestDocumentAction, now: Date): ActionRow {
  const moment = new Date(action.performedAt);
  return {
    id: action.id,
    title: `${action.action === 'DELETE' ? 'Borrado' : 'Reemplazado'} · ${
      action.reason === 'ARCO_REQUEST' ? 'lo pidió el titular' : 'error de carga'
    }`,
    when: Number.isNaN(moment.getTime())
      ? formatDateTime(action.performedAt)
      : whenText(moment, now),
    detail: actionDetail(action),
  };
}
