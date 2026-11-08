import type { CallFailure } from '../forms/call-failure';
import { formatDate, limaDayOf } from '../payments/payment-format';
import { INVALID_FILE_TEXT } from '../payments/proof-rules';
import { NETWORK_TEXT, RATE_LIMITED_TEXT, STORAGE_UNAVAILABLE_TEXT } from './error-text';

/** How a file is named for people (vouchers of A5.2, documents of A3.8): its kind and its size. */

const FILE_KINDS: Readonly<Record<string, string>> = {
  'image/jpeg': 'Imagen JPG',
  'image/png': 'Imagen PNG',
  'application/pdf': 'PDF',
};

/** «1.4 MB», «240 KB». */
export function fileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${String(Math.max(1, Math.round(bytes / 1024)))} KB`;
}

/** «Imagen JPG · 1.4 MB», «PDF · 240 KB». */
export function fileMeta(contentType: string, sizeBytes: number): string {
  return `${FILE_KINDS[contentType] ?? 'Archivo'} · ${fileSize(sizeBytes)}`;
}

/** «subido hoy» or «subido el 2 mar 2026», by days in Lima; «subido» when the instant is not valid. */
export function uploadedText(uploadedAt: string, now: Date): string {
  const day = limaDayOf(uploadedAt);
  if (day === null) return 'subido';
  return day === limaDayOf(now.toISOString()) ? 'subido hoy' : `subido el ${formatDate(day)}`;
}

const UNEXPECTED_UPLOAD_TEXT = 'No se pudo subir el documento. Inténtalo de nuevo.';

export function limitText(limit: number): string {
  return `Ya subiste el máximo de ${String(limit)} documentos`;
}

/**
 * Where the answer of a failed upload of an own document goes (H5, T3 and the onboarding, RN-37):
 * under the file, or in a toast.
 */
export type UploadProblem =
  | { readonly place: 'file'; readonly message: string }
  | { readonly place: 'toast'; readonly message: string };

export function uploadProblem({ status, code }: CallFailure, limit: number): UploadProblem {
  if (code === 'DOCUMENT_INVALID_FILE') return { place: 'file', message: INVALID_FILE_TEXT };
  if (code === 'DOCUMENT_LIMIT_REACHED') return { place: 'file', message: limitText(limit) };
  if (status === 503) return { place: 'toast', message: STORAGE_UNAVAILABLE_TEXT };
  if (status === 429) return { place: 'toast', message: RATE_LIMITED_TEXT };
  if (status === 0) return { place: 'toast', message: NETWORK_TEXT };
  return { place: 'toast', message: UNEXPECTED_UPLOAD_TEXT };
}

/** What the BFF says of a document of the guest (GuestDocumentRef) that a list needs. */
export interface DocumentRef {
  readonly id: string;
  readonly originalName: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly uploadedAt: string;
}

/** A document of the guest as a list names it (H5, T3 and the onboarding). */
export interface OwnDocumentRow {
  readonly id: string;
  readonly name: string;
  /** «Imagen JPG · 1.2 MB · subido el 2 mar 2026». */
  readonly meta: string;
}

export function toDocumentRows(documents: readonly DocumentRef[], now: Date): OwnDocumentRow[] {
  return documents.map((document) => ({
    id: document.id,
    name: document.originalName,
    meta: `${fileMeta(document.contentType, document.sizeBytes)} · ${uploadedText(document.uploadedAt, now)}`,
  }));
}
