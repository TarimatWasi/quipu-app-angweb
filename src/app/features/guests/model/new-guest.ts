import { callFailure } from '@shared/forms/call-failure';
import type { CallFailure } from '@shared/forms/call-failure';
import { EMAIL_TEXT, PHONE_TEXT } from '@shared/forms/contact-rules';
import { NETWORK_TEXT, RATE_LIMITED_TEXT } from '@shared/text/error-text';
import type {
  AccessGrant,
  DocumentType,
  GuestInput,
  NonInactiveGuestSummary,
  PendingDebtError,
} from '@core/api/clients/admin-guests.service';
import { formatMoney, formatPeriod, periodLabel } from '@shared/payments/payment-format';
import { DOCUMENT_TYPE_LABELS } from '@shared/text/document-text';
import { DOCUMENT_TYPE_CHIPS, GUEST_TYPE_LABELS } from './guest-texts';

/** A3.1 «Nuevo huésped» (CU-02, CU-09, CU-28) as the canvas «HuespedNuevo» words it. */

export type GuestType = GuestInput['type'];
export type { NonInactiveGuestSummary };
export type AccessMode = AccessGrant['mode'];

/** What the administrator types; empty optional fields never travel. */
export interface NewGuestModel {
  type: GuestType;
  documentType: DocumentType;
  documentNumber: string;
  phone: string;
  contactEmail: string;
  accessMode: AccessMode;
}

export const EMPTY_NEW_GUEST: NewGuestModel = {
  type: 'CONTRACT',
  documentType: 'DNI',
  documentNumber: '',
  phone: '',
  contactEmail: '',
  accessMode: 'LINK',
};

export interface Option<T> {
  readonly value: T;
  readonly label: string;
}

export const GUEST_TYPE_OPTIONS: readonly Option<GuestType>[] = [
  { value: 'CONTRACT', label: GUEST_TYPE_LABELS.CONTRACT },
  { value: 'TEMPORARY', label: GUEST_TYPE_LABELS.TEMPORARY },
];

export const DOCUMENT_TYPE_OPTIONS: readonly Option<DocumentType>[] = (
  ['DNI', 'CE', 'PASSPORT'] as const
).map((value) => ({ value, label: DOCUMENT_TYPE_CHIPS[value] }));

export const ACCESS_MODE_OPTIONS: readonly Option<AccessMode>[] = [
  { value: 'LINK', label: 'Link de activación' },
  { value: 'TEMPORARY_PASSWORD', label: 'Clave temporal' },
];

/** How the summary and A3.7 name each way in. */
export const ACCESS_MODE_LABELS: Readonly<Record<AccessMode, string>> = {
  LINK: 'Link',
  TEMPORARY_PASSWORD: 'Clave temporal',
};

export const GUEST_TYPE_HELP: Readonly<Record<GuestType, string>> = {
  CONTRACT: 'Paga cada mes con un contrato, que cargas cuando termine de activar su acceso.',
  TEMPORARY: 'Paga por estadía: registras su estadía cuando termine de activar su acceso.',
};

export const DOCUMENT_HELP: Readonly<Record<DocumentType, string>> = {
  DNI: 'Los 8 dígitos de su DNI. Con él entrará a Quipu.',
  CE: 'El número de su carné de extranjería, hasta 20 letras, números o guiones. Con él entrará a Quipu.',
  PASSPORT:
    'El número de su pasaporte, hasta 20 letras, números o guiones. Con él entrará a Quipu.',
};

const EXPIRY_HELP =
  ' Vence a los 30 minutos y sirve una sola vez; si vence, generas otro desde su ficha.';

export const ACCESS_MODE_HELP: Readonly<Record<AccessMode, string>> = {
  LINK: `Abre una página donde elige su contraseña.${EXPIRY_HELP}`,
  TEMPORARY_PASSWORD: `Entra con su documento y la clave, y luego elige su contraseña.${EXPIRY_HELP}`,
};

export const PHONE_HELP =
  'Para abrir WhatsApp con el acceso ya escrito. Si es de otro país, empieza con su prefijo, por ejemplo +34.';
export const EMAIL_HELP = 'Si lo escribes, también le enviamos el acceso por correo.';

/** The body of createGuest: trimmed, and without the optional fields left empty. */
export function toGuestInput(model: NewGuestModel): GuestInput {
  const phone = model.phone.trim();
  const contactEmail = model.contactEmail.trim();
  return {
    documentType: model.documentType,
    documentNumber: model.documentNumber.trim(),
    type: model.type,
    ...(phone === '' ? {} : { phone }),
    ...(contactEmail === '' ? {} : { contactEmail }),
    accessMode: model.accessMode,
  };
}

/** One fact of a summary (P-11 on dark stone); `wide` takes the whole row of the grid. */
export interface Fact {
  readonly label: string;
  readonly value: string;
  readonly wide: boolean;
}

export const MISSING_NUMBER_TEXT = 'Falta el número';

/** How the guest will hear of its access: the channels it has, or the message the admin copies. */
export function noticeChannels(phone: string, contactEmail: string): string {
  const hasPhone = phone.trim() !== '';
  const hasEmail = contactEmail.trim() !== '';
  if (hasPhone && hasEmail) return 'WhatsApp y correo';
  if (hasPhone) return 'WhatsApp';
  return hasEmail ? 'Correo' : 'El mensaje que copies';
}

/** «Lo que se va a crear»: it follows what is typed, field by field. */
export function newGuestFacts(model: NewGuestModel): readonly Fact[] {
  const number = model.documentNumber.trim();
  return [
    {
      label: 'Documento',
      value:
        number === ''
          ? MISSING_NUMBER_TEXT
          : `${DOCUMENT_TYPE_LABELS[model.documentType]} ${number}`,
      wide: true,
    },
    { label: 'Tipo', value: GUEST_TYPE_LABELS[model.type], wide: false },
    { label: 'Acceso', value: ACCESS_MODE_LABELS[model.accessMode], wide: false },
    {
      label: 'Se le avisa por',
      value: noticeChannels(model.phone, model.contactEmail),
      wide: true,
    },
  ];
}

// The failures of createGuest, worded for this screen (QP-ANGWEB-BFF-02: never the server's text).
export const DOCUMENT_TAKEN_TEXT =
  'Ese documento ya pertenece a otro huésped o a una cuenta de administrador';
export const GUEST_EMAIL_TAKEN_TEXT = 'Ese correo ya está registrado para otro huésped';
export const ACCOUNT_EMAIL_TAKEN_TEXT = 'Ese correo ya está registrado para otra cuenta';
export const DOCUMENT_INVALID_TEXT = 'Revisa el número de documento.';
export const UNEXPECTED_TEXT = 'No se pudo crear el huésped. Inténtalo de nuevo.';

/** The fields of A3.1 a server error can point at. */
export type NewGuestField = 'documentNumber' | 'phone' | 'contactEmail';

export type CreateProblem =
  | { readonly place: 'field'; readonly field: NewGuestField; readonly message: string }
  | { readonly place: 'general'; readonly message: string };

const CODE_PROBLEMS = new Map<string, CreateProblem>([
  [
    'GUEST_DOCUMENT_TAKEN',
    { place: 'field', field: 'documentNumber', message: DOCUMENT_TAKEN_TEXT },
  ],
  [
    'ACCOUNT_DOCUMENT_TAKEN',
    { place: 'field', field: 'documentNumber', message: DOCUMENT_TAKEN_TEXT },
  ],
  ['GUEST_EMAIL_TAKEN', { place: 'field', field: 'contactEmail', message: GUEST_EMAIL_TAKEN_TEXT }],
  [
    'ACCOUNT_EMAIL_TAKEN',
    { place: 'field', field: 'contactEmail', message: ACCOUNT_EMAIL_TAKEN_TEXT },
  ],
  ['RATE_LIMITED', { place: 'general', message: RATE_LIMITED_TEXT }],
]);

const VALIDATION_PROBLEMS = new Map<string, CreateProblem>([
  ['documentNumber', { place: 'field', field: 'documentNumber', message: DOCUMENT_INVALID_TEXT }],
  ['phone', { place: 'field', field: 'phone', message: PHONE_TEXT }],
  ['contactEmail', { place: 'field', field: 'contactEmail', message: EMAIL_TEXT }],
]);

/** Where a failure of createGuest goes, decided by `code` and `field` (QP-ANGWEB-BFF-02). */
export function createProblem({ status, code, field }: CallFailure): CreateProblem {
  if (status === 0) return { place: 'general', message: NETWORK_TEXT };
  if (status === 429) return { place: 'general', message: RATE_LIMITED_TEXT };
  const known = code === null ? undefined : CODE_PROBLEMS.get(code);
  if (known) return known;
  if (code === 'VALIDATION_ERROR' && field !== null) {
    return VALIDATION_PROBLEMS.get(field) ?? { place: 'general', message: UNEXPECTED_TEXT };
  }
  return { place: 'general', message: UNEXPECTED_TEXT };
}

/** The id of the inactive guest a 409 GUEST_INACTIVE points at, or null for any other failure. */
export function inactiveGuestId({ status, code, body }: CallFailure): string | null {
  if (status !== 409 || code !== 'GUEST_INACTIVE') return null;
  const id = body['guestId'];
  return typeof id === 'string' && id !== '' ? id : null;
}

/** One line of «Primero salda su deuda»: the month or the stay, and its amount when the BFF gave it. */
export interface DebtLine {
  readonly label: string;
  readonly amount: string | null;
}

export interface PendingDebt {
  readonly lines: readonly DebtLine[];
  /** The sum of the amounts, or null when the BFF listed only the periods. */
  readonly total: string | null;
}

type Debt = NonNullable<PendingDebtError['debts']>[number];

function isDebt(value: unknown): value is Debt {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['amountDue'] === 'number'
  );
}

function nullableText(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function debtLine(debt: Debt): DebtLine {
  const label = periodLabel({
    period: nullableText(debt.period),
    stayStartDate: nullableText(debt.stayStartDate),
    stayEndDate: nullableText(debt.stayEndDate),
  });
  return { label, amount: formatMoney(debt.amountDue) };
}

/**
 * What a 409 GUEST_HAS_PENDING_DEBT says is owed, oldest first: each debt with its amount and the
 * total, or only the periods when `debts` is missing. null for any other failure.
 */
export function pendingDebt({ status, code, body }: CallFailure): PendingDebt | null {
  if (status !== 409 || code !== 'GUEST_HAS_PENDING_DEBT') return null;
  const debts = Array.isArray(body['debts']) ? body['debts'].filter(isDebt) : [];
  if (debts.length > 0) {
    const total = debts.reduce((sum, debt) => sum + debt.amountDue, 0);
    return { lines: debts.map(debtLine), total: formatMoney(Math.round(total * 100) / 100) };
  }
  const periods = Array.isArray(body['periods']) ? body['periods'] : [];
  const lines = periods
    .filter((period): period is string => typeof period === 'string')
    .map((period) => ({ label: formatPeriod(period), amount: null }));
  return { lines, total: null };
}

// The dialogs of A3.1.
export const ALREADY_REGISTERED_TITLE = 'Este documento ya está registrado';
export const ALREADY_REGISTERED_TEXT = 'No se creó otro huésped ni se modificó ningún dato.';
export const LOST_ACCESS_TEXT = ' Si perdió su acceso o le venció, genera otro desde su ficha.';
export const UNNAMED_TEXT = 'Sin nombre aún';
export const INACTIVE_TITLE = 'Este huésped está inactivo';
export const INACTIVE_TEXT =
  'Reactiva su cuenta para que vuelva a entrar con su acceso; se conservan sus datos y su historial.';
export const DEBT_TITLE = 'Primero salda su deuda';
export const DEBT_TEXT =
  'Salda sus meses impagos antes de reactivar su cuenta. Puedes registrar lo que te pagó con un pago directo.';
export const REACTIVATED_TEXT = 'Huésped reactivado.';
export const REACTIVATE_CONFLICT_TEXT =
  'El huésped cambió mientras tanto. Cierra este aviso y vuelve a intentarlo.';
export const REACTIVATE_NOT_FOUND_TEXT = 'Ese huésped ya no existe.';
export const REACTIVATE_FAILED_TEXT = 'No se pudo reactivar al huésped. Inténtalo de nuevo.';

/** Why «Reactivar huésped» failed, said inside its dialog. */
export function reactivateProblem({ status, code }: CallFailure): string {
  if (status === 0) return NETWORK_TEXT;
  if (status === 429 || code === 'RATE_LIMITED') return RATE_LIMITED_TEXT;
  if (status === 404) return REACTIVATE_NOT_FOUND_TEXT;
  if (code === 'CONCURRENT_MODIFICATION') return REACTIVATE_CONFLICT_TEXT;
  return REACTIVATE_FAILED_TEXT;
}

export { callFailure, NETWORK_TEXT, RATE_LIMITED_TEXT };
export type { CallFailure };
