/**
 * Texts of the credit of a guest with a contract and of the refund of a stay (H1, H3, T1; RN-38,
 * RN-39). They only say what the BFF answers: the BFF does not tell from which month the credit was
 * left over, only that it comes from what was paid over a monthly amount.
 */
import { formatDate, formatMoney, formatPeriod } from './payment-format';

const ORIGIN = 'Sobró de un pago anterior';

/** H1: «Tienes S/ … a favor.» */
export function creditBalanceText(balance: number): string {
  return `Tienes ${formatMoney(balance)} a favor.`;
}

export interface CreditUse {
  /** No month is left where to use it: Quipu refunds it (GuestCredit.toRefund). */
  readonly toRefund: boolean;
  /** The month the BFF already discounts it from ("2026-11"), if any. */
  readonly month: string | null;
}

/** H1: where the credit is discounted, or that it will be refunded. */
export function creditUseText({ toRefund, month }: CreditUse): string {
  if (toRefund) {
    return `${ORIGIN} y ya no quedan meses donde descontarlo: te lo devolveremos.`;
  }
  const where = month === null ? 'tu próxima cuota' : formatPeriod(month);
  return `${ORIGIN} y se descuenta de ${where}.`;
}

/** H3: the note of the credit discounted from the month or the payment. */
export function creditAppliedText(creditApplied: number): string {
  return `Se descuentan ${formatMoney(creditApplied)} de tu crédito a favor, que sobró de un pago anterior.`;
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
