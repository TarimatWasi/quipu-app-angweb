import type { PeriodStatus } from '@core/api/clients/admin-guests.service';
import { formatDate, formatMoney, formatPeriod } from '@shared/payments/payment-format';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';

/** A3.2 «Pagos por mes» (RF-06, RF-10) as the canvas «HuespedDetalle» words it. */

export type PeriodState = PeriodStatus['status'];

export interface StateBadge {
  readonly label: string;
  readonly tone: StatusTone;
}

export const PERIOD_BADGES: Readonly<Record<PeriodState, StateBadge>> = {
  OVERDUE: { label: 'Atrasado', tone: 'overdue' },
  UNDER_REVIEW: { label: 'Pendiente de revisión', tone: 'review' },
  UNPAID: { label: 'No pagado', tone: 'unpaid' },
  PAID: { label: 'Pagado', tone: 'paid' },
};

/** The order of the states: what needs the administrator first (the canvas' default order). */
export const STATE_ORDER: readonly PeriodState[] = ['OVERDUE', 'UNDER_REVIEW', 'UNPAID', 'PAID'];

export const REJECTED_TEXT = 'Pago rechazado';

/** Where the action of a month or a stay goes: its payment (A5.2) or a direct payment (A5.1). */
export interface PaymentAction {
  readonly label: string;
  readonly link: readonly string[];
  readonly query: Readonly<Record<string, string>> | null;
}

/** «Registrar pago»: the direct payment of A5.1 with the guest already chosen. */
export function registerPayment(guestId: string): PaymentAction {
  return { label: 'Registrar pago', link: ['/admin/payments/new'], query: { guestId } };
}

/** An existing payment, opened in its review (A5.2). */
export function openPayment(label: string, paymentId: string): PaymentAction {
  return { label, link: ['/admin/payments', paymentId], query: null };
}

// With a payment, an unpaid or overdue state means it was rejected: it is corrected (RN-05, RN-15).
const WITH_PAYMENT: Readonly<Record<PeriodState, string>> = {
  UNDER_REVIEW: 'Revisar pago',
  PAID: 'Ver pago',
  UNPAID: 'Corregir pago',
  OVERDUE: 'Corregir pago',
};

/** The action of a payment state: its payment when it has one, else a direct payment. */
export function paymentAction(
  state: PeriodState,
  paymentId: string | null | undefined,
  guestId: string,
): PaymentAction | null {
  if (paymentId) return openPayment(WITH_PAYMENT[state], paymentId);
  // A month paid with credit alone has no payment to open (RN-38).
  return state === 'PAID' ? null : registerPayment(guestId);
}

export interface PeriodRow {
  /** The contract and the month: two contracts can charge the same month (a move mid-month). */
  readonly key: string;
  readonly period: string;
  /** «Octubre 2026». */
  readonly month: string;
  readonly dueDate: string;
  /** «5 oct 2026». */
  readonly due: string;
  readonly amountDue: number;
  readonly amount: string;
  readonly state: PeriodState;
  readonly badge: StateBadge;
  /** Its payment was rejected: «Pago rechazado» in red under the badge. */
  readonly rejected: boolean;
  readonly action: PaymentAction | null;
}

export function toPeriodRow(item: PeriodStatus, guestId: string): PeriodRow {
  const rejected =
    (item.status === 'UNPAID' || item.status === 'OVERDUE') && Boolean(item.paymentId);
  return {
    key: `${item.contractId}:${item.period}`,
    period: item.period,
    month: formatPeriod(item.period),
    dueDate: item.dueDate,
    due: formatDate(item.dueDate),
    amountDue: item.amountDue,
    amount: formatMoney(item.amountDue),
    state: item.status,
    badge: PERIOD_BADGES[item.status],
    rejected,
    action: paymentAction(item.status, item.paymentId, guestId),
  };
}

export type PeriodSortKey = 'month' | 'due' | 'amount' | 'state';
export type SortDirection = 'asc' | 'desc';

export interface PeriodSort {
  readonly key: PeriodSortKey;
  readonly direction: SortDirection;
}

/** By state (overdue first) and, within a state, the latest month first. */
export const DEFAULT_PERIOD_SORT: PeriodSort = { key: 'state', direction: 'asc' };

const COMPARE: Readonly<Record<PeriodSortKey, (a: PeriodRow, b: PeriodRow) => number>> = {
  month: (a, b) => a.period.localeCompare(b.period),
  due: (a, b) => a.dueDate.localeCompare(b.dueDate),
  amount: (a, b) => a.amountDue - b.amountDue,
  state: (a, b) => STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state),
};

/** The rows in the order asked; ties always go latest month first. */
export function sortPeriods(rows: readonly PeriodRow[], sort: PeriodSort): PeriodRow[] {
  const sign = sort.direction === 'asc' ? 1 : -1;
  const compare = COMPARE[sort.key];
  return [...rows].sort((a, b) => sign * compare(a, b) || b.period.localeCompare(a.period));
}

/** A header pressed: the same column turns around; another one starts ascending. */
export function nextPeriodSort(current: PeriodSort, key: PeriodSortKey): PeriodSort {
  if (current.key !== key) return { key, direction: 'asc' };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

/** How many months there are of each state present, in the order of the states. */
export function stateCounts(
  rows: readonly PeriodRow[],
): readonly { state: PeriodState; count: number }[] {
  return STATE_ORDER.map((state) => ({
    state,
    count: rows.filter((row) => row.state === state).length,
  })).filter((entry) => entry.count > 0);
}

/** «Mostrando 3 de 6 meses» (always the plural of the canvas, «1 mes» for one). */
export function showingText(shown: number, total: number): string {
  return `Mostrando ${String(shown)} de ${String(total)} ${total === 1 ? 'mes' : 'meses'}`;
}
