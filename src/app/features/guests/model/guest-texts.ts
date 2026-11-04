import type { DocumentType, GuestDetail, Stay } from '@core/api/clients/admin-guests.service';
import { formatStay } from '@shared/payments/payment-format';
import type { Environment } from './environment';

/** Texts of A3.2 and A3.5 as the approved canvas words them, Spanish only (QP-ANGWEB-LNG-01). */

/** The colour of a badge (P-08): green, yellow, grey or red, with its dot. */
export type Tone = 'ok' | 'wait' | 'none' | 'bad';

export interface Badge {
  readonly label: string;
  readonly tone: Tone;
}

export const GUEST_STATUS_BADGES: Readonly<Record<GuestDetail['status'], Badge>> = {
  PENDING_ACTIVATION: { label: 'Pendiente de activación', tone: 'wait' },
  ONBOARDING: { label: 'En onboarding', tone: 'wait' },
  ACTIVE: { label: 'Activo', tone: 'ok' },
  INACTIVE: { label: 'Inactivo', tone: 'none' },
};

export const STAY_PAYMENT_BADGES: Readonly<Record<Stay['paymentStatus'], Badge>> = {
  PAID: { label: 'Pagado', tone: 'ok' },
  UNDER_REVIEW: { label: 'Pendiente de revisión', tone: 'wait' },
  UNPAID: { label: 'No pagado', tone: 'none' },
  OVERDUE: { label: 'Atrasado', tone: 'bad' },
};

export const GUEST_TYPE_LABELS: Readonly<Record<GuestDetail['type'], string>> = {
  CONTRACT: 'Con contrato',
  TEMPORARY: 'Temporal',
};

/** As the header and the facts write a document: "DNI 70412233". */
export const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentType, string>> = {
  DNI: 'DNI',
  CE: 'CE',
  PASSPORT: 'Pasaporte',
};

/** As the document chips of A3.5 name each type. */
export const DOCUMENT_TYPE_CHIPS: Readonly<Record<DocumentType, string>> = {
  DNI: 'DNI',
  CE: 'Carné de extranjería',
  PASSPORT: 'Pasaporte',
};

export const ENVIRONMENT_TYPE_LABELS: Readonly<Record<Environment['type'], string>> = {
  ROOM: 'Habitación',
  CABIN: 'Cabaña',
};

export const NO_ENVIRONMENT = 'Sin ambiente';

// Textos de validación of A3.5.
export const AMOUNT_TEXT = 'Escribe un monto mayor que 0.';
export const DATES_TEXT = 'Elige la llegada y la salida.';
export const DATES_ORDER_TEXT = 'La salida no puede ser antes de la llegada.';
export const ENVIRONMENT_TEXT = 'Elige el ambiente de la estadía.';
export const DOCUMENT_NUMBER_TEXT = 'Escribe el número de documento.';
export const DNI_TEXT = 'El DNI tiene 8 dígitos.';
export const DOCUMENT_FORMAT_TEXT = 'Usa solo letras, números o guion, hasta 20.';

// Avisos of A3.5, shown on A3.2 when it comes back.
export const STAY_CREATED_TEXT = 'Estadía registrada.';
export const STAY_UPDATED_TEXT = 'Estadía corregida.';
export const DOCUMENT_UPDATED_TEXT = 'Documento corregido.';

/** P-12: the notice when the BFF takes too long (Render waking up). */
export const SLOW_TEXT =
  'El servidor está despertando; la primera solicitud puede tardar hasta un minuto.';

/** How long an aviso stays on screen, as in the payment screens. */
export const SNACK_MS = 6000;

/** The local check of a document number (A3.1 and A3.5), or null when it is valid. */
export function documentNumberError(type: DocumentType, number: string): string | null {
  const value = number.trim();
  if (value === '') return DOCUMENT_NUMBER_TEXT;
  if (type === 'DNI') return /^\d{8}$/.test(value) ? null : DNI_TEXT;
  return /^[A-Za-z0-9-]{1,20}$/.test(value) ? null : DOCUMENT_FORMAT_TEXT;
}

interface Named {
  readonly name: string | null;
  readonly documentType: DocumentType;
  readonly documentNumber: string;
}

/** The document in text, "DNI 70412233". */
export function documentText(guest: Named): string {
  return `${DOCUMENT_TYPE_LABELS[guest.documentType]} ${guest.documentNumber}`;
}

/** How the screens name a guest: its name, or its document while it has none yet. */
export function guestName(guest: Named): string {
  return guest.name ?? documentText(guest);
}

/** Nights between two yyyy-mm-dd dates, or null when one is missing or they are out of order. */
export function nightsBetween(start: string, end: string): number | null {
  const from = Date.parse(`${start}T00:00:00Z`);
  const to = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null;
  return Math.round((to - from) / 86_400_000);
}

export function nightsText(nights: number): string {
  return nights === 1 ? '1 noche' : `${String(nights)} noches`;
}

/** The dates of a stay in the history, always with the year: "20 – 31 oct 2026". */
export function stayDatesWithYear(start: string, end: string): string {
  const text = formatStay(start, end);
  const year = end.slice(0, 4);
  return start.slice(0, 4) === year && /^\d{4}$/.test(year) ? `${text} ${year}` : text;
}

const LIMA_TODAY = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/** The date of the header (P-02): "Hoy, jueves 29 de octubre", in the time of the residence. */
export function todayText(now: Date = new Date()): string {
  const parts = LIMA_TODAY.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `Hoy, ${get('weekday')} ${get('day')} de ${get('month')}`;
}

/** The `aria-describedby` of a field: its error (when shown) and its help, `<prefix>-error` and `<prefix>-help`. */
export function describedBy(error: string | null, prefix: string): string {
  return error ? `${prefix}-error ${prefix}-help` : `${prefix}-help`;
}

/** How many blocks each skeleton list draws (P-12). */
export const SKELETON_ROWS: readonly number[] = [1, 2, 3, 4];
