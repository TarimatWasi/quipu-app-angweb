import type { components } from '@core/api/bff.generated';
import { daysFromToday, formatDate, formatMoney } from '@shared/payments/payment-format';
import { documentLabel } from '@shared/text/document-text';
import { environmentLabel } from '@shared/text/environment-text';
import { guestName } from '@shared/text/guest-text';
import { COLLATOR, matchesAny } from '@shared/text/search';
import { compareBy } from '@shared/ui/data-table/list-sort';
import type { ListSort, PhoneSort } from '@shared/ui/data-table/list-sort';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';

/** The contracts of A4 as the screens show them: what each one says and how the list is kept. */

export type Contract = components['schemas']['Contract'];
export type ContractSummary = components['schemas']['ContractSummary'];
export type ContractPage = components['schemas']['PagedContracts'];
export type ContractStatus = ContractSummary['status'];

export const VIEWS: readonly ContractStatus[] = ['ACTIVE', 'EXPIRED', 'TERMINATED'];

export const VIEW_LABELS: Readonly<Record<ContractStatus, string>> = {
  ACTIVE: 'Vigentes',
  EXPIRED: 'Vencidos',
  TERMINATED: 'Finalizados',
};

/** What a contract is today: the BFF derives it from the dates (RN-07); «Próximo a vencer» is a Vigente. */
export type ContractState = ContractStatus | 'SOON';

export interface StateBadge {
  readonly label: string;
  readonly tone: StatusTone;
}

export const STATE_BADGES: Readonly<Record<ContractState, StateBadge>> = {
  ACTIVE: { label: 'Vigente', tone: 'paid' },
  SOON: { label: 'Próximo a vencer', tone: 'review' },
  EXPIRED: { label: 'Vencido', tone: 'unpaid' },
  TERMINATED: { label: 'Finalizado', tone: 'unpaid' },
};

export function stateOf(contract: Pick<ContractSummary, 'status' | 'expiringSoon'>): ContractState {
  return contract.status === 'ACTIVE' && contract.expiringSoon ? 'SOON' : contract.status;
}

/** «Sin fecha de fin» of a contract that stays until it is finalized (RN-07). */
export const OPEN_ENDED = 'sin fecha de fin';

/** «1 mar 2026 – 28 feb 2027», or «1 nov 2025 – sin fecha de fin». */
export function rangeText(startDate: string, endDate: string | null | undefined): string {
  return `${formatDate(startDate)} – ${endDate ? formatDate(endDate) : OPEN_ENDED}`;
}

/** «vence en 5 días», «venció el 31 ago 2026», «finalizado el 15 oct 2026», «contrato abierto». */
export function rangeNote(contract: ContractSummary, now: Date): string {
  if (contract.status === 'TERMINATED') {
    return contract.terminatedAt ? `finalizado el ${formatDate(contract.terminatedAt)}` : '';
  }
  if (!contract.endDate) return 'contrato abierto';
  if (contract.status === 'EXPIRED') return `venció el ${formatDate(contract.endDate)}`;
  const days = daysFromToday(contract.endDate, now);
  if (!contract.expiringSoon || days === null) return '';
  if (days === 0) return 'vence hoy';
  return days === 1 ? 'vence mañana' : `vence en ${String(days)} días`;
}

export interface ContractRow {
  readonly id: string;
  readonly name: string;
  readonly documentNumber: string;
  readonly document: string;
  readonly environmentCode: string;
  readonly environment: string;
  readonly fee: string;
  readonly feeAmount: number;
  readonly paymentDay: number;
  readonly range: string;
  readonly note: string;
  /** For the order: an open-ended contract goes after the ones that end. */
  readonly endDate: string;
  readonly state: ContractState;
  readonly badge: StateBadge;
  /** Says which contract the link is for: «Ver contrato de Lucía Paredes». */
  readonly viewName: string;
}

export function toRow(contract: ContractSummary, now: Date): ContractRow {
  const name = guestName(contract.guestName);
  const state = stateOf(contract);
  return {
    id: contract.id,
    name,
    documentNumber: contract.documentNumber,
    document: documentLabel(contract.documentType, contract.documentNumber),
    environmentCode: contract.environmentCode,
    environment: environmentLabel(contract.environmentType, contract.environmentCode),
    fee: formatMoney(contract.monthlyAmount),
    feeAmount: contract.monthlyAmount,
    paymentDay: contract.paymentDay,
    range: rangeText(contract.startDate, contract.endDate),
    note: rangeNote(contract, now),
    endDate: contract.endDate ?? '9999-12-31',
    state,
    badge: STATE_BADGES[state],
    viewName: `Ver contrato de ${name}`,
  };
}

export type SoonFilter = 'ALL' | 'SOON';

export interface ContractFilters {
  readonly search: string;
  readonly soon: SoonFilter;
}

export const NO_FILTERS: ContractFilters = { search: '', soon: 'ALL' };

export function hasFilters(filters: ContractFilters): boolean {
  return filters.search.trim() !== '' || filters.soon !== 'ALL';
}

export type SortKey = 'name' | 'environment' | 'fee' | 'end' | 'state';
export type ContractSort = ListSort<SortKey>;
export const DEFAULT_SORT: ContractSort = { key: 'end', direction: 'asc' };

export const PHONE_SORTS: readonly PhoneSort<SortKey>[] = [
  { key: 'end', label: 'Vence primero' },
  { key: 'name', label: 'Huésped' },
  { key: 'environment', label: 'Ambiente' },
  { key: 'fee', label: 'Cuota' },
];

const byEnd = (a: ContractRow, b: ContractRow): number =>
  a.endDate.localeCompare(b.endDate) || COLLATOR.compare(a.name, b.name);

const COMPARE: Readonly<Record<SortKey, (a: ContractRow, b: ContractRow) => number>> = {
  name: (a, b) => COLLATOR.compare(a.name, b.name),
  environment: (a, b) => COLLATOR.compare(a.environmentCode, b.environmentCode),
  fee: (a, b) => a.feeAmount - b.feeAmount,
  end: byEnd,
  // The ones about to end first, then the rest.
  state: (a, b) => Number(b.state === 'SOON') - Number(a.state === 'SOON'),
};

/** The rows the filters keep, in the order asked; the search is on the guest, document and environment. */
export function visibleContracts(
  rows: readonly ContractRow[],
  filters: ContractFilters,
  sort: ContractSort,
): ContractRow[] {
  return rows
    .filter(
      (row) =>
        (filters.soon === 'ALL' || row.state === 'SOON') &&
        matchesAny([row.name, row.documentNumber, row.environmentCode], filters.search),
    )
    .sort(compareBy(COMPARE, sort, byEnd));
}

export function countText(shown: number, loaded: number): string {
  return `Mostrando ${String(shown)} de ${String(loaded)} cargados`;
}

/** «Lo que toca ahora» of A4: the contracts about to end and what to do about them. */
export interface SoonPanel {
  readonly figure: number;
  readonly label: string;
  readonly text: string;
  /** The contract to open when there is one; with several, the action filters the list. */
  readonly only: string | null;
  readonly action: string;
}

/** «31 mar», without the year: the panel speaks of this year. */
function shortDate(isoDate: string): string {
  return formatDate(isoDate).replace(/ \d{4}$/, '');
}

export function soonPanel(soon: readonly ContractSummary[]): SoonPanel {
  const [first] = soon;
  if (first === undefined) {
    return {
      figure: 0,
      label: 'contratos por vencer',
      text: 'Ningún contrato vence pronto.',
      only: null,
      action: '',
    };
  }
  const names = soon.map(
    (contract) =>
      `${guestName(contract.guestName)} (${environmentLabel(contract.environmentType, contract.environmentCode).toLowerCase()}) vence el ${shortDate(contract.endDate ?? '')}`,
  );
  return {
    figure: soon.length,
    label: soon.length === 1 ? 'contrato por vencer' : 'contratos por vencer',
    text: `${names.join('; ')}. Conversa con el huésped para renovarlo o finalizarlo.`,
    only: soon.length === 1 ? first.id : null,
    action: soon.length === 1 ? 'Ver contrato' : 'Ver por vencer',
  };
}

// The notices.

export const LOAD_ERROR_TEXT = 'No se pudieron cargar los contratos.';
export const NO_MATCH_HEADING = 'Ningún contrato coincide con los filtros.';
export const CREATED_TEXT = 'Contrato cargado.';

export function emptyText(status: ContractStatus): { heading: string; text: string } {
  switch (status) {
    case 'ACTIVE':
      return {
        heading: 'Aún no hay contratos vigentes.',
        text: 'Carga el primero con el PDF firmado: elige al huésped y su ambiente.',
      };
    case 'EXPIRED':
      return {
        heading: 'No hay contratos vencidos.',
        text: 'Un contrato vence solo al pasar su fecha de fin y libera su ambiente.',
      };
    case 'TERMINATED':
      return {
        heading: 'No hay contratos finalizados.',
        text: 'Un contrato que finalices aparecerá aquí, con sus pagos.',
      };
  }
}
