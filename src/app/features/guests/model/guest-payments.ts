import type { components } from '@core/api/bff.generated';
import {
  formatDate,
  formatMoney,
  limaDayOf,
  periodLabel,
  proofsSummary,
} from '@shared/payments/payment-format';
import { PAYMENT_ACTIONS, PAYMENT_BADGES } from '@shared/payments/payment-status';
import type { PaymentBadge } from '@shared/payments/payment-status';
import { openPayment } from '@shared/payments/period-rows';
import type { PaymentAction } from '@shared/payments/period-rows';
import { loadErrorText, noMatchHeading } from '@shared/text/list-text';
import type { EmptyText } from '@shared/ui/list-results/list-results.component';

type PaymentSummary = components['schemas']['PaymentSummary'];

/**
 * «Historial de pagos» of A3.2 (RF-10, SRS 17): every payment the guest sent or the administrator
 * registered, newest first as the BFF answers, with what «Pagos por mes» does not say: when it was
 * sent, with what, the amount declared or verified and why it was rejected.
 */

export const GUEST_PAYMENTS_PAGE_SIZE = 20;
export const GUEST_PAYMENTS_HEADING = 'Historial de pagos';
export const GUEST_PAYMENTS_LOAD_ERROR = loadErrorText('el historial de pagos');
/** The history has no filters; `app-list-results` asks the text all the same. */
export const GUEST_PAYMENTS_NO_MATCH = noMatchHeading('pago');
export const GUEST_PAYMENTS_EMPTY: EmptyText = {
  heading: 'Aún no tiene pagos.',
  text: 'Aquí verás cada pago que envíe o que le registres, con su estado.',
};

export interface GuestPaymentRow {
  readonly id: string;
  /** «Octubre 2026»: the month it pays. */
  readonly month: string;
  /** «Enviado el 3 nov 2026»: the last time it was sent (a corrected one is sent again). */
  readonly sent: string;
  /** «2 vouchers», «1 voucher y efectivo», «Efectivo». */
  readonly proofs: string;
  /** The verified amount once approved (RN-16), the declared one before. */
  readonly amount: string;
  readonly badge: PaymentBadge;
  /** «Motivo: …» of a rejected payment that has one; null otherwise. */
  readonly reason: string | null;
  /** Its review in A5.2: «Revisar pago», «Corregir pago» or «Ver pago». */
  readonly action: PaymentAction;
}

function sentText(submittedAt: string): string {
  return `Enviado el ${formatDate(limaDayOf(submittedAt) ?? submittedAt.slice(0, 10))}`;
}

export function toGuestPaymentRow(payment: PaymentSummary): GuestPaymentRow {
  const approved = payment.status === 'APPROVED';
  const reason = payment.status === 'REJECTED' ? payment.rejectionReason?.trim() : '';
  return {
    id: payment.id,
    month: periodLabel({ period: payment.period, stayStartDate: null, stayEndDate: null }),
    sent: sentText(payment.submittedAt),
    proofs: proofsSummary(payment.voucherCount, payment.hasCash),
    amount: formatMoney(approved ? (payment.verifiedAmount ?? payment.amount) : payment.amount),
    badge: PAYMENT_BADGES[payment.status],
    reason: reason ? `Motivo: ${reason}` : null,
    action: openPayment(PAYMENT_ACTIONS[payment.status], payment.id),
  };
}
