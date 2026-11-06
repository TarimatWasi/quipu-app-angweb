import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';
import type { PERIOD_STATUS_LABELS } from '@shared/payments/payment-format';

/** How the guest sees the state of one of its payments (H3 «Tu pago», H4). */
export const PAYMENT_STATUS_LABELS: Readonly<Record<'PENDING' | 'APPROVED' | 'REJECTED', string>> =
  {
    PENDING: 'Pendiente de revisión',
    APPROVED: 'Aprobado',
    REJECTED: 'Rechazado',
  };

/** Visual tones of own payments, independent of the wording shown to the guest. */
export const PAYMENT_STATUS_TONES = {
  PENDING: 'review',
  APPROVED: 'paid',
  REJECTED: 'rejected',
} as const satisfies Readonly<Record<keyof typeof PAYMENT_STATUS_LABELS, StatusTone>>;

/** The state of the stay uses the same kit tones as the contract's periods. */
export const PERIOD_STATUS_TONES = {
  PAID: 'paid',
  UNDER_REVIEW: 'review',
  UNPAID: 'unpaid',
  OVERDUE: 'overdue',
} as const satisfies Readonly<Record<keyof typeof PERIOD_STATUS_LABELS, StatusTone>>;
