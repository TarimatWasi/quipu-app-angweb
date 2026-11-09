import type { CallFailure } from '@shared/forms/call-failure';
import { NETWORK_TEXT, RATE_LIMITED_TEXT } from '@shared/text/error-text';
import { AMOUNT_TEXT, DATES_TEXT, ENVIRONMENT_TEXT } from './guest-texts';
import { DOCUMENT_INVALID_TEXT, DOCUMENT_TAKEN_TEXT } from './new-guest';
import type { FieldKey } from './stay-form';

// A3.5: what the catalog of SRS 17 says for the failures of the document and stay forms. They go by
// `code` and never by the text the server sent (QP-ANGWEB-BFF-02); the one exception is
// STAY_OVERLAP, whose text carries the dates of the stay it crosses.
export const DOCUMENT_LOCKED_TEXT =
  'El documento solo se corrige antes de que el huésped active su acceso';
export const GUEST_NOT_ACTIVE_TEXT =
  'Este huésped aún no está activo: no admite contratos ni pagos';
export const GUEST_NOT_TEMPORARY_TEXT = 'Solo los huéspedes temporales tienen estadías';
export const DOCUMENT_UNEXPECTED_TEXT = 'No se pudo corregir el documento. Inténtalo de nuevo.';

const GONE_TEXTS = new Map<string, string>([
  ['STAY_NOT_FOUND', 'La estadía no existe'],
  ['ENVIRONMENT_NOT_FOUND', 'El ambiente no existe'],
]);
const GUEST_GONE_TEXT = 'El huésped no existe';

/** What a 404 of these forms says: the stay or the environment when the code names it, else the guest. */
export function goneText({ code }: CallFailure): string {
  return GONE_TEXTS.get(code ?? '') ?? GUEST_GONE_TEXT;
}

export type DocumentProblem =
  | { readonly place: 'document'; readonly message: string }
  | { readonly place: 'general'; readonly message: string };

/** Where a failed correction of the document goes: under the document or above the actions. */
export function documentProblem({ status, code }: CallFailure): DocumentProblem {
  switch (code) {
    case 'GUEST_DOCUMENT_TAKEN':
    case 'ACCOUNT_DOCUMENT_TAKEN':
      return { place: 'document', message: DOCUMENT_TAKEN_TEXT };
    case 'GUEST_DOCUMENT_LOCKED':
      return { place: 'document', message: DOCUMENT_LOCKED_TEXT };
    case 'VALIDATION_ERROR':
      return { place: 'document', message: DOCUMENT_INVALID_TEXT };
    default:
      if (status === 0) return { place: 'general', message: NETWORK_TEXT };
      if (status === 429) return { place: 'general', message: RATE_LIMITED_TEXT };
      return { place: 'general', message: DOCUMENT_UNEXPECTED_TEXT };
  }
}

const FIELD_TEXTS: Readonly<Record<FieldKey, string>> = {
  dates: DATES_TEXT,
  environment: ENVIRONMENT_TEXT,
  amount: AMOUNT_TEXT,
};

/** The text of a field of the stay a VALIDATION_ERROR points at. */
export function stayFieldText(key: FieldKey): string {
  return FIELD_TEXTS[key];
}
