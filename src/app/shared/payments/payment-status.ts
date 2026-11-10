import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';

/** The state of one payment (PaymentSummary, GuestPayment): not the state of a month. */
export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PaymentBadge {
  readonly label: string;
  readonly tone: StatusTone;
}

/**
 * How every screen names the state of a payment and its kit tone: the queue (A5), the history of a
 * guest in A3.2 and the guest's own payment and history (H3, H4). Written once (TAR-320).
 */
export const PAYMENT_BADGES: Readonly<Record<PaymentStatus, PaymentBadge>> = {
  PENDING: { label: 'Pendiente de revisión', tone: 'review' },
  APPROVED: { label: 'Aprobado', tone: 'paid' },
  REJECTED: { label: 'Rechazado', tone: 'rejected' },
};

/**
 * What the administrator does with a payment in A5.2, by its state: a pending one is reviewed (it
 * can be cash, TAR-239), a rejected one is corrected there and an approved one is only seen.
 */
export const PAYMENT_ACTIONS: Readonly<Record<PaymentStatus, string>> = {
  PENDING: 'Revisar pago',
  APPROVED: 'Ver pago',
  REJECTED: 'Corregir pago',
};
