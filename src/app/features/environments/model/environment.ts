import type { components } from '@core/api/bff.generated';
import { formatDate, formatStay } from '@shared/payments/payment-format';
import { COLLATOR, matchesAny } from '@shared/text/search';
import { compareBy } from '@shared/ui/data-table/list-sort';
import type { ListSort, PhoneSort } from '@shared/ui/data-table/list-sort';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';

/** The environments of A2 as the screens show them: what each one says and how the list is kept. */

export type Environment = components['schemas']['Environment'];
export type EnvironmentPage = components['schemas']['PagedEnvironments'];
export type Occupant = components['schemas']['Occupant'];
export type EnvironmentType = Environment['type'];
export type EnvironmentStatus = Environment['status'];

export const TYPE_LABELS: Readonly<Record<EnvironmentType, string>> = {
  ROOM: 'Habitación',
  CABIN: 'Cabaña',
};
export const STATUS_LABELS: Readonly<Record<EnvironmentStatus, string>> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
};
const STATUS_TONES: Readonly<Record<EnvironmentStatus, StatusTone>> = {
  ACTIVE: 'paid',
  INACTIVE: 'unpaid',
};

const NO_NAME = 'Huésped sin nombre';

/** What an occupant is to the environment: «contrato hasta 31 mar 2027», «estadía 20 – 31 oct». */
export function occupancyDetail(occupant: Occupant): string {
  if (occupant.kind === 'STAY') {
    return `estadía ${occupant.endDate === null ? formatDate(occupant.startDate) : formatStay(occupant.startDate, occupant.endDate)}`;
  }
  return occupant.endDate === null
    ? 'contrato sin fecha de fin'
    : `contrato hasta ${formatDate(occupant.endDate)}`;
}

/** What the next occupant is: «Valeria Choque, estadía 5 – 12 nov» or «Julia Mendoza, contrato desde el 1 nov». */
function nextDetail(next: Occupant): string {
  const who = next.guestName ?? NO_NAME;
  return next.kind === 'STAY'
    ? `${who}, ${occupancyDetail(next)}`
    : `${who}, contrato desde el ${formatDate(next.startDate)}`;
}

export interface EnvironmentRow {
  readonly id: string;
  readonly code: string;
  readonly type: EnvironmentType;
  readonly typeLabel: string;
  readonly status: EnvironmentStatus;
  readonly badge: { readonly label: string; readonly tone: StatusTone };
  /** Occupied today: who is in it. */
  readonly occupant: Occupant | null;
  /** «Ana Quispe», «Libre hasta el 5 nov 2026», «Libre» or «No disponible». */
  readonly occupancyTitle: string;
  readonly occupancyDetail: string;
  /** «Desactivar» of an active one, «Reactivar» of an inactive one. */
  readonly action: 'deactivate' | 'reactivate';
  readonly actionLabel: string;
  /** Says which environment the action is for: «Desactivar Habitación 201». */
  readonly actionName: string;
  readonly editName: string;
  /** Somebody comes after today, so it is not free for good (RN-20). */
  readonly reserved: boolean;
}

function titleAndDetail(env: Environment): { title: string; detail: string } {
  if (env.status === 'INACTIVE') {
    const day = env.deactivatedAt?.slice(0, 10);
    return {
      title: 'No disponible',
      detail: day === undefined ? '' : `desactivado el ${formatDate(day)}`,
    };
  }
  if (env.occupant !== null) {
    return { title: env.occupant.guestName ?? NO_NAME, detail: occupancyDetail(env.occupant) };
  }
  if (env.nextOccupant !== null) {
    return {
      title: `Libre hasta el ${formatDate(env.nextOccupant.startDate)}`,
      detail: `Luego ${nextDetail(env.nextOccupant)}`,
    };
  }
  return {
    title: 'Libre',
    detail: env.freeSince === null ? '' : `desde el ${formatDate(env.freeSince)}`,
  };
}

export function toRow(env: Environment): EnvironmentRow {
  const { title, detail } = titleAndDetail(env);
  const name = `${TYPE_LABELS[env.type]} ${env.code}`;
  const active = env.status === 'ACTIVE';
  return {
    id: env.id,
    code: env.code,
    type: env.type,
    typeLabel: TYPE_LABELS[env.type],
    status: env.status,
    badge: { label: STATUS_LABELS[env.status], tone: STATUS_TONES[env.status] },
    occupant: env.occupant,
    occupancyTitle: title,
    occupancyDetail: detail,
    action: active ? 'deactivate' : 'reactivate',
    actionLabel: active ? 'Desactivar' : 'Reactivar',
    actionName: `${active ? 'Desactivar' : 'Reactivar'} ${name}`,
    editName: `Editar ${name}`,
    reserved: active && env.occupant === null && env.nextOccupant !== null,
  };
}

export type OccupancyFilter = 'ALL' | 'FREE' | 'BUSY';
export type TypeFilter = 'ALL' | EnvironmentType;

export interface EnvironmentFilters {
  readonly search: string;
  readonly type: TypeFilter;
  readonly occupancy: OccupancyFilter;
}

export const NO_FILTERS: EnvironmentFilters = { search: '', type: 'ALL', occupancy: 'ALL' };

export function hasFilters(filters: EnvironmentFilters): boolean {
  return filters.search.trim() !== '' || filters.type !== 'ALL' || filters.occupancy !== 'ALL';
}

export type SortKey = 'code' | 'type' | 'occupancy' | 'status';
export type EnvironmentSort = ListSort<SortKey>;
export const DEFAULT_SORT: EnvironmentSort = { key: 'code', direction: 'asc' };

export const PHONE_SORTS: readonly PhoneSort<SortKey>[] = [
  { key: 'code', label: 'Código' },
  { key: 'occupancy', label: 'Libres primero' },
];

const byCode = (a: EnvironmentRow, b: EnvironmentRow): number => COLLATOR.compare(a.code, b.code);

const COMPARE: Readonly<Record<SortKey, (a: EnvironmentRow, b: EnvironmentRow) => number>> = {
  code: byCode,
  type: (a, b) => COLLATOR.compare(a.typeLabel, b.typeLabel),
  // Free first, then the occupied ones by who is in them.
  occupancy: (a, b) =>
    Number(a.occupant !== null) - Number(b.occupant !== null) ||
    COLLATOR.compare(a.occupant?.guestName ?? '', b.occupant?.guestName ?? ''),
  status: (a, b) => COLLATOR.compare(a.badge.label, b.badge.label),
};

/** The rows the filters keep, in the order asked; the search is on the code and the occupant. */
export function visibleEnvironments(
  rows: readonly EnvironmentRow[],
  filters: EnvironmentFilters,
  sort: EnvironmentSort,
): EnvironmentRow[] {
  return rows
    .filter(
      (row) =>
        (filters.type === 'ALL' || row.type === filters.type) &&
        (filters.occupancy === 'ALL' ||
          (filters.occupancy === 'BUSY') === (row.occupant !== null)) &&
        matchesAny([row.code, row.occupant?.guestName ?? ''], filters.search),
    )
    .sort(compareBy(COMPARE, sort, byCode));
}

export function countText(shown: number, loaded: number): string {
  return `Mostrando ${String(shown)} de ${String(loaded)} cargados`;
}

/** «Lo que toca ahora» of A2: how many are free, which ones and who is booked. */
export interface FreePanel {
  readonly figure: number;
  readonly label: string;
  readonly text: string;
}

function lower(label: string): string {
  return label.toLowerCase();
}

function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names.at(-1) ?? ''}`;
}

/**
 * The panel of «Activos» while some environment is free and has nothing coming; null when none is.
 * The count is the BFF's (every page); the names, the ones among the loaded environments.
 */
export function freePanel(freeCount: number, loaded: readonly Environment[]): FreePanel | null {
  if (freeCount <= 0) return null;
  const free = loaded.filter(
    (env) => env.status === 'ACTIVE' && env.occupant === null && env.nextOccupant === null,
  );
  const reserved = loaded.filter(
    (env) => env.status === 'ACTIVE' && env.occupant === null && env.nextOccupant !== null,
  );
  const names = free.map((env) => `${lower(TYPE_LABELS[env.type])} ${env.code}`);
  const which =
    names.length === freeCount ? `${joinNames(names).replace(/^./, (x) => x.toUpperCase())}: ` : '';
  const booked = reserved
    .map(
      (env) =>
        ` La ${lower(TYPE_LABELS[env.type])} ${env.code} está libre solo hasta el ${formatDate(env.nextOccupant?.startDate ?? '')}.`,
    )
    .join('');
  return {
    figure: freeCount,
    label: freeCount === 1 ? 'ambiente libre' : 'ambientes libres',
    text: `${which}${which === '' ? 'Listos' : 'listos'} para un contrato o una estadía.${booked}`,
  };
}

// The form (A2.1, A2.4).

/** Letters, digits, space and . _ / - (decided 2026-10-31, TAR-237), 1 to 50 once trimmed. */
const CODE = /^[A-Za-z0-9 ._/-]{1,50}$/;
export const CODE_MAX_LENGTH = 50;
export const CODE_REQUIRED_TEXT = 'Escribe el código del ambiente.';
export const CODE_FORMAT_TEXT = 'Usa solo letras, números, espacio y . _ / -';
export const CODE_TAKEN_TEXT = 'Ya existe un ambiente con ese código';
export const CODE_HELP_TEXT =
  'Como lo conocen todos, por ejemplo 201 o C1. Letras, números, espacio y . _ / -, hasta 50.';

/** What is wrong with a code as the BFF checks it (trimmed); null when it is valid. */
export function codeProblem(code: string): string | null {
  const trimmed = code.trim();
  if (trimmed === '') return CODE_REQUIRED_TEXT;
  return CODE.test(trimmed) ? null : CODE_FORMAT_TEXT;
}

/** What the form edits. The type is empty until one is chosen when creating. */
export interface EnvironmentDraft {
  readonly code: string;
  readonly type: EnvironmentType | '';
}

export function draftOf(env: Environment): EnvironmentDraft {
  return { code: env.code, type: env.type };
}

/** The fields of an edit that differ from the environment as it was loaded. */
export function changesOf(
  loaded: Environment,
  draft: EnvironmentDraft,
): { code?: string; type?: EnvironmentType } {
  const code = draft.code.trim();
  return {
    ...(code === loaded.code ? {} : { code }),
    ...(draft.type === '' || draft.type === loaded.type ? {} : { type: draft.type }),
  };
}

/** Whether the draft differs from the loaded environment: nothing to save otherwise (QP-UI-15). */
export function isDirty(loaded: Environment, draft: EnvironmentDraft): boolean {
  return Object.keys(changesOf(loaded, draft)).length > 0;
}

export interface FormFact {
  readonly label: string;
  readonly value: string;
  readonly wide: boolean;
}

/** «Cómo está hoy» of an edit: its state, its type and who is in it. */
export function loadedFacts(env: Environment): FormFact[] {
  const row = toRow(env);
  const occupancy =
    env.status === 'INACTIVE'
      ? 'No disponible'
      : env.occupant === null
        ? `Libre${env.freeSince === null ? '' : ` desde el ${formatDate(env.freeSince)}`}`
        : `${env.occupant.guestName ?? NO_NAME}, ${occupancyDetail(env.occupant)}`;
  return [
    { label: 'Estado', value: row.badge.label, wide: false },
    { label: 'Tipo', value: row.typeLabel, wide: false },
    { label: 'Ocupación', value: occupancy, wide: true },
  ];
}

/** «Lo que se va a crear»: what was typed so far. */
export function draftFacts(draft: EnvironmentDraft): FormFact[] {
  return [
    { label: 'Código', value: draft.code.trim() || 'Falta el código', wide: false },
    {
      label: 'Tipo',
      value: draft.type === '' ? 'Falta elegirlo' : TYPE_LABELS[draft.type],
      wide: false,
    },
  ];
}

// The notices.

export const LOAD_ERROR_TEXT = 'No se pudieron cargar los ambientes.';
export const NOT_FOUND_TEXT = 'No se encontró el registro.';
export const CREATED_TEXT = 'Ambiente creado.';
export const UPDATED_TEXT = 'Ambiente actualizado.';
export const NO_MATCH_HEADING = 'Ningún ambiente coincide con los filtros.';

export function emptyText(status: EnvironmentStatus): { heading: string; text: string } {
  return status === 'ACTIVE'
    ? {
        heading: 'Aún no hay ambientes.',
        text: 'Crea las habitaciones y cabañas para poder cargar contratos y estadías.',
      }
    : {
        heading: 'No hay ambientes inactivos.',
        text: 'Un ambiente que desactives aparecerá aquí, con su historial.',
      };
}

export const doneText = (code: string, action: 'deactivate' | 'reactivate'): string =>
  `Ambiente ${code} ${action === 'deactivate' ? 'desactivado' : 'reactivado'}.`;

export const CONFIRM_TEXT =
  'Dejará de aparecer en los listados y no se podrá cargar un contrato ni una estadía en él. Su historial se conserva y puedes reactivarlo cuando quieras.';

export const confirmTitle = (code: string): string => `¿Desactivar el ambiente ${code}?`;
export const busyTitle = (code: string): string => `El ambiente ${code} está ocupado`;

/**
 * Why it cannot be deactivated, from who is in it or comes next (RN-12, RN-20): the dialog tells
 * what to do. `today` is the day in Lima, yyyy-mm-dd.
 */
export function busyText(occupant: Occupant | undefined, today: string): string {
  if (occupant === undefined) return 'Este ambiente está ocupado: libéralo primero.';
  const who = occupant.guestName ?? NO_NAME;
  const future = occupant.startDate > today;
  if (occupant.kind === 'STAY') {
    const dates = occupancyDetail(occupant).replace('estadía ', 'del ').replace(' – ', ' al ');
    return future
      ? `${who} tiene una estadía aquí ${dates}. Para desactivarlo, cambia la estadía a otro ambiente.`
      : `${who} está aquí con una estadía ${dates}. Para desactivarlo, espera a que termine o cambia la estadía a otro ambiente.`;
  }
  return future
    ? `${who} tiene un contrato aquí que empieza el ${formatDate(occupant.startDate)}. Para desactivarlo, finaliza primero ese contrato.`
    : `Este ambiente está ocupado: finaliza primero su contrato. Hoy lo ocupa ${who}.`;
}

const LIMA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The day of an instant in America/Lima, yyyy-mm-dd: a stay is «now» or «later» by that day. */
export function limaToday(instant: Date): string {
  return LIMA_DAY.format(instant);
}
