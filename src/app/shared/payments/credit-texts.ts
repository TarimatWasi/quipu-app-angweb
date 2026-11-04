/**
 * Texts of the credit of a guest with a contract and of the refund of a stay (H1, H3, T1; RN-38,
 * RN-39). They only say what the BFF answers: the months the credit still to use was left over
 * from come in GuestCredit.origins (TAR-284); without them it says «un pago anterior».
 */
import { formatDate, formatMoney, formatPeriod, monthName } from './payment-format';

/** A payment the credit was left over from (GuestCredit.origins); only its month is shown. */
export interface CreditOrigin {
  /** The month that payment paid ("2026-10"). */
  readonly period: string;
}

const UNKNOWN_ORIGIN = 'de un pago anterior';

/** "a", "a y b", "a, b y c". */
function spanishList(items: readonly string[]): string {
  const last = items.at(-1) ?? '';
  return items.length > 1 ? `${items.slice(0, -1).join(', ')} y ${last}` : last;
}

/**
 * Where the credit was left over from: «de tu pago de octubre», «de tus pagos de septiembre y
 * octubre», or «de un pago anterior» when no month can be told. Each month is named once and in
 * order; the year is added only when the months span more than one.
 */
export function creditOriginText(origins: readonly CreditOrigin[]): string {
  const known = origins.filter((origin) => monthName(origin.period) !== null);
  const periods = [...new Set(known.map((origin) => origin.period))].sort((a, b) =>
    a.localeCompare(b),
  );
  if (periods.length === 0) {
    return UNKNOWN_ORIGIN;
  }
  const oneYear = new Set(periods.map((period) => period.slice(0, 4))).size === 1;
  const names = periods.map((period) => {
    const name = monthName(period) ?? '';
    return oneYear ? name : `${name} ${period.slice(0, 4)}`;
  });
  const payments = known.length === 1 ? 'tu pago' : 'tus pagos';
  return `de ${payments} de ${spanishList(names)}`;
}

/** H1: «Tienes S/ … a favor.» */
export function creditBalanceText(balance: number): string {
  return `Tienes ${formatMoney(balance)} a favor.`;
}

export interface CreditUse {
  /** No month is left where to use it: Quipu refunds it (GuestCredit.toRefund). */
  readonly toRefund: boolean;
  /** The month the BFF already discounts it from ("2026-11"), if any. */
  readonly month: string | null;
  /** The payments it was left over from, oldest first (GuestCredit.origins). */
  readonly origins: readonly CreditOrigin[];
}

/** H1: where the credit is discounted, or that it will be refunded. */
export function creditUseText({ toRefund, month, origins }: CreditUse): string {
  const origin = `Sobró ${creditOriginText(origins)}`;
  if (toRefund) {
    return `${origin} y ya no quedan meses donde descontarlo: te lo devolveremos.`;
  }
  const where = month === null ? 'tu próxima cuota' : formatPeriod(month);
  return `${origin} y se descuenta de ${where}.`;
}

/** H3: the note of the credit discounted from the month or the payment. */
export function creditAppliedText(creditApplied: number): string {
  return `Se descuentan ${formatMoney(creditApplied)} de tu crédito a favor, que sobró de un pago anterior.`;
}

/**
 * H3 «Tu pago» (read-only: pending or approved): what the payment had to cover after the credit
 * (`amountDue`). It is not a balance still owed, so it never says «Por pagar».
 */
export function coveredAmountText(amountDue: number): string {
  return `A cubrir con este pago ${formatMoney(amountDue)}`;
}

export interface DueParts {
  readonly amount: number;
  readonly creditApplied: number;
}

/** H1: «Cuota S/ … − crédito a favor S/ …», only when the month has credit discounted. */
export function dueBreakdownText({ amount, creditApplied }: DueParts): string | null {
  return creditApplied > 0
    ? `Cuota ${formatMoney(amount)} − crédito a favor ${formatMoney(creditApplied)}`
    : null;
}

export interface Surplus {
  readonly amount: number;
  readonly refundStatus: 'PENDING' | 'REFUNDED';
  readonly refundedOn?: string | null;
  readonly refundMethod?: string | null;
}

/** T1: «Te devolveremos S/ ….» or «Te devolvimos S/ … el … por ….» (a stay keeps no credit). */
export function surplusText({ amount, refundStatus, refundedOn, refundMethod }: Surplus): string {
  const money = formatMoney(amount);
  if (refundStatus === 'PENDING') {
    return `Te devolveremos ${money}.`;
  }
  const date = refundedOn ? ` el ${formatDate(refundedOn)}` : '';
  const method = refundMethod ? ` por ${refundMethod}` : '';
  return `Te devolvimos ${money}${date}${method}.`;
}
