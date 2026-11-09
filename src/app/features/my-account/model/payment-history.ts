import type { components } from '@core/api/bff.generated';
import { creditBalanceText } from '@shared/payments/credit-texts';
import {
  formatDate,
  formatMoney,
  formatShortDate,
  limaDayOf,
  monthName,
  periodLabel,
  proofsSummary,
} from '@shared/payments/payment-format';
import { loadErrorText, noMatchHeading } from '@shared/text/list-text';
import { compareBy } from '@shared/ui/data-table/list-sort';
import type { ListSort, PhoneSort } from '@shared/ui/data-table/list-sort';
import type { EmptyText } from '@shared/ui/list-results/list-results.component';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_TONES } from './own-payment-labels';

type GuestHistoryItem = components['schemas']['GuestHistoryItem'];
type GuestPayment = components['schemas']['GuestPayment'];
type GuestProof = components['schemas']['GuestProof'];
type GuestRefund = components['schemas']['GuestRefund'];

/** H4 «Historial de pagos» (CU-19): what the guest reads of its own payments and refunds. */

export const LOAD_ERROR_TEXT = loadErrorText('tu historial');
export const NO_MATCH_HEADING = noMatchHeading('pago');
export const EMPTY: EmptyText = {
  heading: 'Aún no tienes pagos.',
  text: 'Cuando envíes uno, aquí verás su estado y lo que revisó la administración.',
};

export type HistoryState = 'APPROVED' | 'PENDING' | 'REJECTED' | 'REFUND';
export const REFUND_LABEL = 'Devuelto';

/** The «Estado» filter: it narrows what is already loaded. */
export const STATE_OPTIONS: readonly {
  readonly value: 'ALL' | HistoryState;
  readonly label: string;
}[] = [
  { value: 'ALL', label: 'Todos' },
  { value: 'APPROVED', label: PAYMENT_STATUS_LABELS.APPROVED },
  { value: 'PENDING', label: PAYMENT_STATUS_LABELS.PENDING },
  { value: 'REJECTED', label: PAYMENT_STATUS_LABELS.REJECTED },
  { value: 'REFUND', label: REFUND_LABEL },
];

export interface HistoryFilters {
  /** Unused here (the rows have no name to look for), but every list keeps it. */
  readonly search: string;
  readonly state: 'ALL' | HistoryState;
}

export const NO_FILTERS: HistoryFilters = { search: '', state: 'ALL' };

export function hasFilters(filters: HistoryFilters): boolean {
  return filters.state !== 'ALL';
}

export type SortKey = 'date' | 'amount';
export type HistorySort = ListSort<SortKey>;
/** The newest first is the order the BFF answers: ascending here means that. */
export const DEFAULT_SORT: HistorySort = { key: 'date', direction: 'asc' };
export const PHONE_SORTS: readonly PhoneSort<SortKey>[] = [
  { key: 'date', label: 'Más reciente primero' },
  { key: 'amount', label: 'Monto' },
];

export interface ProofLine {
  readonly kind: string;
  readonly detail: string;
  readonly amount: string;
  readonly note: string;
}

export interface EventLine {
  readonly date: string;
  readonly text: string;
}

export interface HistoryRow {
  readonly id: string;
  readonly state: HistoryState;
  /** The day it is ordered by (yyyy-mm-dd, Lima). */
  readonly day: string;
  readonly title: string;
  readonly sub: string;
  readonly what: string;
  readonly date: string;
  readonly amountValue: number;
  readonly amount: string;
  readonly amountNote: string;
  readonly badge: { readonly tone: StatusTone; readonly label: string };
  readonly reason: string | null;
  /** A rejected payment is corrected in H3; a pending one is only seen. */
  readonly fix: boolean;
  readonly view: boolean;
  /** Only a payment unfolds: its proofs and what happened. */
  readonly detail: boolean;
  readonly proofs: readonly ProofLine[];
  readonly outcome: string | null;
  readonly events: readonly EventLine[];
}

const REFUND_TONE: StatusTone = 'unpaid';

function dayOf(instant: string): string {
  return limaDayOf(instant) ?? instant.slice(0, 10);
}

function totalOf(payment: GuestPayment): number {
  return payment.status === 'APPROVED'
    ? (payment.verifiedAmount ?? payment.amount)
    : payment.amount;
}

function proofLine(proof: GuestProof, firstDay: string): ProofLine {
  const method = proof.method ? ` · ${proof.method}` : '';
  const addedLater =
    dayOf(proof.addedAt) !== firstDay ? ` el ${formatShortDate(dayOf(proof.addedAt))}` : '';
  const received = proof.receivedOn ? ` · recibido el ${formatShortDate(proof.receivedOn)}` : '';
  const who = proof.uploadedBy === 'GUEST' ? 'Subido por ti' : 'Registrado por la administración';
  const corrected = proof.verifiedAmount !== null && proof.verifiedAmount !== proof.declaredAmount;
  let note = 'por revisar';
  if (corrected) note = `declaraste ${formatMoney(proof.declaredAmount)}`;
  else if (proof.verifiedAmount !== null) note = 'verificado';
  return {
    kind: proof.kind === 'VOUCHER' ? `Voucher${method}` : 'Efectivo, sin voucher',
    detail: `${who}${addedLater}${received}`,
    amount: formatMoney(proof.verifiedAmount ?? proof.declaredAmount),
    note,
  };
}

function withStop(text: string): string {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function outcomeOf(payment: GuestPayment, refund: GuestRefund | undefined): string | null {
  const parts: string[] = [];
  const { surplus } = payment;
  if (surplus) {
    const money = formatMoney(surplus.amount);
    if (surplus.outcome === 'CREDIT') parts.push(`Sobraron ${money}: quedan a tu favor.`);
    else if (surplus.outcome === 'REFUND_PENDING') {
      parts.push(`Sobraron ${money}: te los devolveremos.`);
    } else {
      const when = refund ? ` el ${formatShortDate(refund.date)} por ${refund.method}` : '';
      parts.push(`Sobraron ${money}: Quipu te los devolvió${when}.`);
    }
  }
  if (payment.creditApplied > 0) {
    parts.push(`Se descontaron ${formatMoney(payment.creditApplied)} que tenías a favor.`);
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

/** What happened to a payment, oldest first: sent, proofs added, each review and the refund. */
function eventsOf(payment: GuestPayment, refund: GuestRefund | undefined): EventLine[] {
  const proofs = [...payment.proofs].sort((a, b) => a.addedAt.localeCompare(b.addedAt));
  const first = proofs[0];
  const registeredByAdmin = first?.uploadedBy === 'ADMIN';
  const firstDay = dayOf(first?.addedAt ?? payment.submittedAt);
  const events: { at: string; text: string }[] = [];
  if (!registeredByAdmin) events.push({ at: payment.submittedAt, text: 'Enviaste el pago.' });
  for (const proof of proofs) {
    if (
      proof.uploadedBy === 'GUEST' &&
      proof.kind === 'VOUCHER' &&
      dayOf(proof.addedAt) !== firstDay
    ) {
      events.push({
        at: proof.addedAt,
        text: `Agregaste un voucher de ${formatMoney(proof.declaredAmount)}.`,
      });
    }
  }
  for (const review of payment.reviews) {
    let text = 'La administración lo aprobó.';
    if (review.decision === 'REJECTED') {
      text = review.reason
        ? `La administración lo rechazó: ${withStop(review.reason)}`
        : 'La administración lo rechazó.';
    } else if (registeredByAdmin) {
      text = 'La administración registró tu pago y lo aprobó.';
    }
    events.push({ at: review.at, text });
  }
  if (refund) {
    events.push({
      // A refund only knows its day: it goes after what happened that day.
      at: `${refund.date}T23:59:59Z`,
      text: `Quipu te devolvió ${formatMoney(refund.amount)} por ${refund.method}.`,
    });
  }
  // The full instants order them: two things on the same day keep the order they happened in.
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  return events.map((event) => ({ date: formatShortDate(dayOf(event.at)), text: event.text }));
}

function paymentRow(payment: GuestPayment, refund: GuestRefund | undefined): HistoryRow {
  const vouchers = payment.proofs.filter((proof) => proof.kind === 'VOUCHER').length;
  const cash = payment.proofs.length - vouchers > 0;
  const day = dayOf(payment.submittedAt);
  const firstDay = dayOf(
    [...payment.proofs].sort((a, b) => a.addedAt.localeCompare(b.addedAt))[0]?.addedAt ??
      payment.submittedAt,
  );
  const byAdmin = payment.proofs[0]?.uploadedBy === 'ADMIN';
  const amountValue = totalOf(payment);
  return {
    id: payment.id,
    state: payment.status,
    day,
    title: periodLabel({
      period: payment.period,
      stayStartDate: payment.stayStartDate ?? null,
      stayEndDate: payment.stayEndDate ?? null,
    }),
    sub: byAdmin ? 'Registrado por la administración' : 'Enviado por ti',
    what: proofsSummary(vouchers, cash),
    date: formatDate(day),
    amountValue,
    amount: formatMoney(amountValue),
    amountNote: payment.status === 'APPROVED' ? 'verificado' : 'enviado',
    badge: {
      tone: PAYMENT_STATUS_TONES[payment.status],
      label: PAYMENT_STATUS_LABELS[payment.status],
    },
    reason: payment.status === 'REJECTED' ? (payment.rejectionReason ?? null) : null,
    fix: payment.status === 'REJECTED',
    view: payment.status === 'PENDING',
    detail: true,
    proofs: payment.proofs.map((proof) => proofLine(proof, firstDay)),
    outcome: outcomeOf(payment, refund),
    events: eventsOf(payment, refund),
  };
}

function refundRow(refund: GuestRefund): HistoryRow {
  const month = refund.fromPeriod ? monthName(refund.fromPeriod) : null;
  return {
    id: `refund-${refund.id}`,
    state: 'REFUND',
    day: refund.date,
    title: 'Devolución de Quipu',
    sub: month ? `Sobró de ${month}` : 'Sobró de un pago',
    what: `Por ${refund.method}`,
    date: formatDate(refund.date),
    amountValue: refund.amount,
    amount: formatMoney(refund.amount),
    amountNote: 'te devolvimos',
    badge: { tone: REFUND_TONE, label: REFUND_LABEL },
    reason: null,
    fix: false,
    view: false,
    detail: false,
    proofs: [],
    outcome: null,
    events: [],
  };
}

/** The rows of the loaded items: each payment with the refund that came out of it, and the refunds as rows of their own (RN-39). */
export function toRows(items: readonly GuestHistoryItem[]): HistoryRow[] {
  const refunds = new Map<string, GuestRefund>();
  for (const item of items) {
    if (item.kind === 'REFUND' && item.refund) refunds.set(item.refund.fromPaymentId, item.refund);
  }
  const rows: HistoryRow[] = [];
  for (const item of items) {
    if (item.kind === 'PAYMENT' && item.payment) {
      rows.push(paymentRow(item.payment, refunds.get(item.payment.id)));
    } else if (item.kind === 'REFUND' && item.refund) {
      rows.push(refundRow(item.refund));
    }
  }
  return rows;
}

const COMPARE: Readonly<Record<SortKey, (a: HistoryRow, b: HistoryRow) => number>> = {
  date: (a, b) => b.day.localeCompare(a.day),
  amount: (a, b) => a.amountValue - b.amountValue,
};

/** The rows the state filter keeps, in the order asked. */
export function visibleRows(
  rows: readonly HistoryRow[],
  filters: HistoryFilters,
  sort: HistorySort,
): HistoryRow[] {
  return rows
    .filter((row) => filters.state === 'ALL' || row.state === filters.state)
    .sort(compareBy(COMPARE, sort, COMPARE.date));
}

/** The notice of the credit in favor (RN-38), or null when there is none. */
export function creditHeading(balance: number): string | null {
  return balance > 0 ? creditBalanceText(balance) : null;
}
