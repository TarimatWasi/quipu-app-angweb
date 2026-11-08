import type { operations } from '@core/api/bff.generated';
import { formatDate, formatMoney, periodLabel } from '@shared/payments/payment-format';
import { documentLabel } from '@shared/text/document-text';
import { COLLATOR, matchesAny } from '@shared/text/search';
import { compareBy } from '@shared/ui/data-table/list-sort';
import type { ListSort, PhoneSort } from '@shared/ui/data-table/list-sort';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';
import type { StatusSegment } from '@shared/ui/status-filter/status-filter.component';

/** «Cobros del mes» of A1 (P-05, P-06): the states, the filters, the order and the rows. */

export type AdminDashboard =
  operations['getAdminDashboard']['responses'][200]['content']['application/json'];
export type DashboardCharge = AdminDashboard['charges'][number];

/**
 * The four states of a charge. Rejected is a state of the payment, not of the charge (RN-05): the
 * charge stays unpaid or overdue and its row says so, so it is not one of these.
 */
export type ChargeState = 'PAID' | 'REVIEW' | 'UNPAID' | 'OVERDUE';

const STATE_OF: Readonly<Record<DashboardCharge['status'], ChargeState>> = {
  PAID: 'PAID',
  UNDER_REVIEW: 'REVIEW',
  UNPAID: 'UNPAID',
  OVERDUE: 'OVERDUE',
};

export const STATE_LABELS: Readonly<Record<ChargeState, string>> = {
  PAID: 'Al día',
  REVIEW: 'Pendiente de revisión',
  UNPAID: 'No pagado',
  OVERDUE: 'Atrasado',
};

const STATE_TONES: Readonly<Record<ChargeState, StatusTone>> = {
  PAID: 'paid',
  REVIEW: 'review',
  UNPAID: 'unpaid',
  OVERDUE: 'overdue',
};

/** What the bar and the tiles list, in order; the urgent order of the table is `URGENCY`. */
const BAR_ORDER: readonly ChargeState[] = ['PAID', 'REVIEW', 'UNPAID', 'OVERDUE'];
const URGENCY: Readonly<Record<ChargeState, number>> = {
  OVERDUE: 0,
  REVIEW: 1,
  UNPAID: 2,
  PAID: 3,
};

export const NO_ENVIRONMENT = 'Sin ambiente';

/** The button or link a row offers (P-06): what to do with that charge. */
export interface ChargeAction {
  readonly label: string;
  /** The primary one is «Revisar pago»; «Registrar pago» and «Corregir pago» are secondary. */
  readonly kind: 'primary' | 'secondary' | 'link';
  readonly link: readonly string[];
  readonly query: Readonly<Record<string, string>> | null;
}

export interface ChargeRow {
  readonly id: string;
  readonly name: string | null;
  /** «DNI 12345678». */
  readonly document: string;
  readonly typeLabel: 'Contrato' | 'Temporal';
  readonly environment: string;
  readonly period: string;
  /** Where its period starts: the order of the Período column. */
  readonly periodStart: string;
  readonly amount: number;
  readonly amountLabel: string;
  readonly dueDate: string;
  readonly dueLabel: string;
  readonly state: ChargeState;
  readonly stateLabel: string;
  readonly tone: StatusTone;
  /** The period has a rejected payment nobody corrected: «Pago rechazado» under its state. */
  readonly rejected: boolean;
  readonly action: ChargeAction;
  /** Says whose charge the action is for: the name, or the document while it has none. */
  readonly actionFor: string;
}

function actionOf(charge: DashboardCharge, state: ChargeState): ChargeAction {
  const paymentId = charge.paymentId;
  if (state === 'REVIEW' && paymentId !== null) {
    return {
      label: 'Revisar pago',
      kind: 'primary',
      link: ['/admin/payments', paymentId],
      query: { vista: 'por-revisar' },
    };
  }
  if ((state === 'UNPAID' || state === 'OVERDUE') && charge.paymentRejected && paymentId !== null) {
    return {
      label: 'Corregir pago',
      kind: 'secondary',
      link: ['/admin/payments', paymentId],
      query: { vista: 'rechazados' },
    };
  }
  if (state === 'UNPAID' || state === 'OVERDUE') {
    return {
      label: 'Registrar pago',
      kind: 'secondary',
      link: ['/admin/payments', 'new'],
      query: { guestId: charge.guestId },
    };
  }
  return {
    label: 'Ver huésped',
    kind: 'link',
    link: ['/admin/guests', charge.guestId],
    query: null,
  };
}

export function documentOf(
  charge: Pick<DashboardCharge, 'documentType' | 'documentNumber'>,
): string {
  return documentLabel(charge.documentType, charge.documentNumber);
}

export function toChargeRow(charge: DashboardCharge): ChargeRow {
  const state = STATE_OF[charge.status];
  const document = documentOf(charge);
  return {
    id: `${charge.contractId ?? charge.stayId ?? charge.guestId}:${charge.period ?? ''}`,
    name: charge.guestName,
    document,
    typeLabel: charge.guestType === 'CONTRACT' ? 'Contrato' : 'Temporal',
    environment: charge.environmentCode ?? NO_ENVIRONMENT,
    period: periodLabel(charge),
    periodStart: charge.period === null ? (charge.stayStartDate ?? '') : `${charge.period}-01`,
    amount: charge.amount,
    amountLabel: formatMoney(charge.amount),
    dueDate: charge.dueDate,
    dueLabel: formatDate(charge.dueDate),
    state,
    stateLabel: STATE_LABELS[state],
    tone: STATE_TONES[state],
    rejected: charge.paymentRejected && (state === 'UNPAID' || state === 'OVERDUE'),
    action: actionOf(charge, state),
    actionFor: charge.guestName ?? document,
  };
}

export type TypeFilter = 'ALL' | 'CONTRACT' | 'TEMPORARY';

export interface ChargeFilters {
  /** The state of the bar or the tile in force; null shows them all. */
  readonly state: ChargeState | null;
  readonly search: string;
  readonly type: TypeFilter;
}

export const NO_FILTERS: ChargeFilters = { state: null, search: '', type: 'ALL' };

export function hasFilters(filters: ChargeFilters): boolean {
  return filters.state !== null || filters.search.trim() !== '' || filters.type !== 'ALL';
}

export type ChargeSortKey = 'guest' | 'environment' | 'period' | 'amount' | 'due' | 'state';
export type ChargeSort = ListSort<ChargeSortKey>;

/** Urgent first: overdue, then under review, then unpaid, then up to date; earliest due first. */
export const DEFAULT_SORT: ChargeSort = { key: 'state', direction: 'asc' };

export const PHONE_SORTS: readonly PhoneSort<ChargeSortKey>[] = [
  { key: 'state', label: 'Estado (lo urgente primero)' },
  { key: 'due', label: 'Vence' },
  { key: 'guest', label: 'Huésped' },
  { key: 'environment', label: 'Ambiente' },
  { key: 'amount', label: 'Monto' },
];

const byName = (a: ChargeRow, b: ChargeRow): number =>
  COLLATOR.compare(a.name ?? a.document, b.name ?? b.document);

const COMPARE: Readonly<Record<ChargeSortKey, (a: ChargeRow, b: ChargeRow) => number>> = {
  guest: byName,
  environment: (a, b) => COLLATOR.compare(a.environment, b.environment),
  period: (a, b) => a.periodStart.localeCompare(b.periodStart),
  amount: (a, b) => a.amount - b.amount,
  due: (a, b) => a.dueDate.localeCompare(b.dueDate),
  state: (a, b) => URGENCY[a.state] - URGENCY[b.state] || a.dueDate.localeCompare(b.dueDate),
};

/** The rows the filters keep, in the order asked. */
export function visibleCharges(
  rows: readonly ChargeRow[],
  filters: ChargeFilters,
  sort: ChargeSort,
): ChargeRow[] {
  return rows
    .filter(
      (row) =>
        (filters.state === null || row.state === filters.state) &&
        (filters.type === 'ALL' ||
          (filters.type === 'CONTRACT') === (row.typeLabel === 'Contrato')) &&
        matchesAny([row.name ?? '', row.document, row.environment], filters.search),
    )
    .sort(compareBy(COMPARE, sort, byName));
}

/** The states present among the rows, with how many each has, for the bar and the tiles. */
export function segmentsOf(rows: readonly ChargeRow[]): StatusSegment[] {
  return BAR_ORDER.flatMap((state) => {
    const count = rows.filter((row) => row.state === state).length;
    return count === 0
      ? []
      : [{ key: state, label: STATE_LABELS[state], count, tone: STATE_TONES[state] }];
  });
}

export function isChargeState(key: string | null): key is ChargeState {
  return key !== null && key in STATE_LABELS;
}
