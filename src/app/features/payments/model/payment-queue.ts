import { loadErrorText, noMatchHeading } from '@shared/text/list-text';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';
import type { PeriodFields } from '@shared/payments/payment-format';
import {
  daysAgo,
  formatDateTime,
  formatStay,
  periodLabel,
  proofsSummary,
} from '@shared/payments/payment-format';
import { COLLATOR, matchesAny } from '@shared/text/search';
import { compareBy } from '@shared/ui/data-table/list-sort';
import type { ListSort, PhoneSort } from '@shared/ui/data-table/list-sort';
import type { components } from '@core/api/bff.generated';
import type { QueueViewParam } from './queue-views';

/** A5 «Pagos», as the canvas words it (Cola), Spanish only (QP-ANGWEB-LNG-01). */

// Every type comes from the contract (TAR-23).
type PaymentQueueItem = components['schemas']['PaymentQueueItem'];
type PaymentStatus = PaymentQueueItem['status'];

/** What «Lo que toca ahora» of A5 counts over every page, not only over the loaded one. */
export interface QueueSummary {
  readonly pendingTotal: number;
  /** The payment that has waited longest for its review, or null when none waits. */
  readonly oldestPending: PaymentQueueItem | null;
  readonly rejected: components['schemas']['DashboardRejected'];
}

export const LOAD_ERROR_TEXT = loadErrorText('la cola de pagos');
export const NO_MATCH_HEADING = noMatchHeading('pago');

/** A view of the queue: its tab, how it travels in the address and what it says when empty. */
export interface QueueView {
  readonly status: PaymentStatus;
  readonly label: string;
  /** Value of `?vista=`, so «Volver a Pagos» comes back to the same view. */
  readonly param: QueueViewParam;
  readonly emptyHeading: string;
  readonly emptyText: string;
}

export const QUEUE_VIEWS: readonly [QueueView, ...QueueView[]] = [
  {
    status: 'PENDING',
    label: 'Por revisar',
    param: 'por-revisar',
    emptyHeading: 'No hay pagos por revisar.',
    emptyText: 'Puedes registrar un pago directo si el huésped te pagó en persona.',
  },
  {
    status: 'APPROVED',
    label: 'Aprobados',
    param: 'aprobados',
    emptyHeading: 'Aún no hay pagos aprobados.',
    emptyText: 'Aparecerán aquí cuando revises un pago.',
  },
  {
    status: 'REJECTED',
    label: 'Rechazados',
    param: 'rechazados',
    emptyHeading: 'No hay pagos rechazados.',
    emptyText: 'Aparecerán aquí cuando revises un pago.',
  },
];

export type TypeFilter = 'ALL' | PaymentQueueItem['guestType'];

/** The filters of A5 work on what is loaded, in the page: they never go to the BFF. */
export interface QueueFilters {
  readonly search: string;
  readonly type: TypeFilter;
}

export const NO_FILTERS: QueueFilters = { search: '', type: 'ALL' };

export function hasFilters(filters: QueueFilters): boolean {
  return filters.search.trim() !== '' || filters.type !== 'ALL';
}

export type SortKey = 'guest' | 'environment' | 'period' | 'submitted' | 'proofs';
export type QueueSort = ListSort<SortKey>;

/** As the BFF sends it: the one sent longest ago first. */
export const DEFAULT_SORT: QueueSort = { key: 'submitted', direction: 'asc' };

/** The orders a phone offers in «Ordenar por», where the table has its sortable headers. */
export const PHONE_SORTS: readonly PhoneSort<SortKey>[] = [
  { key: 'submitted', label: 'Subido, más antiguo primero' },
  { key: 'guest', label: 'Huésped' },
  { key: 'environment', label: 'Ambiente' },
];

const TYPE_LABELS: Readonly<Record<PaymentQueueItem['guestType'], string>> = {
  CONTRACT: 'Contrato',
  TEMPORARY: 'Temporal',
};

/** «Buscar» over what is loaded: the name, the document and the environment. */
export function matchesQueueSearch(item: PaymentQueueItem, search: string): boolean {
  return matchesAny(
    [item.guestName ?? '', item.documentNumber, item.environmentCode ?? ''],
    search,
  );
}

/** A guest without a name yet goes after the named ones, by its document. */
function byGuest(a: PaymentQueueItem, b: PaymentQueueItem): number {
  if (a.guestName !== null && b.guestName !== null)
    return COLLATOR.compare(a.guestName, b.guestName);
  if (a.guestName !== b.guestName) return a.guestName === null ? 1 : -1;
  return COLLATOR.compare(a.documentNumber, b.documentNumber);
}

/** A payment without environment (an old stay) goes last. */
function byEnvironment(a: PaymentQueueItem, b: PaymentQueueItem): number {
  const first = a.environmentCode;
  const second = b.environmentCode;
  if (first !== null && second !== null) return COLLATOR.compare(first, second);
  if (first === second) return 0;
  return first === null ? 1 : -1;
}

/** A month («2026-09») or the first day of a stay («2026-10-20»): both order as text. */
function periodKey(item: PaymentQueueItem): string {
  return item.period ?? item.stayStartDate ?? '';
}

const COMPARE: Readonly<Record<SortKey, (a: PaymentQueueItem, b: PaymentQueueItem) => number>> = {
  guest: byGuest,
  environment: byEnvironment,
  period: (a, b) => periodKey(a).localeCompare(periodKey(b)),
  submitted: (a, b) => Date.parse(a.submittedAt) - Date.parse(b.submittedAt),
  proofs: (a, b) => a.voucherCount - b.voucherCount || Number(a.hasCash) - Number(b.hasCash),
};

/** The order of a column, the time it was sent breaking the ties of every other column. */
export function compareQueue(
  sort: QueueSort,
): (a: PaymentQueueItem, b: PaymentQueueItem) => number {
  return compareBy(COMPARE, sort, COMPARE.submitted);
}

/** The payments on screen: the loaded ones that match the filters, in the chosen order. */
export function visiblePayments(
  items: readonly PaymentQueueItem[],
  filters: QueueFilters,
  sort: QueueSort,
): PaymentQueueItem[] {
  return items
    .filter(
      (item) =>
        (filters.type === 'ALL' || item.guestType === filters.type) &&
        matchesQueueSearch(item, filters.search),
    )
    .sort(compareQueue(sort));
}

const BADGES: Readonly<
  Record<PaymentStatus, { readonly label: string; readonly tone: StatusTone }>
> = {
  PENDING: { label: 'Pendiente de revisión', tone: 'review' },
  APPROVED: { label: 'Aprobado', tone: 'paid' },
  REJECTED: { label: 'Rechazado', tone: 'rejected' },
};

const ACTIONS: Readonly<Record<PaymentStatus, string>> = {
  PENDING: 'Revisar pago',
  APPROVED: 'Ver pago',
  REJECTED: 'Corregir pago',
};

const RESOLVED_BY: Readonly<Record<PaymentStatus, string>> = {
  PENDING: '',
  APPROVED: 'Aprobado por',
  REJECTED: 'Rechazado por',
};

/** One payment as the table and the cards of A5 show it; the amount is compared in A5.2. */
export interface QueueRow {
  readonly id: string;
  /** null until the guest completes its data («Sin nombre»). */
  readonly name: string | null;
  readonly document: string;
  readonly type: string;
  readonly environment: string;
  readonly period: string;
  readonly submitted: string;
  /** «hace 3 días», or «rechazado hace 24 días» in «Rechazados»; null without a valid instant. */
  readonly ago: string | null;
  /** «Motivo: No se lee el voucher.» of a rejected payment (TAR-296); null otherwise. */
  readonly reason: string | null;
  readonly proofs: string;
  readonly badge: { readonly label: string; readonly tone: StatusTone };
  /** «Aprobado por Rosa Quispe» once resolved (TAR-230); null while pending. */
  readonly resolvedBy: string | null;
  readonly action: string;
  /** What the action says to a screen reader: whose payment it opens, by name or document. */
  readonly actionName: string;
  /** «Revisar pago» and «Corregir pago» are the primary action of the row; «Ver pago» a link. */
  readonly primary: boolean;
}

/** How long ago it was sent or, once rejected, how long ago it was rejected (tablero Cola). */
function agoText(item: PaymentQueueItem, now: Date): string | null {
  if (item.status === 'REJECTED' && item.reviewedAt) {
    const ago = daysAgo(item.reviewedAt, now);
    return ago === null ? null : `rechazado ${ago}`;
  }
  return daysAgo(item.submittedAt, now);
}

export function toQueueRow(item: PaymentQueueItem, now: Date): QueueRow {
  const reviewer = item.reviewedBy?.name;
  return {
    id: item.id,
    name: item.guestName,
    document: item.documentNumber,
    type: TYPE_LABELS[item.guestType],
    environment: item.environmentCode ?? '—',
    period: periodLabel(item),
    submitted: formatDateTime(item.submittedAt),
    ago: agoText(item, now),
    reason:
      item.status === 'REJECTED' && item.rejectionReason ? `Motivo: ${item.rejectionReason}` : null,
    proofs: proofsSummary(item.voucherCount, item.hasCash),
    badge: BADGES[item.status],
    resolvedBy: reviewer ? `${RESOLVED_BY[item.status]} ${reviewer}` : null,
    action: ACTIONS[item.status],
    actionName: `${ACTIONS[item.status]} de ${item.guestName ?? item.documentNumber}`,
    primary: item.status !== 'APPROVED',
  };
}

/** «Lo que toca ahora» of A5: the figure, what it counts, its context and the oldest to open. */
export interface QueueNowPanel {
  readonly figure: number;
  readonly label: string;
  readonly text: string;
  /** «Revisar el más antiguo» or «Corregir el más antiguo», with the payment it opens. */
  readonly action: { readonly label: string; readonly paymentId: string } | null;
}

/** «septiembre 2026» for a month, «estadía del 20 – 31 oct» for a stay. */
function periodPhrase(item: PeriodFields): string {
  if (item.period !== null) return periodLabel(item).toLowerCase();
  if (item.stayStartDate !== null && item.stayEndDate !== null) {
    return `estadía del ${formatStay(item.stayStartDate, item.stayEndDate)}`;
  }
  return 'sin período';
}

function whoseText(name: string | null, document?: string): string {
  if (name !== null) return name;
  return document ? `el documento ${document}` : 'un huésped sin nombre aún';
}

function pendingPanel(summary: QueueSummary, now: Date): QueueNowPanel {
  const total = summary.pendingTotal;
  const oldest = summary.oldestPending;
  const label = total === 1 ? 'pago por revisar' : 'pagos por revisar';
  if (total <= 0 || oldest === null) {
    return {
      figure: 0,
      label,
      text: 'No hay pagos esperando. Cuando un huésped envíe uno, aparecerá aquí.',
      action: null,
    };
  }
  const ago = daysAgo(oldest.submittedAt, now);
  const who = whoseText(oldest.guestName, oldest.documentNumber);
  return {
    figure: total,
    label,
    text: `El más antiguo es de ${who} (${periodPhrase(oldest)})${ago ? `, subido ${ago}` : ''}.`,
    action: { label: 'Revisar el más antiguo', paymentId: oldest.id },
  };
}

function rejectedPanel(summary: QueueSummary, now: Date): QueueNowPanel {
  const { count, oldest } = summary.rejected;
  const label = count === 1 ? 'pago rechazado sin corregir' : 'pagos rechazados sin corregir';
  if (count <= 0 || oldest === null) {
    return { figure: 0, label, text: 'Ningún pago rechazado espera corrección.', action: null };
  }
  const ago = daysAgo(oldest.rejectedAt, now);
  const how =
    'El huésped los corrige y los envía de nuevo; si te pagó la diferencia en persona, agrégala tú y apruébalo.';
  const which = `El más antiguo es el de ${whoseText(oldest.guestName)} (${periodPhrase(oldest)})${ago ? `, rechazado ${ago}` : ''}.`;
  return {
    figure: count,
    label,
    text: `${how} ${which}`,
    action: { label: 'Corregir el más antiguo', paymentId: oldest.paymentId },
  };
}

/** The panel of «Por revisar» and «Rechazados»; «Aprobados» has nothing left to do. */
export function queueNowPanel(
  status: PaymentStatus,
  summary: QueueSummary,
  now: Date,
): QueueNowPanel | null {
  if (status === 'PENDING') return pendingPanel(summary, now);
  if (status === 'REJECTED') return rejectedPanel(summary, now);
  return null;
}
