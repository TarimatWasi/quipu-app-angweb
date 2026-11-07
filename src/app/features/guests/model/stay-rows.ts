import type { Stay } from '@core/api/clients/admin-guests.service';
import { formatMoney } from '@shared/payments/payment-format';
import { NO_ENVIRONMENT, nightsBetween, nightsText, stayDatesWithYear } from './guest-texts';
import { PERIOD_BADGES, paymentAction } from '@shared/payments/period-rows';
import type { PaymentAction, StateBadge } from '@shared/payments/period-rows';

/** One stay of A3.2 «Estadías» (RN-13): one card, newest first, with its single payment (RN-03). */
export interface StayRow {
  readonly id: string;
  /** «20 – 31 oct 2026», in bold. */
  readonly dates: string;
  /** «C1 · 11 noches». */
  readonly sub: string;
  readonly amount: string;
  readonly badge: StateBadge;
  readonly payment: PaymentAction | null;
}

export function toStayRow(stay: Stay, guestId: string): StayRow {
  const nights = nightsBetween(stay.startDate, stay.endDate);
  // The Stay of the contract carries the code of its environment, not its type.
  const environment = stay.environmentCode ?? NO_ENVIRONMENT;
  return {
    id: stay.id,
    dates: stayDatesWithYear(stay.startDate, stay.endDate),
    sub: nights === null ? environment : `${environment} · ${nightsText(nights)}`,
    amount: formatMoney(stay.agreedAmount),
    badge: PERIOD_BADGES[stay.paymentStatus],
    payment: paymentAction(stay.paymentStatus, stay.paymentId, guestId),
  };
}
