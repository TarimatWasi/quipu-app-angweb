import type { components } from '@core/api/bff.generated';
import {
  creditBalanceText,
  creditUseText,
  dueBreakdownText,
  surplusText,
} from '@shared/payments/credit-texts';
import {
  daysFromToday,
  formatMoney,
  formatPeriod,
  hasRejectedPayment,
  longDay,
  monthName,
  takesNewPayment,
} from '@shared/payments/payment-format';
import { PERIOD_BADGES, toPeriodRow } from '@shared/payments/period-rows';
import type { PaymentAction, PeriodRow, StateBadge } from '@shared/payments/period-rows';
type PeriodStatus = components['schemas']['PeriodStatus'];
type GuestCredit = components['schemas']['GuestCredit'];

/** H1 «Estado de cuenta» (CU-16) as the canvas «H1» words it: the months and what to do now. */

export const ACCOUNT_TITLE = 'Estado de cuenta';
export const LOAD_ACCOUNT_TEXT = 'No se pudo cargar tu estado de cuenta.';
export const MONTHS_HEADING = 'Tus meses';
export const MONTHS_EMPTY_HEADING = 'Aún no tienes meses por pagar.';
export const MONTHS_EMPTY_TEXT = 'Aparecen cuando empieza tu contrato.';
export const HISTORY_LINK_TEXT = 'Ver el historial de pagos';

/** The action of a month for the guest: upload its voucher, correct its payment or see it. */
function guestAction(period: PeriodStatus): PaymentAction | null {
  if (hasRejectedPayment(period) && period.paymentId) {
    return { label: 'Corregir pago', link: ['/guest/payments', period.paymentId], query: null };
  }
  if (takesNewPayment(period)) {
    return {
      label: 'Subir voucher',
      link: ['/guest/payments/new'],
      query: { period: period.period },
    };
  }
  // A month paid with credit alone has no payment to open (RN-38): nothing to do with it.
  return period.paymentId
    ? { label: 'Ver pago', link: ['/guest/payments', period.paymentId], query: null }
    : null;
}

/** «Pagos por mes» of the guest: each month with its own action and, if it has credit, its note. */
export function accountRows(periods: readonly PeriodStatus[]): PeriodRow[] {
  return periods.map((period) => ({
    ...toPeriodRow(period, ''),
    action: guestAction(period),
    note: dueBreakdownText(period),
  }));
}

/** «Lo que toca ahora» of the guest: what is left to pay, or that nothing is. */
export interface AccountNow {
  readonly figure: string;
  readonly label: string;
  readonly text: string;
  /** The figure in red ink: a month is late. */
  readonly urgent: boolean;
  readonly badge: StateBadge | null;
  readonly action: PaymentAction | null;
}

const capital = (name: string): string => name.charAt(0).toUpperCase() + name.slice(1);

/** «septiembre», «octubre»: the month inside a sentence. */
function month(period: string): string {
  return monthName(period) ?? period;
}

function spanishList(items: readonly string[]): string {
  const last = items.at(-1) ?? '';
  return items.length <= 1 ? last : `${items.slice(0, -1).join(', ')} y ${last}`;
}

/** «venció el 5 de octubre» or, before the day, «vence el 5 de noviembre». */
function dueClause(period: PeriodStatus, now: Date): string {
  const days = daysFromToday(period.dueDate, now);
  return `${days !== null && days >= 0 ? 'vence' : 'venció'} el ${longDay(period.dueDate, now)}`;
}

const uploadAction = (period: PeriodStatus): PaymentAction => ({
  label: `Subir voucher de ${month(period.period)}`,
  link: ['/guest/payments/new'],
  query: { period: period.period },
});

function owedNow(owed: readonly PeriodStatus[], now: Date): AccountNow {
  const total = owed.reduce((sum, period) => sum + period.amountDue, 0);
  const [first] = owed;
  const rejected = owed.filter(hasRejectedPayment).at(-1);
  const urgent = owed.some((period) => period.status === 'OVERDUE');
  const label =
    owed.length === 1 && first
      ? formatPeriod(first.period)
      : `${String(owed.length)} meses por pagar`;
  const base = {
    figure: formatMoney(total),
    label,
    urgent,
    badge: PERIOD_BADGES[first?.status ?? 'UNPAID'],
  } as const;
  if (rejected?.paymentId) {
    return {
      ...base,
      text: `${capital(month(rejected.period))} ${dueClause(rejected, now)} y tu pago no se aprobó. Tus comprobantes siguen ahí: agrega uno por la diferencia o corrige el que enviaste.`,
      action: {
        label: `Corregir pago de ${month(rejected.period)}`,
        link: ['/guest/payments', rejected.paymentId],
        query: null,
      },
    };
  }
  if (owed.length > 1 && first) {
    const parts = owed.map((period, index) => {
      const day = longDay(period.dueDate, now);
      return index === 0
        ? `${capital(month(period.period))} venció el ${day}`
        : `${month(period.period)} el ${day}`;
    });
    return {
      ...base,
      text: `${spanishList(parts)}. Empieza por ${month(first.period)}.`,
      action: uploadAction(first),
    };
  }
  const credit = first && first.creditApplied > 0;
  return {
    ...base,
    text:
      first && credit
        ? `${capital(dueClause(first, now))}. Tu cuota es ${formatMoney(first.amount)} y se descuentan los ${formatMoney(first.creditApplied)} que tienes a favor.`
        : `${first ? capital(dueClause(first, now)) : ''}. Cuando pagues, sube aquí la foto o el PDF del voucher.`,
    action: first ? uploadAction(first) : null,
  };
}

export function accountNow(periods: readonly PeriodStatus[], now: Date): AccountNow {
  const owed = periods
    .filter((period) => period.status === 'UNPAID' || period.status === 'OVERDUE')
    .sort((a, b) => a.period.localeCompare(b.period));
  if (owed.length > 0) return owedNow(owed, now);
  const review = periods.find((period) => period.status === 'UNDER_REVIEW');
  if (review) {
    return {
      figure: formatMoney(review.amountDue),
      label: formatPeriod(review.period),
      text: 'La administración está revisando tu pago. No necesitas hacer nada más.',
      urgent: false,
      badge: PERIOD_BADGES.UNDER_REVIEW,
      action: review.paymentId
        ? {
            label: `Ver pago de ${month(review.period)}`,
            link: ['/guest/payments', review.paymentId],
            query: null,
          }
        : null,
    };
  }
  if (periods.length === 0) {
    return {
      figure: 'Al día',
      label: MONTHS_EMPTY_HEADING,
      text: MONTHS_EMPTY_TEXT,
      urgent: false,
      badge: null,
      action: null,
    };
  }
  return {
    figure: 'Al día',
    label: 'Todos tus meses están pagados',
    text: 'No tienes nada pendiente.',
    urgent: false,
    badge: null,
    action: null,
  };
}

/** The alert of a payment that was not approved: the month and why (D-34d), only in the app. */
export interface RejectedAlert {
  readonly heading: string;
  readonly reason: string | null;
}

export function rejectedAlert(periods: readonly PeriodStatus[]): RejectedAlert | null {
  const rejected = periods.filter(hasRejectedPayment).at(-1);
  if (!rejected) return null;
  return {
    heading: `Tu pago de ${month(rejected.period)} no se aprobó.`,
    reason: rejected.rejectionReason ? `Motivo: ${rejected.rejectionReason}` : null,
  };
}

/** The notice of the credit in favour (RN-38) or of the last refund when none is left. */
export interface CreditNotice {
  readonly heading: string;
  readonly text: string;
  readonly tone: 'info' | 'success';
}

export function creditNotice(
  credit: GuestCredit | null,
  periods: readonly PeriodStatus[],
): CreditNotice | null {
  if (credit === null) return null;
  if (credit.balance > 0) {
    const using = periods.find((period) => period.status !== 'PAID' && period.creditApplied > 0);
    return {
      heading: creditBalanceText(credit.balance),
      text: creditUseText({
        toRefund: credit.toRefund,
        month: using?.period ?? null,
        origins: credit.origins,
      }),
      tone: 'info',
    };
  }
  if (credit.lastRefund) {
    const text = surplusText({
      amount: credit.lastRefund.amount,
      refundStatus: 'REFUNDED',
      refundedOn: credit.lastRefund.date,
      refundMethod: credit.lastRefund.method,
    });
    return { heading: text, text: 'Ya no tienes saldo a favor.', tone: 'success' };
  }
  return null;
}
