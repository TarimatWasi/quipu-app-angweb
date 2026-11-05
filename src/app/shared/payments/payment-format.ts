/**
 * Texts and numbers of the payment screens (A5, A5.2, H1, H3, H4, T1, T2), Spanish only
 * (QP-ANGWEB-LNG-01). Shared because the home of each guest shows its payment state too.
 */

/** Etiquetas de estado of a period of a contract or of a stay (H1, T1). */
export const PERIOD_STATUS_LABELS: Readonly<
  Record<'PAID' | 'UNDER_REVIEW' | 'UNPAID' | 'OVERDUE', string>
> = {
  PAID: 'Pagado',
  UNDER_REVIEW: 'Pendiente de revisión',
  UNPAID: 'No pagado',
  OVERDUE: 'Atrasado',
};

/** The state of a month of a contract or of a stay, with its live or last payment (H1, T1). */
export interface PayableState {
  readonly status: keyof typeof PERIOD_STATUS_LABELS;
  readonly paymentId?: string | null;
}

/** A month or a stay that still takes a first payment: not paid and without any payment. */
export function takesNewPayment({ status, paymentId }: PayableState): boolean {
  return (status === 'UNPAID' || status === 'OVERDUE') && !paymentId;
}

/**
 * A month or a stay whose payment was rejected: it stays unpaid with its payment, which is
 * corrected and sent again (RN-05), never replaced by a new one.
 */
export function hasRejectedPayment({ status, paymentId }: PayableState): boolean {
  return (status === 'UNPAID' || status === 'OVERDUE') && !!paymentId;
}

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];
const SHORT_MONTHS = MONTHS.map((month) => month.slice(0, 3).toLowerCase());

/** Moments are shown in the time of the residence. */
const TIME_ZONE = 'America/Lima';
const LIMA_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const DASH = '—';

interface DateParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

function dateParts(isoDate: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(isoDate);
  if (!match) {
    return null;
  }
  const month = Number(match[2]);
  const day = match[3] === undefined ? 1 : Number(match[3]);
  return month >= 1 && month <= 12 && day >= 1 && day <= 31
    ? { year: Number(match[1]), month, day }
    : null;
}

/** "2026-09" → "Septiembre 2026"; anything else is shown as it came. */
export function formatPeriod(period: string): string {
  const parts = dateParts(period);
  return parts ? `${MONTHS[parts.month - 1] ?? ''} ${String(parts.year)}` : period;
}

/** "2026-10" → "octubre", as it goes inside a sentence; null for anything but a month. */
export function monthName(period: string): string | null {
  const parts = /^\d{4}-\d{2}$/.test(period) ? dateParts(period) : null;
  return parts ? (MONTHS[parts.month - 1] ?? '').toLowerCase() : null;
}

function shortDate({ day, month }: DateParts, year?: number): string {
  const text = `${String(day)} ${SHORT_MONTHS[month - 1] ?? ''}`;
  return year === undefined ? text : `${text} ${String(year)}`;
}

/** The dates of a stay: "20 – 31 oct", "28 oct – 3 nov", "28 dic 2026 – 3 ene 2027". */
export function formatStay(start: string, end: string): string {
  const from = dateParts(start);
  const to = dateParts(end);
  if (!from || !to) {
    return `${start} – ${end}`;
  }
  if (from.year !== to.year) {
    return `${shortDate(from, from.year)} – ${shortDate(to, to.year)}`;
  }
  if (from.month === to.month) {
    return `${String(from.day)} – ${shortDate(to)}`;
  }
  return `${shortDate(from)} – ${shortDate(to)}`;
}

export interface PeriodFields {
  readonly period: string | null;
  readonly stayStartDate: string | null;
  readonly stayEndDate: string | null;
}

/** The month of a contract, or the dates of the stay of a temporary guest. */
export function periodLabel({ period, stayStartDate, stayEndDate }: PeriodFields): string {
  if (period) {
    return formatPeriod(period);
  }
  return stayStartDate && stayEndDate ? formatStay(stayStartDate, stayEndDate) : DASH;
}

/** "2026-11-03" → "3 nov 2026"; anything else is shown as it came. */
export function formatDate(isoDate: string): string {
  const parts = dateParts(isoDate);
  return parts ? shortDate(parts, parts.year) : isoDate;
}

/** "2026-11-03T19:05:00Z" → "3 nov 2026, 14:05" (time of Lima). */
export function formatDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) {
    return DASH;
  }
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    LIMA_PARTS.formatToParts(date).find((part) => part.type === type)?.value ?? '';
  const parts = { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')) };
  return `${shortDate(parts, parts.year)}, ${get('hour')}:${get('minute')}`;
}

/** The day of an instant in Lima as a number of days, to count whole days between two of them. */
function limaDayNumber(instant: Date): number | null {
  if (Number.isNaN(instant.getTime())) return null;
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(LIMA_PARTS.formatToParts(instant).find((part) => part.type === type)?.value);
  const day = Date.UTC(get('year'), get('month') - 1, get('day'));
  return Number.isNaN(day) ? null : day / 86_400_000;
}

/** «hoy», «hace 1 día», «hace 4 días»: how long ago a payment was sent, by days in Lima (A3.2, A5). */
export function daysAgo(sentAt: string, now: Date): string | null {
  const sent = limaDayNumber(new Date(sentAt));
  const today = limaDayNumber(now);
  if (sent === null || today === null) return null;
  const days = today - sent;
  if (days <= 0) return 'hoy';
  return days === 1 ? 'hace 1 día' : `hace ${String(days)} días`;
}

/** Soles with two decimals: "S/ 1,350.50". */
export function formatMoney(amount: number): string {
  const [whole = '0', cents = '00'] = Math.abs(amount).toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0 ? '-' : ''}S/ ${grouped}.${cents}`;
}

/** The Comprobantes column of the queue: "2 vouchers", "1 voucher y efectivo", "Efectivo". */
export function proofsSummary(voucherCount: number, hasCash: boolean): string {
  const vouchers =
    voucherCount === 0 ? '' : `${String(voucherCount)} voucher${voucherCount === 1 ? '' : 's'}`;
  if (vouchers && hasCash) {
    return `${vouchers} y efectivo`;
  }
  return vouchers || (hasCash ? 'Efectivo' : 'Sin comprobantes');
}

/** An amount in soles typed by the administrator: zero or more, at most two decimals. */
export function parseAmount(text: string): number | null {
  const normalized = text.trim().replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(normalized) ? Number(normalized) : null;
}

const toCents = (amount: number) => Math.round(amount * 100);

export type Balance =
  | { readonly kind: 'complete'; readonly difference: 0 }
  | { readonly kind: 'short'; readonly difference: number }
  | { readonly kind: 'over'; readonly difference: number; readonly refund: boolean };

/**
 * The verified sum against what is due (RN-16): Completo, Faltan (approving is not possible) or
 * Sobran, which becomes credit, or a refund on the last period or a stay (RN-38, RN-39).
 */
export function balanceOf(verified: number, due: number, lastPeriod: boolean): Balance {
  const cents = toCents(verified) - toCents(due);
  if (cents === 0) {
    return { kind: 'complete', difference: 0 };
  }
  const difference = Math.abs(cents) / 100;
  return cents < 0
    ? { kind: 'short', difference }
    : { kind: 'over', difference, refund: lastPeriod };
}
