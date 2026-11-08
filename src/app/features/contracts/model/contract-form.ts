import { loadErrorText } from '@shared/text/list-text';
import type { components } from '@core/api/bff.generated';
import {
  formatDate,
  formatMoney,
  formatPeriod,
  parseAmount,
} from '@shared/payments/payment-format';
import { documentLabel } from '@shared/text/document-text';
import { environmentLabel } from '@shared/text/environment-text';
import { guestName } from '@shared/text/guest-text';

/** The form of A4.1 «Cargar contrato» (RF-03, CU-03): what is typed, how it is checked and what it says. */

type Schemas = components['schemas'];
export type GuestSummary = Schemas['GuestSummary'];
export type Environment = Schemas['Environment'];
export type GuestDetail = Schemas['GuestDetail'];

/** What «Cargar contrato» sends: the PDF and the agreed terms. */
export interface NewContract {
  readonly file: File;
  readonly environmentId: string;
  readonly guestId: string;
  readonly monthlyAmount: number;
  readonly paymentDay: number;
  readonly graceDays: number;
  readonly startDate: string;
  /** Null for a contract with no end date: it stays until it is finalized (RN-07). */
  readonly endDate: string | null;
}

/** What the form edits as fields; the amounts and days are text until the form is sent. */
export interface ContractFields {
  readonly guestId: string;
  readonly environmentId: string;
  readonly fee: string;
  readonly day: string;
  readonly grace: string;
  readonly start: string;
  readonly end: string;
}

/** The fields and the PDF: the file is not a field of the form, a screen keeps it apart. */
export interface ContractDraft extends ContractFields {
  readonly file: File | null;
}

export const EMPTY_FIELDS: ContractFields = {
  guestId: '',
  environmentId: '',
  fee: '',
  day: '',
  grace: '',
  start: '',
  end: '',
};

/** A contract PDF weighs 10 MB at most (RF-15). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const FILE_ACCEPT = '.pdf,application/pdf';

// The rules, as the BFF checks them; each says what is wrong, or null when it is valid.

export function guestProblem(guestId: string): string | null {
  return guestId === '' ? 'Elige al huésped del contrato.' : null;
}

export function environmentProblem(environmentId: string): string | null {
  return environmentId === '' ? 'Elige el ambiente del contrato.' : null;
}

export function feeProblem(fee: string): string | null {
  if (fee.trim() === '') return 'Escribe una cuota mayor que 0.';
  const amount = parseAmount(fee);
  return amount !== null && amount > 0 ? null : 'Escribe una cuota mayor que 0.';
}

function wholeNumber(text: string): number | null {
  return /^\d{1,2}$/.test(text.trim()) ? Number(text) : null;
}

export function dayProblem(day: string): string | null {
  if (day.trim() === '') return 'Escribe un día del 1 al 31.';
  const value = wholeNumber(day);
  return value !== null && value >= 1 && value <= 31 ? null : 'Escribe un día del 1 al 31.';
}

export function graceProblem(grace: string): string | null {
  if (grace.trim() === '') return 'Escribe de 0 a 31 días.';
  const value = wholeNumber(grace);
  return value !== null && value <= 31 ? null : 'Escribe de 0 a 31 días.';
}

export function startProblem(start: string): string | null {
  return start === '' ? 'Elige la fecha de inicio.' : null;
}

export const END_BEFORE_START_TEXT = 'La fecha de fin debe ser posterior a la de inicio.';

export function endProblem(start: string, end: string): string | null {
  return start !== '' && end !== '' && end <= start ? END_BEFORE_START_TEXT : null;
}

export const FILE_REQUIRED_TEXT = 'Elige el PDF del contrato.';
export const FILE_FORMAT_TEXT = 'El contrato debe ser un PDF de hasta 10 MB';

export function fileProblem(file: File | null): string | null {
  if (file === null) return FILE_REQUIRED_TEXT;
  const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  return isPdf && file.size <= MAX_FILE_BYTES ? null : FILE_FORMAT_TEXT;
}

/** The terms of a valid draft ready to send; null while something is wrong or missing. */
export function toNewContract(draft: ContractDraft): NewContract | null {
  const monthlyAmount = parseAmount(draft.fee);
  const paymentDay = wholeNumber(draft.day);
  const graceDays = wholeNumber(draft.grace);
  const { file } = draft;
  if (file === null || monthlyAmount === null || paymentDay === null || graceDays === null) {
    return null;
  }
  const problem =
    fileProblem(file) ??
    guestProblem(draft.guestId) ??
    environmentProblem(draft.environmentId) ??
    feeProblem(draft.fee) ??
    dayProblem(draft.day) ??
    graceProblem(draft.grace) ??
    startProblem(draft.start) ??
    endProblem(draft.start, draft.end);
  if (problem !== null) return null;
  return {
    file,
    environmentId: draft.environmentId,
    guestId: draft.guestId,
    monthlyAmount,
    paymentDay,
    graceDays,
    startDate: draft.start,
    endDate: draft.end === '' ? null : draft.end,
  };
}

// The choices of the pickers.

export interface Option {
  readonly value: string;
  readonly label: string;
}

/** «Julia Mendoza · DNI 72310458»: the active guests with a contract type and none in force (A4.1). */
export function guestOptions(guests: readonly GuestSummary[]): Option[] {
  return guests.map((guest) => ({
    value: guest.id,
    label: `${guestName(guest.name)} · ${documentLabel(guest.documentType, guest.documentNumber)}`,
  }));
}

/** The environments free today, with since when: «Habitación 109 · libre desde el 15 oct 2026». */
export function environmentOptions(environments: readonly Environment[]): Option[] {
  return environments
    .filter((environment) => environment.status === 'ACTIVE' && environment.occupant === null)
    .map((environment) => ({
      value: environment.id,
      label: `${environmentLabel(environment.type, environment.code)} · ${
        environment.freeSince ? `libre desde el ${formatDate(environment.freeSince)}` : 'libre'
      }`,
    }));
}

// What the side says.

export interface FormFact {
  readonly label: string;
  readonly value: string;
  readonly wide: boolean;
  readonly hint?: string;
}

/** Whole months from the start to the day before the same day N months later, else null. */
export function exactMonths(start: string, end: string): number | null {
  const [startYear, startMonth, startDay] = start.split('-').map(Number);
  const next = new Date(Date.parse(end) + 86_400_000);
  if (Number.isNaN(next.getTime()) || startYear === undefined) return null;
  const months =
    (next.getUTCFullYear() - startYear) * 12 + (next.getUTCMonth() + 1 - (startMonth ?? 0));
  return next.getUTCDate() === startDay && months > 0 ? months : null;
}

/** «Sin atraso hasta el 8» or, when it passes the month, «Sin atraso hasta 3 días después». */
export function graceText(day: number, grace: number): string {
  if (grace === 0) return `Sin días de gracia: desde el ${String(day + 1)} cuenta como atrasado.`;
  return day + grace > 31
    ? `Sin atraso hasta ${String(grace)} días después.`
    : `Sin atraso hasta el ${String(day + grace)}.`;
}

function termsHint(draft: ContractDraft): string | undefined {
  const day = wholeNumber(draft.day);
  const grace = wholeNumber(draft.grace);
  return day !== null && day >= 1 && day <= 31 && grace !== null && grace <= 31
    ? graceText(day, grace)
    : undefined;
}

function validityFact(draft: ContractDraft): FormFact {
  const { start, end } = draft;
  if (start === '') return { label: 'Vigencia', value: 'Falta la fecha de inicio', wide: true };
  if (endProblem(start, end) !== null) {
    return { label: 'Vigencia', value: 'Revisa las fechas', wide: true };
  }
  if (end === '') {
    return {
      label: 'Vigencia',
      value: `${formatDate(start)} – sin fecha de fin`,
      wide: true,
      hint: 'Sigue hasta que lo finalices.',
    };
  }
  const months = exactMonths(start, end);
  return {
    label: 'Vigencia',
    value: `${formatDate(start)} – ${formatDate(end)}`,
    wide: true,
    ...(months === null ? {} : { hint: `${String(months)} ${months === 1 ? 'mes' : 'meses'}` }),
  };
}

/** «Lo que se va a cargar»: what was chosen and typed so far. */
export function draftFacts(
  draft: ContractDraft,
  guest: string | null,
  environment: string | null,
): FormFact[] {
  const amount = parseAmount(draft.fee);
  const day =
    dayProblem(draft.day) === null ? `${String(wholeNumber(draft.day))} de cada mes` : null;
  const hint = termsHint(draft);
  const missingFee = draft.fee.trim() === '' ? 'Falta la cuota' : 'Revisa la cuota';
  const feeValue = amount !== null && amount > 0 ? formatMoney(amount) : missingFee;
  const dayValue = day ?? (draft.day.trim() === '' ? 'Falta el día' : 'Revisa el día');
  return [
    { label: 'Huésped', value: guest ?? 'Falta elegirlo', wide: true },
    { label: 'Ambiente', value: environment ?? 'Falta elegirlo', wide: false },
    { label: 'Cuota mensual', value: feeValue, wide: false },
    { label: 'Día de pago', value: dayValue, wide: true, ...(hint === undefined ? {} : { hint }) },
    validityFact(draft),
  ];
}

/** What loading a contract does, under the facts: the environment is taken and the guest sees it. */
export function sideNote(guest: string | null, environment: string | null): string {
  const place =
    environment === null
      ? 'el ambiente queda ocupado'
      : `la ${environment.toLowerCase()} queda ocupada`;
  return `Al cargarlo, ${place} y ${guest ?? 'el huésped'} verá su contrato y sus cobros en Quipu.`;
}

// The notices.

export const LOAD_ERROR_TEXT = loadErrorText('el formulario');
export const FILE_LABEL = 'PDF del contrato';
export const FILE_PROMPT = 'Elige el PDF firmado del contrato';
export const FILE_HELP = 'Solo PDF, hasta 10 MB.';

/** The 409 that stops the loading, as the dialog tells it (RN-35, RN-13, RN-25, RF-01, RN-20). */
export interface ContractConflict {
  readonly title: string;
  /** The text of the catalog of SRS 17 (QP-UI-17), never the one of the BFF. */
  readonly message: string;
  readonly buttonLabel: string;
  /** A second, quieter way out: closing the notice. */
  readonly closeLabel: string | null;
  /** What the form does once the main action is taken. */
  readonly next: 'environment' | 'guest' | 'pay';
}

/** A month or a stay the guest owes, as the 409 GUEST_HAS_PENDING_DEBT lists it (RN-25). */
export interface Debt {
  readonly period: string | null;
  readonly stayStartDate: string | null;
  readonly amountDue: number;
}

/** «octubre 2026 (S/ 800.00) y noviembre 2026 (S/ 800.00)»: what is owed, oldest first. */
export function debtsText(debts: readonly Debt[]): string {
  const items = debts.map((debt) => {
    const when =
      debt.period !== null
        ? formatPeriod(debt.period).toLowerCase()
        : `la estadía del ${formatDate(debt.stayStartDate ?? '')}`;
    return `${when} (${formatMoney(debt.amountDue)})`;
  });
  const [last] = items.slice(-1);
  if (last === undefined) return '';
  return items.length === 1 ? last : `${items.slice(0, -1).join(', ')} y ${last}`;
}

const NOTICES: Readonly<Record<string, { title: string; message: string }>> = {
  GUEST_NOT_ACTIVE: {
    title: 'El huésped no está activo',
    message: 'Este huésped aún no está activo: no admite contratos ni pagos',
  },
  GUEST_NOT_CONTRACT: {
    title: 'El huésped no es de contrato',
    message: 'Solo los huéspedes con contrato pueden tener un contrato',
  },
  ENVIRONMENT_INACTIVE: {
    title: 'El ambiente está inactivo',
    message: 'El ambiente está inactivo; reactívalo antes de registrar un contrato',
  },
};

const DEBT_MESSAGE =
  'El huésped tiene deuda pendiente: salda sus períodos impagos antes de crear un contrato nuevo o reactivarlo';

/**
 * The 409 that stops the loading as the dialog tells it (RN-35, RN-13, RN-25, RF-01, RN-20): the
 * texts are the catalog's, and the title names the environment when it is the one at fault.
 */
export function conflictOf(
  code: string,
  names: { readonly environment: string | null },
  debts: readonly Debt[],
): ContractConflict | null {
  if (code === 'ENVIRONMENT_OCCUPIED') {
    return {
      title: `${names.environment ?? 'El ambiente'} ya tiene un contrato vigente`,
      message:
        'Alguien cargó otro contrato o una estadía en ese ambiente en esas fechas. Elige otro ambiente libre.',
      buttonLabel: 'Elegir otro ambiente',
      closeLabel: null,
      next: 'environment',
    };
  }
  if (code === 'GUEST_HAS_PENDING_DEBT') {
    const owed = debtsText(debts);
    return {
      title: 'El huésped tiene deuda pendiente',
      message: owed === '' ? DEBT_MESSAGE : `${DEBT_MESSAGE}. Debe ${owed}.`,
      buttonLabel: 'Registrar pago',
      closeLabel: 'Cerrar',
      next: 'pay',
    };
  }
  const notice = NOTICES[code];
  if (notice === undefined) return null;
  const environment = code === 'ENVIRONMENT_INACTIVE';
  return {
    ...notice,
    buttonLabel: environment ? 'Elegir otro ambiente' : 'Entendido',
    closeLabel: null,
    next: environment ? 'environment' : 'guest',
  };
}

/** The text under a field the BFF refused with VALIDATION_ERROR: the catalog's, by field (SRS 17). */
export const SERVER_FIELD_TEXTS: Readonly<Record<keyof ContractFields, string>> = {
  guestId: 'Elige al huésped del contrato.',
  environmentId: 'Elige el ambiente del contrato.',
  fee: 'Escribe una cuota mayor que 0.',
  day: 'Escribe un día del 1 al 31.',
  grace: 'Escribe de 0 a 31 días.',
  start: 'Elige la fecha de inicio.',
  end: END_BEFORE_START_TEXT,
};

/** FILE_STORAGE_UNAVAILABLE (503): above the form, without losing what was written. */
export const STORAGE_TEXT = 'No se pudo acceder al archivo; inténtalo de nuevo más tarde';

/** The field of the form a BFF field name points at. */
export const SERVER_FIELDS: Readonly<Record<string, keyof ContractFields>> = {
  guestId: 'guestId',
  environmentId: 'environmentId',
  monthlyAmount: 'fee',
  paymentDay: 'day',
  graceDays: 'grace',
  startDate: 'start',
  endDate: 'end',
};
