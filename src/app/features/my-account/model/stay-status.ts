import type { components } from '@core/api/bff.generated';
import { surplusText } from '@shared/payments/credit-texts';
import {
  daysFromToday,
  formatMoney,
  formatShortDate,
  formatStay,
  hasRejectedPayment,
  longDay,
  takesNewPayment,
} from '@shared/payments/payment-format';
import { PERIOD_BADGES } from '@shared/payments/period-rows';
import type { PaymentAction, StateBadge } from '@shared/payments/period-rows';
type StayPaymentStatus = components['schemas']['StayPaymentStatus'];

/** T1 «Estado de pago» (CU-21) as the canvas «T1» words it: the stay and what to do with its payment. */

export const STAY_TITLE = 'Estado de pago';
export const LOAD_STAY_TEXT = 'No se pudo cargar tu estado de pago.';
export const NO_STAY_TITLE = 'Aún no tienes una estadía registrada';
export const NO_STAY_TEXT =
  'Cuando la administración la registre, aquí verás sus fechas y el monto, y podrás subir tu voucher.';
export const ONE_PAYMENT_NOTE =
  'Se paga una sola vez por estadía. Si te quedas más días, la administración registra una estadía nueva con su propio pago.';

/** The stay says «Tu próxima estadía» while it has not started. */
export function isNext(stay: StayPaymentStatus, now: Date): boolean {
  const days = daysFromToday(stay.startDate, now);
  return days !== null && days > 0;
}

export function stayHeading(stay: StayPaymentStatus, now: Date): string {
  return isNext(stay, now) ? 'Tu próxima estadía' : 'Tu estadía';
}

/** «Lo que toca ahora» of the temporary guest: what the stay costs, its state and the way to pay it. */
export interface StayNow {
  readonly figure: string;
  readonly label: string;
  readonly text: string;
  /** The figure in red ink: the stay is over and not paid. */
  readonly urgent: boolean;
  readonly badge: StateBadge;
  readonly action: PaymentAction | null;
}

const OPEN_PAYMENT = '/temporary-guest/payment';

function nowText(stay: StayPaymentStatus, now: Date): string {
  const leaves = longDay(stay.endDate, now);
  if (hasRejectedPayment(stay)) {
    return `Tus comprobantes siguen ahí: cambia la foto del voucher o agrega otro antes de tu salida, el ${leaves}.`;
  }
  switch (stay.status) {
    case 'PAID':
      return 'Tu pago está aprobado. No tienes nada pendiente.';
    case 'UNDER_REVIEW':
      return 'La administración está revisando tu pago. No necesitas hacer nada más.';
    case 'OVERDUE':
      return `Tu estadía terminó el ${leaves} y aún no tiene un pago aprobado.`;
    case 'UNPAID':
      return isNext(stay, now)
        ? `Tu próxima estadía empieza el ${longDay(stay.startDate, now)}. Puedes pagarla desde ya.`
        : `Paga antes de tu salida, el ${leaves}, y sube aquí la foto o el PDF del voucher.`;
  }
}

function stayAction(stay: StayPaymentStatus): PaymentAction | null {
  if (hasRejectedPayment(stay) && stay.paymentId) {
    return { label: 'Corregir pago', link: [OPEN_PAYMENT, stay.paymentId], query: null };
  }
  if (takesNewPayment(stay)) return { label: 'Subir voucher', link: [OPEN_PAYMENT], query: null };
  return stay.status === 'UNDER_REVIEW' && stay.paymentId
    ? { label: 'Ver pago', link: [OPEN_PAYMENT, stay.paymentId], query: null }
    : null;
}

export function stayNow(stay: StayPaymentStatus, now: Date): StayNow {
  return {
    figure: formatMoney(stay.agreedAmount),
    label: `Estadía del ${formatStay(stay.startDate, stay.endDate)}`,
    text: nowText(stay, now),
    urgent: stay.status === 'OVERDUE',
    badge: PERIOD_BADGES[stay.status],
    action: stayAction(stay),
  };
}

/** The alert of a payment that was not approved, with why (D-34d), only in the app. */
export function rejectedStayAlert(
  stay: StayPaymentStatus,
): { heading: string; reason: string | null } | null {
  if (!hasRejectedPayment(stay)) return null;
  return {
    heading: 'Tu pago no se aprobó.',
    reason: stay.rejectionReason ? `Motivo: ${stay.rejectionReason}` : null,
  };
}

/** What was paid over the agreed amount is refunded, never kept as credit (RN-38, RN-39). */
export function refundNotice(
  stay: StayPaymentStatus,
): { heading: string; text: string; tone: 'info' | 'success' } | null {
  const surplus = stay.surplus;
  if (!surplus || surplus.amount <= 0) return null;
  const money = formatMoney(surplus.amount);
  const pending = surplus.refundStatus === 'PENDING';
  return {
    heading: surplusText(surplus),
    text: pending
      ? `La administración te devolverá la diferencia de ${money} y aquí verás cuándo y por qué medio.`
      : 'Ya no tienes nada que recibir por esta estadía.',
    tone: pending ? 'info' : 'success',
  };
}

export interface StayFact {
  readonly label: string;
  readonly value: string;
}

/** The nights between the entry and the exit. */
function nights(stay: StayPaymentStatus): number {
  const start = Date.parse(stay.startDate);
  const end = Date.parse(stay.endDate);
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

/** «Tu estadía»: entry, exit, nights and the agreed amount (the canvas' four tiles). */
export function stayFacts(stay: StayPaymentStatus): StayFact[] {
  return [
    { label: 'Entrada', value: formatShortDate(stay.startDate) },
    { label: 'Salida', value: formatShortDate(stay.endDate) },
    { label: 'Noches', value: String(nights(stay)) },
    { label: 'Monto acordado', value: formatMoney(stay.agreedAmount) },
  ];
}
