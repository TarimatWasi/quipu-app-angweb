import type { components } from '@core/api/bff.generated';
import { formatDate } from '@shared/payments/payment-format';

// Every type comes from the contract (TAR-23).
export type AdministratorSummary = components['schemas']['AdministratorSummary'];
export type AdministratorInput = components['schemas']['AdministratorInput'];
export type AdministratorCreated = components['schemas']['AdministratorCreated'];
export type DocumentType = components['schemas']['DocumentType'];

/** The most active administrators the BFF allows (RF-22); inactive ones do not count. */
export const MAX_ACTIVE_ADMINISTRATORS = 5;

/** What a row offers: deactivate an active account or reactivate an inactive one. */
export type AdministratorAction = 'deactivate' | 'reactivate';

/** The tones of P-08 that A7 uses: green, yellow and grey. */
export type AdministratorTone = 'paid' | 'review' | 'unpaid';

export interface AdministratorBadge {
  readonly label: string;
  readonly tone: AdministratorTone;
}

/** One administrator as the table and the cards of A7 show it. */
export interface AdministratorRow {
  readonly id: string;
  /** null while the account has not been activated («Sin activar»). */
  readonly name: string | null;
  /** How a dialog names it: its name, or its email while it has none. */
  readonly displayName: string;
  readonly self: boolean;
  /** «DNI *****678»: the type abbreviated and the number as the BFF masked it. */
  readonly document: string;
  readonly email: string;
  readonly badge: AdministratorBadge;
  /** «15 ene 2026», or «hoy». */
  readonly since: string;
  /** null for the account of the session, which cannot change itself. */
  readonly action: AdministratorAction | null;
}

/** How the table abbreviates each type of document. */
export const DOCUMENT_ABBREVIATIONS: Readonly<Record<DocumentType, string>> = {
  DNI: 'DNI',
  CE: 'CE',
  PASSPORT: 'Pasaporte',
};

const BADGES = {
  active: { label: 'Activo', tone: 'paid' },
  inactive: { label: 'Inactivo', tone: 'unpaid' },
  pending: { label: 'Sin activar', tone: 'review' },
} as const satisfies Record<string, AdministratorBadge>;

const LIMA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The day an instant falls on in America/Lima, yyyy-mm-dd. */
export function limaDay(instant: Date): string {
  return LIMA_DAY.format(instant);
}

/** An account created and not yet activated: active, but still without a name. */
export function isPending(administrator: AdministratorSummary): boolean {
  return administrator.status === 'ACTIVE' && administrator.name === null;
}

export function badgeOf(administrator: AdministratorSummary): AdministratorBadge {
  if (administrator.status === 'INACTIVE') return BADGES.inactive;
  return isPending(administrator) ? BADGES.pending : BADGES.active;
}

/** «Desde»: the day of `createdAt` in Lima, «hoy» when it is today. */
export function sinceText(createdAt: string, now: Date): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return '—';
  const day = limaDay(created);
  return day === limaDay(now) ? 'hoy' : formatDate(day);
}

function actionOf(administrator: AdministratorSummary): AdministratorAction | null {
  if (administrator.self) return null;
  return administrator.status === 'ACTIVE' ? 'deactivate' : 'reactivate';
}

export function toRow(administrator: AdministratorSummary, now: Date): AdministratorRow {
  return {
    id: administrator.id,
    name: administrator.name,
    displayName: administrator.name ?? administrator.email,
    self: administrator.self,
    document: `${DOCUMENT_ABBREVIATIONS[administrator.documentType]} ${administrator.documentNumber}`,
    email: administrator.email,
    badge: badgeOf(administrator),
    since: sinceText(administrator.createdAt, now),
    action: actionOf(administrator),
  };
}

/** The counts of A7: every account, the active ones (pending included) and the pending ones. */
export interface AdministratorCounts {
  readonly total: number;
  readonly active: number;
  readonly pending: readonly AdministratorSummary[];
}

export function countsOf(administrators: readonly AdministratorSummary[]): AdministratorCounts {
  return {
    total: administrators.length,
    active: administrators.filter((administrator) => administrator.status === 'ACTIVE').length,
    pending: administrators.filter(isPending),
  };
}

/** Whether one more active administrator fits under the maximum. */
export function hasRoom(counts: AdministratorCounts): boolean {
  return counts.active < MAX_ACTIVE_ADMINISTRATORS;
}
