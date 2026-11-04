import type { DocumentType, GuestDetail } from '@core/services/admin-guests.service';
import type { Environment } from '@core/services/admin-environments.service';

/** Texts of A3.2 and A3.5, Spanish only (QP-ANGWEB-LNG-01). */
export const GUEST_STATUS_LABELS: Readonly<Record<GuestDetail['status'], string>> = {
  PENDING_ACTIVATION: 'Pendiente de activación',
  ONBOARDING: 'En onboarding',
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};

export const GUEST_TYPE_LABELS: Readonly<Record<GuestDetail['type'], string>> = {
  CONTRACT: 'Con contrato',
  TEMPORARY: 'Temporal',
};

export const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentType, string>> = {
  DNI: 'DNI',
  CE: 'CE',
  PASSPORT: 'Pasaporte',
};

export const ENVIRONMENT_TYPE_LABELS: Readonly<Record<Environment['type'], string>> = {
  ROOM: 'Habitación',
  CABIN: 'Cabaña',
};

export const NO_NAME = 'Sin nombre aún';
export const NO_ENVIRONMENT = 'Sin ambiente';

// Textos de validación of A3.5 in the SRS.
export const AMOUNT_TEXT = 'Escribe un monto mayor que 0.';
export const DATES_TEXT = 'Elige la llegada y la salida.';
export const DATES_ORDER_TEXT = 'La salida no puede ser antes de la llegada.';
export const ENVIRONMENT_TEXT = 'Elige el ambiente de la estadía.';
export const DOCUMENT_NUMBER_TEXT = 'Escribe el número de documento.';
export const DNI_TEXT = 'El DNI tiene 8 dígitos.';
export const DOCUMENT_FORMAT_TEXT = 'Usa solo letras, números o guion, hasta 20.';

// Avisos of A3.5 in the SRS.
export const STAY_CREATED_TEXT = 'Estadía registrada.';
export const STAY_UPDATED_TEXT = 'Estadía corregida.';
export const DOCUMENT_UPDATED_TEXT = 'Documento corregido.';

/** How long an aviso stays on screen, as in the payment screens. */
export const SNACK_MS = 6000;

/** The local check of a document number (A3.1 and A3.5), or null when it is valid. */
export function documentNumberError(type: DocumentType, number: string): string | null {
  const value = number.trim();
  if (value === '') return DOCUMENT_NUMBER_TEXT;
  if (type === 'DNI') return /^\d{8}$/.test(value) ? null : DNI_TEXT;
  return /^[A-Za-z0-9-]{1,20}$/.test(value) ? null : DOCUMENT_FORMAT_TEXT;
}
