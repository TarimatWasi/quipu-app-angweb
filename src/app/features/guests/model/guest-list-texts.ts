import type { components } from '@core/api/bff.generated';
import { formatDate, formatStay } from '@shared/payments/payment-format';
import { documentText, ENVIRONMENT_TYPE_LABELS, NO_ENVIRONMENT } from './guest-texts';

/** Texts of A3 «Huéspedes» as the canvas words them, Spanish only (QP-ANGWEB-LNG-01). */

type GuestSummary = components['schemas']['GuestSummary'];
type EnvironmentRef = components['schemas']['EnvironmentRef'];

export const LOAD_ERROR_TEXT = 'No se pudieron cargar los huéspedes.';
export const NO_MATCH_HEADING = 'Ningún huésped coincide con los filtros.';
export const NO_CURRENT_HEADING = 'Aún no hay huéspedes.';
export const NO_CURRENT_TEXT =
  'Registra al primero con su documento: el huésped completa sus datos al activar su acceso.';
export const NO_INACTIVE_HEADING = 'No hay huéspedes inactivos.';
export const NO_INACTIVE_TEXT = 'Un huésped que desactives aparecerá aquí, con su historial.';
export const NO_ENVIRONMENT_DETAIL = 'se asigna con el contrato o la estadía';
export const ACCESS_EXPIRED_TEXT = 'Acceso vencido';

/** «Mostrando N de M cargados»: the guests on screen of the ones loaded so far. */
export function countText(shown: number, loaded: number): string {
  return `Mostrando ${String(shown)} de ${String(loaded)} cargados`;
}

/** The Ambiente column: its name, and under it what keeps it (or, inactive, the last one). */
export interface EnvironmentText {
  readonly main: string;
  readonly detail: string | null;
}

function environmentName(environment: EnvironmentRef): string {
  return `${ENVIRONMENT_TYPE_LABELS[environment.type]} ${environment.code}`;
}

function stayDates({ startDate, endDate }: EnvironmentRef): string {
  return endDate === null ? `desde ${formatDate(startDate)}` : formatStay(startDate, endDate);
}

/** «último ambiente: 208» or «última estadía: C4, 3 – 12 jul» for an inactive guest. */
function pastEnvironment(environment: EnvironmentRef): string {
  return environment.kind === 'CONTRACT'
    ? `último ambiente: ${environment.code}`
    : `última estadía: ${environment.code}, ${stayDates(environment)}`;
}

function currentDetail(environment: EnvironmentRef): string {
  if (environment.kind === 'STAY') return `estadía ${stayDates(environment)}`;
  return environment.endDate === null
    ? 'contrato sin fecha de fin'
    : `contrato hasta ${formatDate(environment.endDate)}`;
}

/** The environment by its own type («Habitación 101», «Cabaña C1»), not by the guest's. */
export function environmentText(guest: GuestSummary): EnvironmentText {
  const environment = guest.environment ?? null;
  const inactive = guest.status === 'INACTIVE';
  if (environment === null) {
    return { main: NO_ENVIRONMENT, detail: inactive ? null : NO_ENVIRONMENT_DETAIL };
  }
  if (inactive) return { main: pastEnvironment(environment), detail: null };
  return { main: environmentName(environment), detail: currentDetail(environment) };
}

/** The access of a guest pending activation: when it expires, or «Acceso vencido». */
export interface AccessText {
  readonly text: string;
  readonly expired: boolean;
}

const LIMA_PARTS = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

function limaParts(instant: Date): { readonly day: string; readonly time: string } {
  const parts = LIMA_PARTS.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return {
    day: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

/** Whether the access already expired at `now`; false without a valid instant. */
export function isAccessExpired(expiresAt: string | null | undefined, now: Date): boolean {
  if (expiresAt === null || expiresAt === undefined) return false;
  const instant = new Date(expiresAt);
  return !Number.isNaN(instant.getTime()) && instant.getTime() <= now.getTime();
}

/** The day of an instant in Lima, yyyy-mm-dd; null when the instant is not valid. */
export function limaDay(instant: string): string | null {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? null : limaParts(date).day;
}

/** When an instant falls, seen from `now` in Lima: «hoy a las 16:05» or «el 6 nov 2026 a las 10:00». */
export function whenText(instant: Date, now: Date): string {
  const when = limaParts(instant);
  const day = when.day === limaParts(now).day ? 'hoy' : `el ${formatDate(when.day)}`;
  return `${day} a las ${when.time}`;
}

/** «Acceso vence hoy a las 16:05», «Acceso vence el 6 nov 2026 a las 10:00» or «Acceso vencido». */
export function accessText(expiresAt: string | null | undefined, now: Date): AccessText | null {
  if (expiresAt === null || expiresAt === undefined) return null;
  const instant = new Date(expiresAt);
  if (Number.isNaN(instant.getTime())) return null;
  if (isAccessExpired(expiresAt, now)) return { text: ACCESS_EXPIRED_TEXT, expired: true };
  return { text: `Acceso vence ${whenText(instant, now)}`, expired: false };
}

/** «Lo que toca ahora» of A3: the figure, what it counts and what to do. */
export interface NowPanel {
  readonly figure: number;
  readonly label: string;
  readonly text: string;
}

export interface PanelCounts {
  readonly pendingActivationCount: number;
  readonly onboardingCount: number;
}

function expiredSentence(expired: readonly GuestSummary[]): string {
  const [only] = expired;
  if (only === undefined) return '';
  if (expired.length === 1) {
    return ` Al ${documentText(only)} se le venció: genera otro desde su ficha.`;
  }
  return ` A ${String(expired.length)} se les venció: genera otro desde su ficha.`;
}

function onboardingSentence(count: number): string {
  if (count <= 0) return '';
  return count === 1
    ? ' Además, 1 está completando sus datos.'
    : ` Además, ${String(count)} están completando sus datos.`;
}

/**
 * The panel of «Actuales» while someone has not activated its access; null when nobody is pending.
 * The counts are the BFF's (every page); the expired accesses, the ones among the loaded guests.
 */
export function nowPanel(
  counts: PanelCounts,
  loaded: readonly GuestSummary[],
  now: Date,
): NowPanel | null {
  const pending = counts.pendingActivationCount;
  if (pending <= 0) return null;
  const one = pending === 1;
  const expired = loaded.filter(
    (guest) => guest.status === 'PENDING_ACTIVATION' && isAccessExpired(guest.accessExpiresAt, now),
  );
  const text =
    (one ? 'Aún no abre su acceso.' : 'Aún no abren su acceso.') +
    expiredSentence(expired) +
    onboardingSentence(counts.onboardingCount) +
    ' Hasta que terminen no se les puede cargar un contrato ni una estadía.';
  return { figure: pending, label: one ? 'huésped sin activar' : 'huéspedes sin activar', text };
}
