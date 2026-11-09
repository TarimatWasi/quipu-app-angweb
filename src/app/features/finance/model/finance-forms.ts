import { AMOUNT_TEXT } from '@shared/payments/proof-rules';
import type { components } from '@core/api/bff.generated';
import { formatMoney, parseAmount } from '@shared/payments/payment-format';
import { documentLabel } from '@shared/text/document-text';
import { guestName } from '@shared/text/guest-text';
import { CATEGORIES, monthLabel, originText } from './finance';
import type { Category, Expense, PendingCredit } from './finance';

/** The forms of A6: A6.1 expense, A6.3 fine and A6.5 refund, with the words of the catalog of SRS 17. */

type Schemas = components['schemas'];
export type ExpenseInput = Schemas['ExpenseInput'];
export type FineInput = Schemas['FineInput'];
export type RefundInput = Schemas['RefundInput'];
export type GuestSummary = Schemas['GuestSummary'];

export const MAX_TEXT_LENGTH = 500;
export const MAX_METHOD_LENGTH = 50;

// The texts of the catalog.

export const CATEGORY_REQUIRED_TEXT = 'Elige una categoría';
export const GUEST_REQUIRED_TEXT = 'Elige un huésped';
export const MONTH_REQUIRED_TEXT = 'Elige un mes';
export const METHOD_REQUIRED_TEXT = 'Escribe cómo devolviste el dinero';
export const DATE_REQUIRED_TEXT = 'Elige la fecha en que devolviste el dinero.';
export const DATE_FUTURE_TEXT = 'La fecha no puede ser futura.';

export function amountProblem(amount: string): string | null {
  const value = parseAmount(amount);
  return value !== null && value > 0 ? null : AMOUNT_TEXT;
}

// A6.1 «Nuevo egreso» and «Editar egreso».

export interface ExpenseDraft {
  readonly category: Category | '';
  readonly amount: string;
  readonly month: string;
  readonly description: string;
}

export function newExpense(month: string): ExpenseDraft {
  return { category: '', amount: '', month, description: '' };
}

export function draftOfExpense(expense: Expense): ExpenseDraft {
  return {
    category: expense.category,
    amount: expense.amount.toFixed(2),
    month: expense.month,
    description: expense.description ?? '',
  };
}

export function categoryProblem(category: string): string | null {
  return (CATEGORIES as readonly string[]).includes(category) ? null : CATEGORY_REQUIRED_TEXT;
}

/** What the BFF takes, or null while the draft is not valid. */
export function toExpenseInput(draft: ExpenseDraft): ExpenseInput | null {
  const amount = parseAmount(draft.amount);
  if (draft.category === '' || amount === null || amount <= 0 || draft.month === '') return null;
  const description = draft.description.trim();
  return {
    category: draft.category,
    amount,
    month: draft.month,
    ...(description === '' ? {} : { description }),
  };
}

// A6.3 «Nueva multa».

export interface FineDraft {
  readonly guestId: string;
  readonly amount: string;
  readonly month: string;
  readonly description: string;
}

export function newFine(month: string): FineDraft {
  return { guestId: '', amount: '', month, description: '' };
}

export function guestProblem(guestId: string): string | null {
  return guestId === '' ? GUEST_REQUIRED_TEXT : null;
}

export function toFineInput(draft: FineDraft): FineInput | null {
  const amount = parseAmount(draft.amount);
  if (draft.guestId === '' || amount === null || amount <= 0 || draft.month === '') return null;
  const description = draft.description.trim();
  return {
    guestId: draft.guestId,
    amount,
    month: draft.month,
    ...(description === '' ? {} : { description }),
  };
}

export interface Option {
  readonly value: string;
  readonly label: string;
}

/** «Luis Mamani · 104», and «· Inactivo» for one that left: a fine can be charged afterwards (RN-30). */
export function guestOptions(guests: readonly GuestSummary[]): Option[] {
  return guests.map((guest) => {
    const place =
      guest.environment?.code ?? documentLabel(guest.documentType, guest.documentNumber);
    const inactive = guest.status === 'INACTIVE' ? ' · Inactivo' : '';
    return { value: guest.id, label: `${guestName(guest.name)} · ${place}${inactive}` };
  });
}

/** What the help under the month says: in which balance the movement counts. */
export function monthHelp(kind: 'EXP' | 'FIN', month: string): string {
  return kind === 'EXP'
    ? `Cuenta en los egresos de ${monthLabel(month).toLowerCase()}.`
    : `Suma a los ingresos de ${monthLabel(month).toLowerCase()}.`;
}

export const FINE_GUEST_HELP =
  'Activos e inactivos: una multa se puede cobrar después de que el huésped se fue (RN-30).';
export const EXPENSE_INTRO = 'Resta del neto del mes que elijas.';
export const FINE_INTRO =
  'Una multa es un ingreso directo: no pasa por voucher ni aprobación (RN-30). Para corregirla, elimínala y regístrala de nuevo.';

// A6.5 «Registrar devolución».

export interface RefundDraft {
  readonly guestId: string;
  readonly amount: string;
  readonly date: string;
  readonly method: string;
  readonly note: string;
}

/** The ways of returning money, as buttons over the free text (P-19): they do not replace it. */
export const METHOD_SHORTCUTS: readonly string[] = ['Yape', 'Transferencia', 'Efectivo'];

/** The refund starts with the guest chosen and all its credit in the amount, which can be less. */
export function newRefund(credit: PendingCredit | undefined, today: string): RefundDraft {
  return {
    guestId: credit?.guestId ?? '',
    amount: credit === undefined ? '' : credit.amount.toFixed(2),
    date: today,
    method: '',
    note: '',
  };
}

export function creditOf(
  credits: readonly PendingCredit[],
  guestId: string,
): PendingCredit | undefined {
  return credits.find((credit) => credit.guestId === guestId);
}

export function refundAmountProblem(
  amount: string,
  credit: PendingCredit | undefined,
): string | null {
  const own = amountProblem(amount);
  if (own !== null) return own;
  const value = parseAmount(amount) ?? 0;
  return credit !== undefined && value > credit.amount
    ? `El monto no puede pasar el crédito de ${formatMoney(credit.amount)}`
    : null;
}

export function methodProblem(method: string): string | null {
  return method.trim() === '' ? METHOD_REQUIRED_TEXT : null;
}

export function dateProblem(date: string, today: string): string | null {
  if (date === '') return DATE_REQUIRED_TEXT;
  return date > today ? DATE_FUTURE_TEXT : null;
}

export function toRefundInput(
  draft: RefundDraft,
  credit: PendingCredit | undefined,
  today: string,
): RefundInput | null {
  const amount = parseAmount(draft.amount);
  const problem =
    guestProblem(draft.guestId) ??
    refundAmountProblem(draft.amount, credit) ??
    methodProblem(draft.method) ??
    dateProblem(draft.date, today);
  if (problem !== null || amount === null) return null;
  const note = draft.note.trim();
  return {
    guestId: draft.guestId,
    amount,
    date: draft.date,
    method: draft.method.trim(),
    ...(note === '' ? {} : { note }),
  };
}

/** The credit of the chosen guest and where it came from; or what to do while none is chosen. */
export function refundGuestHelp(credit: PendingCredit | undefined): string {
  return credit === undefined
    ? 'Solo aparecen los huéspedes con crédito por devolver.'
    : `${originText(credit)} Crédito por devolver: ${formatMoney(credit.amount)}.`;
}

export function refundAmountHelp(credit: PendingCredit | undefined): string {
  return credit === undefined
    ? 'Elige primero el huésped.'
    : `Hasta ${formatMoney(credit.amount)}. Si devuelves menos, el resto sigue pendiente.`;
}

export function refundDateHelp(date: string): string {
  return date === ''
    ? DATE_REQUIRED_TEXT
    : `Resta de los ingresos de ${monthLabel(date.slice(0, 7)).toLowerCase()}.`;
}

/** The options of the guest of a refund: the ones with credit, «Diego Huanca · 204 · S/ 50.00». */
export function creditOptions(credits: readonly PendingCredit[]): Option[] {
  return credits.map((credit) => {
    const place = credit.environmentCode === null ? '' : ` · ${credit.environmentCode}`;
    return {
      value: credit.guestId,
      label: `${guestName(credit.guestName)}${place} · ${formatMoney(credit.amount)}`,
    };
  });
}

// What the BFF refuses about a field, in the words of the catalog (QP-UI-17): never its own text.

export type RefusedField = 'category' | 'amount' | 'month' | 'guestId' | 'date' | 'method';

const REFUSED_TEXTS: Readonly<Record<RefusedField, string>> = {
  category: CATEGORY_REQUIRED_TEXT,
  amount: AMOUNT_TEXT,
  month: MONTH_REQUIRED_TEXT,
  guestId: GUEST_REQUIRED_TEXT,
  date: DATE_REQUIRED_TEXT,
  method: METHOD_REQUIRED_TEXT,
};

function isRefusedField(field: string | undefined): field is RefusedField {
  return field !== undefined && Object.hasOwn(REFUSED_TEXTS, field);
}

// RESOURCE_NOT_FOUND, one text per resource (SRS 17).
export const GUEST_GONE_TEXT = 'El huésped no existe.';
export const FINE_GONE_TEXT = 'La multa no existe.';
export const EXPENSE_GONE_TEXT = 'El gasto no existe.';

/** The field of the form a refusal points at and what to say under it; null when it is none of them. */
export function refusal(
  code: string | null,
  field: string | undefined,
): { readonly field: RefusedField; readonly message: string } | null {
  if (code === 'EXPENSE_INVALID_AMOUNT') return { field: 'amount', message: AMOUNT_TEXT };
  return isRefusedField(field) ? { field, message: REFUSED_TEXTS[field] } : null;
}
