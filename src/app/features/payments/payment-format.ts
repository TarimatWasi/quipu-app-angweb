/** Texts and numbers of the payment screens (A5, A5.2), Spanish only (QP-ANGWEB-LNG-01). */

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
