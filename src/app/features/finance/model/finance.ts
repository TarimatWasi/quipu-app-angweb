import { loadErrorText } from '@shared/text/list-text';
import type { components, operations } from '@core/api/bff.generated';
import { formatDate, formatMoney, formatPeriod, formatStay } from '@shared/payments/payment-format';
import { guestName } from '@shared/text/guest-text';
import { COLLATOR } from '@shared/text/search';
import type { ListSort, PhoneSort } from '@shared/ui/data-table/list-sort';
import { compareBy } from '@shared/ui/data-table/list-sort';

/** Finanzas (A6): the balance of a month and its expenses, fines and refunds, as the screens show them. */

type Schemas = components['schemas'];
export type Summary =
  operations['getFinanceSummary']['responses'][200]['content']['application/json'];
export type Expense = Schemas['Expense'];
export type Fine = Schemas['Fine'];
export type Refund = Schemas['Refund'];
export type PendingCredit = Schemas['PendingCredit'];
export type ExpensePage = Schemas['PagedExpenses'];
export type RefundPage = Schemas['PagedRefunds'];
export type Category = Expense['category'];

/** Which movements of the month the list shows (P-21): the BFF filters by kind, not by a state. */
export type Tab = 'EXP' | 'FIN' | 'REF';
export const TABS: readonly Tab[] = ['EXP', 'FIN', 'REF'];
export const TAB_LABELS: Readonly<Record<Tab, string>> = {
  EXP: 'Egresos',
  FIN: 'Multas',
  REF: 'Devoluciones',
};

/** The categories of an expense (D-26). */
export const CATEGORIES: readonly Category[] = [
  'UTILITIES',
  'MAINTENANCE',
  'CLEANING_SUPPLIES',
  'TAXES_FEES',
];
export const CATEGORY_LABELS: Readonly<Record<Category, string>> = {
  UTILITIES: 'Servicios',
  MAINTENANCE: 'Mantenimiento y reparaciones',
  CLEANING_SUPPLIES: 'Limpieza e insumos',
  TAXES_FEES: 'Impuestos y tasas',
};

// The months.

/** The month of a day in America/Lima, yyyy-mm: the month the balance opens on. */
export function currentMonth(day: string): string {
  return day.slice(0, 7);
}

/** «Octubre 2026». */
export function monthLabel(month: string): string {
  return formatPeriod(month);
}

/** «octubre 2026», for a sentence. */
export function monthPhrase(month: string): string {
  return formatPeriod(month).toLowerCase();
}

/** «octubre»: the month alone, for «El balance de octubre se recalculó». */
export function monthName(month: string): string {
  return monthPhrase(month).split(' ')[0] ?? '';
}

const OPTION_MONTHS = 12;

/** The months to choose from: this one and the previous ones, and the chosen one if it is outside. */
export function monthOptions(current: string, chosen: string): readonly string[] {
  const [year = 0, month = 1] = current.split('-').map(Number);
  const months = Array.from({ length: OPTION_MONTHS }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1 - index, 1));
    return date.toISOString().slice(0, 7);
  });
  return months.includes(chosen) ? months : [chosen, ...months].sort((a, b) => b.localeCompare(a));
}

// The balance (P-11).

export interface Fact {
  readonly label: string;
  readonly value: string;
  readonly hint: string;
  readonly wide: boolean;
  /** The neto is negative: its figure goes in red ink. */
  readonly negative: boolean;
}

const plural = (count: number, one: string, many: string): string =>
  `${String(count)} ${count === 1 ? one : many}`;

/** «Ingresos», «Egresos» and «Neto del mes»: how the balance of a month adds up. */
export function balanceFacts(summary: Summary): Fact[] {
  return [
    {
      label: 'Ingresos',
      value: formatMoney(summary.totalIncome),
      hint: `${formatMoney(summary.incomeFromPayments)} de ${plural(summary.paymentsCount, 'pago aprobado', 'pagos aprobados')} + ${formatMoney(summary.incomeFromFines)} de multas − ${formatMoney(summary.refundsTotal)} de devoluciones`,
      wide: true,
      negative: false,
    },
    {
      label: 'Egresos',
      value: formatMoney(summary.totalExpenses),
      hint: plural(summary.expensesCount, 'egreso', 'egresos'),
      wide: false,
      negative: false,
    },
    {
      label: 'Neto del mes',
      value: `${summary.net < 0 ? '− ' : ''}${formatMoney(Math.abs(summary.net))}`,
      hint: 'Ingresos − egresos',
      wide: false,
      negative: summary.net < 0,
    },
  ];
}

// «Lo que toca ahora» (P-04): the credit that waits for a refund.

export interface CreditPanel {
  readonly figure: number;
  readonly label: string;
  readonly text: string;
  /** The guest the dialog opens on: the one that has waited the longest (the BFF gives them oldest first). */
  readonly firstGuestId: string;
}

export function creditPanel(credits: readonly PendingCredit[]): CreditPanel {
  const [first] = credits;
  if (first === undefined) {
    return {
      figure: 0,
      label: 'devoluciones por registrar',
      text: 'No hay dinero pendiente de devolver.',
      firstGuestId: '',
    };
  }
  const total = credits.reduce((sum, credit) => sum + credit.amount, 0);
  const who = credits.map((credit) => {
    const place = credit.environmentCode === null ? '' : ` (${credit.environmentCode})`;
    return `${guestName(credit.guestName)}${place}`;
  });
  return {
    figure: credits.length,
    label: credits.length === 1 ? 'devolución por registrar' : 'devoluciones por registrar',
    text: `${formatMoney(total)} que pagaron de más ${who.join(' y ')}, sin un mes donde usarlos.`,
    firstGuestId: first.guestId,
  };
}

/** Where a credit came from: «Sobró del pago de octubre; su contrato terminó el 15 oct.». */
export function originText(credit: PendingCredit): string {
  const { origin } = credit;
  if (origin.stayStartDate !== null && origin.stayEndDate !== null) {
    return `Sobró del pago de su estadía del ${formatStay(origin.stayStartDate, origin.stayEndDate)}.`;
  }
  const month = origin.period === null ? 'su último mes' : monthName(origin.period);
  const ended =
    origin.contractEndedOn === null
      ? ''
      : `; su contrato terminó el ${formatDate(origin.contractEndedOn).replace(/ \d{4}$/, '')}`;
  return `Sobró del pago de ${month}${ended}.`;
}

// The movements (P-06, P-13).

export interface MovementRow {
  /** The kind and the id: an expense and a fine could share an id. */
  readonly key: string;
  readonly kind: Tab;
  readonly id: string;
  readonly title: string;
  readonly sub: string;
  readonly middle: string;
  readonly amount: string;
  readonly value: number;
  /** Only an expense is edited: a fine is deleted and registered again, a refund is not touched (RN-24). */
  readonly editable: boolean;
  readonly deletable: boolean;
  /** Says which movement the action is for: «Editar egreso Internet». */
  readonly name: string;
}

export function expenseRow(expense: Expense): MovementRow {
  const title = expense.description ?? CATEGORY_LABELS[expense.category];
  return {
    key: `EXP:${expense.id}`,
    kind: 'EXP',
    id: expense.id,
    title,
    sub: '',
    middle: CATEGORY_LABELS[expense.category],
    amount: formatMoney(expense.amount),
    value: expense.amount,
    editable: true,
    deletable: true,
    name: title,
  };
}

export function fineRow(fine: Fine): MovementRow {
  const name = guestName(fine.guestName);
  return {
    key: `FIN:${fine.id}`,
    kind: 'FIN',
    id: fine.id,
    title: name,
    sub: fine.environmentCode === null ? '' : `Ambiente ${fine.environmentCode}`,
    middle: fine.description ?? 'Sin motivo',
    amount: formatMoney(fine.amount),
    value: fine.amount,
    editable: false,
    deletable: true,
    name,
  };
}

export function refundRow(refund: Refund): MovementRow {
  const name = guestName(refund.guestName);
  const note = refund.note ? ` · ${refund.note}` : '';
  return {
    key: `REF:${refund.id}`,
    kind: 'REF',
    id: refund.id,
    title: name,
    sub: refund.environmentCode === null ? '' : `Ambiente ${refund.environmentCode}`,
    middle: `${formatDate(refund.date).replace(/ \d{4}$/, '')} · ${refund.method}${note}`,
    amount: formatMoney(refund.amount),
    value: refund.amount,
    editable: false,
    deletable: false,
    name,
  };
}

export type SortKey = 'title' | 'amount';
export type MovementSort = ListSort<SortKey>;
/** The biggest first: what weighs most on the balance. */
export const DEFAULT_SORT: MovementSort = { key: 'amount', direction: 'desc' };
export const PHONE_SORTS: readonly PhoneSort<SortKey>[] = [
  { key: 'amount', label: 'Monto, mayor primero' },
];

export const FIRST_COLUMN: Readonly<Record<Tab, string>> = {
  EXP: 'Egreso',
  FIN: 'Huésped',
  REF: 'Huésped',
};
export const MIDDLE_COLUMN: Readonly<Record<Tab, string>> = {
  EXP: 'Categoría',
  FIN: 'Motivo',
  REF: 'Fecha, medio y nota',
};

const byTitle = (a: MovementRow, b: MovementRow): number => COLLATOR.compare(a.title, b.title);

const COMPARE: Readonly<Record<SortKey, (a: MovementRow, b: MovementRow) => number>> = {
  title: byTitle,
  amount: (a, b) => a.value - b.value,
};

export function sortMovements(rows: readonly MovementRow[], sort: MovementSort): MovementRow[] {
  return [...rows].sort(compareBy(COMPARE, sort, byTitle));
}

// The notices (SRS 17).

export const LOAD_ERROR_TEXT = loadErrorText('Finanzas');
export const EXPENSE_CREATED_TEXT = 'Egreso registrado.';
export const EXPENSE_UPDATED_TEXT = 'Egreso actualizado. El neto se recalculó.';
export const EXPENSE_DELETED_TEXT = 'Egreso eliminado. El neto se recalculó.';
export const FINE_CREATED_TEXT = 'Multa registrada.';
export const FINE_DELETED_TEXT = 'Multa eliminada. El neto se recalculó.';

export function refundDoneText(name: string | null, month: string): string {
  return `Devolución a ${guestName(name)} registrada. El balance de ${monthName(month)} se recalculó.`;
}

export function emptyText(tab: Tab, month: string): { heading: string; text: string } {
  const name = monthName(month);
  switch (tab) {
    case 'EXP':
      return {
        heading: `No hay egresos en ${name}.`,
        text: 'Registra los recibos y compras del mes para ver el neto real.',
      };
    case 'FIN':
      return {
        heading: `No hay multas en ${name}.`,
        text: 'Las multas cuentan como ingreso del mes en que se registran.',
      };
    case 'REF':
      return {
        heading: `No hay devoluciones en ${name}.`,
        text: 'Cada devolución resta de los ingresos del mes en que se registra.',
      };
  }
}

/** The action of the header of the list: what to register in the kind that is shown. */
export const TAB_ACTIONS: Readonly<Record<Tab, string>> = {
  EXP: 'Nuevo egreso',
  FIN: 'Nueva multa',
  REF: 'Registrar devolución',
};

/** The label of a thing the dialogs of deleting say: «Mantenimiento y reparaciones · S/ 320.00». */
export function expenseDetail(expense: Expense): string {
  return `${CATEGORY_LABELS[expense.category]} · ${formatMoney(expense.amount)}`;
}

export function fineDetail(fine: Fine): string {
  return `${fine.description ?? 'Sin motivo'} · ${formatMoney(fine.amount)}`;
}

export function fineWho(fine: Fine): string {
  const place = fine.environmentCode === null ? '' : ` · ${fine.environmentCode}`;
  return `${guestName(fine.guestName)}${place}`;
}

/** What the dialog of deleting says (RN-24): what leaves the balance of the month and that it does not come back. */
export function deleteNotice(
  kind: 'EXP' | 'FIN',
  month: string,
): { readonly title: string; readonly text: string; readonly button: string } {
  const balance = `en el balance de ${monthPhrase(month)} y no se puede recuperar.`;
  return kind === 'EXP'
    ? {
        title: '¿Eliminar este egreso?',
        text: `Deja de restar ${balance} Si solo quieres cambiarlo, usa Editar.`,
        button: 'Eliminar egreso',
      }
    : {
        title: '¿Eliminar esta multa?',
        text: `Deja de sumar ${balance} Para corregirla, elimínala y regístrala de nuevo.`,
        button: 'Eliminar multa',
      };
}
