import type { components, operations } from '@core/api/bff.generated';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';
import { documentText, GUEST_STATUS_BADGES, GUEST_TYPE_LABELS } from './guest-texts';
import type { Tone } from './guest-texts';
import { accessText, environmentText } from './guest-list-texts';
import type { AccessText, EnvironmentText } from './guest-list-texts';

// Every type comes from the contract (TAR-23).
export type GuestSummary = components['schemas']['GuestSummary'];
export type GuestPage = components['schemas']['PagedGuests'];
export type GuestStatus = components['schemas']['GuestStatus'];
type ListQuery = NonNullable<operations['listGuests']['parameters']['query']>;
export type ListStatus = NonNullable<ListQuery['status']>;
export type GuestType = GuestSummary['type'];

/** The two lists of A3: the guests of today (every one but the inactive) and the inactive ones. */
export type GuestView = 'CURRENT' | 'INACTIVE';
export type TypeFilter = 'ALL' | GuestType;
/** «Estado» only exists in «Actuales»: an inactive guest has one state. */
export type StateFilter = 'ALL' | Exclude<GuestStatus, 'INACTIVE'>;

/** The filters of A3. `search` stays in the page: it never goes to the BFF nor to the address. */
export interface GuestFilters {
  readonly search: string;
  readonly type: TypeFilter;
  readonly state: StateFilter;
}

export const NO_FILTERS: GuestFilters = { search: '', type: 'ALL', state: 'ALL' };

export type SortKey = 'guest' | 'type' | 'environment' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface GuestSort {
  readonly key: SortKey;
  readonly direction: SortDirection;
}

/** «Sin activar primero»: by state (pending, onboarding, active, inactive), then by name. */
export const DEFAULT_SORT: GuestSort = { key: 'status', direction: 'asc' };

/** The orders a phone offers in «Ordenar por», where the table has its sortable headers. */
export const PHONE_SORTS: readonly { readonly key: SortKey; readonly label: string }[] = [
  { key: 'status', label: 'Sin activar primero' },
  { key: 'guest', label: 'Nombre' },
  { key: 'environment', label: 'Ambiente' },
];

/** Guests asked per page; «Mostrar más» asks the next one with the cursor of the BFF. */
export const GUEST_PAGE_SIZE = 20;

/** What the BFF is asked: the view, and the type and state filters it knows how to apply. */
export interface GuestQuery {
  readonly status: ListStatus;
  readonly type: GuestType | null;
}

export function guestQuery(view: GuestView, filters: GuestFilters): GuestQuery {
  const type = filters.type === 'ALL' ? null : filters.type;
  if (view === 'INACTIVE') return { status: 'INACTIVE', type };
  return { status: filters.state === 'ALL' ? 'CURRENT' : filters.state, type };
}

export function sameQuery(a: GuestQuery, b: GuestQuery): boolean {
  return a.status === b.status && a.type === b.type;
}

/** Whether any filter narrows the list, so «Quitar filtros» makes sense. */
export function hasFilters(filters: GuestFilters): boolean {
  return filters.search.trim() !== '' || filters.type !== 'ALL' || filters.state !== 'ALL';
}

/** Lower case and without accents, so «huaman» finds «Huamán». */
function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** «Buscar» over what is loaded: the name, the document and the environment. */
export function matchesSearch(guest: GuestSummary, search: string): boolean {
  const wanted = fold(search.trim());
  if (wanted === '') return true;
  const environment = environmentText(guest);
  const haystack = [
    guest.name ?? '',
    documentText(guest),
    guest.environment?.code ?? '',
    environment.main,
  ];
  return haystack.some((text) => fold(text).includes(wanted));
}

const STATUS_RANK: Readonly<Record<GuestStatus, number>> = {
  PENDING_ACTIVATION: 0,
  ONBOARDING: 1,
  ACTIVE: 2,
  INACTIVE: 3,
};

const COLLATOR = new Intl.Collator('es', { sensitivity: 'base', numeric: true });

/** By name; a guest without a name yet goes after the named ones, by its document. */
function byName(a: GuestSummary, b: GuestSummary): number {
  if (a.name !== null && b.name !== null) return COLLATOR.compare(a.name, b.name);
  if (a.name !== b.name) return a.name === null ? 1 : -1;
  return COLLATOR.compare(documentText(a), documentText(b));
}

/** By the code of the environment; a guest without one goes last. */
function byEnvironment(a: GuestSummary, b: GuestSummary): number {
  const first = a.environment?.code ?? null;
  const second = b.environment?.code ?? null;
  if (first !== null && second !== null) return COLLATOR.compare(first, second);
  if (first === second) return 0;
  return first === null ? 1 : -1;
}

const COMPARE: Readonly<Record<SortKey, (a: GuestSummary, b: GuestSummary) => number>> = {
  guest: byName,
  type: (a, b) => COLLATOR.compare(GUEST_TYPE_LABELS[a.type], GUEST_TYPE_LABELS[b.type]),
  environment: byEnvironment,
  status: (a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status],
};

/** The order of a column, the name breaking the ties of every other column. */
export function compareGuests(sort: GuestSort): (a: GuestSummary, b: GuestSummary) => number {
  const sign = sort.direction === 'asc' ? 1 : -1;
  return (a, b) => sign * COMPARE[sort.key](a, b) || byName(a, b);
}

/** The guests on screen: the loaded ones that match «Buscar», in the chosen order. */
export function visibleGuests(
  guests: readonly GuestSummary[],
  search: string,
  sort: GuestSort,
): GuestSummary[] {
  return guests.filter((guest) => matchesSearch(guest, search)).sort(compareGuests(sort));
}

/** A header pressed: the same column turns around; another one starts ascending. */
export function nextSort(current: GuestSort, key: SortKey): GuestSort {
  if (current.key !== key) return { key, direction: 'asc' };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

const STATUS_TONES: Readonly<Record<Tone, StatusTone>> = {
  ok: 'paid',
  wait: 'review',
  none: 'unpaid',
  bad: 'overdue',
};

/** One guest as the table and the cards of A3 show it. */
export interface GuestRow {
  readonly id: string;
  /** null until the guest completes its data («Sin nombre»). */
  readonly name: string | null;
  /** «DNI 43219087», «CE 001234567», «Pasaporte 548210». */
  readonly document: string;
  readonly type: string;
  readonly environment: EnvironmentText;
  readonly badge: { readonly label: string; readonly tone: StatusTone };
  /** Only for a guest pending activation with an access: when it expires, or that it did. */
  readonly access: AccessText | null;
}

export function toGuestRow(guest: GuestSummary, now: Date): GuestRow {
  const badge = GUEST_STATUS_BADGES[guest.status];
  return {
    id: guest.id,
    name: guest.name,
    document: documentText(guest),
    type: GUEST_TYPE_LABELS[guest.type],
    environment: environmentText(guest),
    badge: { label: badge.label, tone: STATUS_TONES[badge.tone] },
    access: guest.status === 'PENDING_ACTIVATION' ? accessText(guest.accessExpiresAt, now) : null,
  };
}
