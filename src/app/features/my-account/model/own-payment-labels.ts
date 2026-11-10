import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';
import type { PERIOD_STATUS_LABELS } from '@shared/payments/payment-format';
import { PAYMENT_BADGES } from '@shared/payments/payment-status';
import type { PaymentStatus } from '@shared/payments/payment-status';

/** How the guest sees the state of one of its payments (H3 «Tu pago», H4): the shared wording. */
export const PAYMENT_STATUS_LABELS: Readonly<Record<PaymentStatus, string>> = {
  PENDING: PAYMENT_BADGES.PENDING.label,
  APPROVED: PAYMENT_BADGES.APPROVED.label,
  REJECTED: PAYMENT_BADGES.REJECTED.label,
};

/** Visual tones of own payments, independent of the wording shown to the guest. */
export const PAYMENT_STATUS_TONES: Readonly<Record<PaymentStatus, StatusTone>> = {
  PENDING: PAYMENT_BADGES.PENDING.tone,
  APPROVED: PAYMENT_BADGES.APPROVED.tone,
  REJECTED: PAYMENT_BADGES.REJECTED.tone,
};

/** The state of the stay uses the same kit tones as the contract's periods. */
export const PERIOD_STATUS_TONES = {
  PAID: 'paid',
  UNDER_REVIEW: 'review',
  UNPAID: 'unpaid',
  OVERDUE: 'overdue',
} as const satisfies Readonly<Record<keyof typeof PERIOD_STATUS_LABELS, StatusTone>>;
