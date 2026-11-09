import type { GuestType } from '@core/auth/auth.service';
import type { components } from '@core/api/bff.generated';
import {
  formatMoney,
  formatPeriod,
  formatShortDate,
  formatStay,
  periodLabel,
} from '@shared/payments/payment-format';
import { MAX_PROOFS } from '@shared/payments/proof-rules';

/** H3 and T2 in the SRS: «Puedes juntar hasta 5 comprobantes.» */
export const OWN_PROOF_LIMIT_TEXT = `Puedes juntar hasta ${String(MAX_PROOFS)} comprobantes.`;

/** The screen H1 or T1 of each kind of guest, as the canvas names it («Volver a Estado de cuenta»). */
export const HOME_NAMES: Readonly<Record<GuestType, string>> = {
  CONTRACT: 'Estado de cuenta',
  TEMPORARY: 'Estado de pago',
};

export interface Notice {
  readonly title: string;
  readonly text: string;
}

function where(audience: GuestType): string {
  return HOME_NAMES[audience].toLowerCase();
}

const NOT_ACTIVE_TEXT =
  'No puedes enviar pagos mientras tu cuenta no esté activa. Consulta con la administración.';
const NOT_ACTIVE: Notice = { title: 'Tu cuenta no está activa', text: NOT_ACTIVE_TEXT };
const RESOLVED: Notice = {
  title: 'Tu pago ya cambió',
  text: 'Este pago ya fue resuelto por otro proceso',
};

/** What each conflict says on the canvas «Voucher» (D-88: it rules over SRS 17); every one leads back to H1 or T1. */
function noticesOf(audience: GuestType): Readonly<Partial<Record<string, Notice>>> {
  const contract = audience === 'CONTRACT';
  const home = where(audience);
  const period = contract ? 'este período' : 'esta estadía';
  return {
    GUEST_NOT_ACTIVE: NOT_ACTIVE,
    VOUCHER_ALREADY_EXISTS: {
      title: 'Ya enviaste un pago',
      text: `Ya enviaste un pago para ${period} y la administración lo está revisando. Te avisaremos en tu ${home}.`,
    },
    PAYMENT_ALREADY_EXISTS_FOR_PERIOD: {
      title: 'Ya está pagado',
      text: `${contract ? 'Ya existe un pago aprobado para este período.' : 'Tu estadía ya tiene un pago aprobado.'} No necesitas subir otro voucher.`,
    },
    PAYMENT_NOT_CORRECTABLE: {
      title: 'Tu pago ya cambió',
      text: `Este pago ya no se puede corregir: está en revisión o ya se aprobó. La administración lo completó mientras lo editabas; mira cómo quedó en tu ${home}.`,
    },
    PAYMENT_ALREADY_RESOLVED: RESOLVED,
    ...(contract
      ? {
          VOUCHER_NO_ACTIVE_CONTRACT: {
            title: 'No tienes un contrato vigente',
            text: 'No tienes un contrato vigente activo. Si debes un mes, la administración puede registrar tu pago.',
          },
        }
      : {
          VOUCHER_NO_ACTIVE_STAY: {
            title: 'No tienes una estadía vigente',
            text: 'No tienes una estadía vigente ni próxima; consulta con la administración.',
          },
        }),
  };
}

/**
 * The conflicts the canvas shows as a modal for each kind of guest (H3, T2). Its only button goes
 * back to the guest's account, which reads again what changed.
 */
export const NOTICES: Readonly<Record<GuestType, Readonly<Partial<Record<string, Notice>>>>> = {
  CONTRACT: noticesOf('CONTRACT'),
  TEMPORARY: noticesOf('TEMPORARY'),
};

export type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-found'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

/** What the page is for: a first payment, the correction of a rejected one or reading one. */
export type OwnPaymentMode = 'new' | 'correct' | 'read';

type PeriodStatus = components['schemas']['PeriodStatus'];
type StayPaymentStatus = components['schemas']['StayPaymentStatus'];
type GuestPayment = components['schemas']['GuestPayment'];

/** What the guest is paying (H3, T2): the month or the stay, what it asks, when it is due. */
export interface PaymentSummary {
  readonly label: string;
  readonly value: string;
  readonly amountLabel: string;
  readonly amount: string;
  /** Null when the screen does not know it (a payment opened by its id). */
  readonly due: string | null;
  readonly note: string;
}

const CONTRACT_NOTE =
  'Puedes juntar varios vouchers y efectivo. La administración revisa cada uno antes de aprobar el pago.';
const STAY_NOTE =
  'Se paga una sola vez por estadía, con uno o varios comprobantes. La administración los revisa antes de aprobar.';

export interface SummarySource {
  readonly audience: GuestType;
  /** The month chosen to pay (H3, first payment). */
  readonly period: PeriodStatus | null;
  /** The stay of the temporary guest (T2, first payment). */
  readonly stay: StayPaymentStatus | null;
  /** The own payment opened by its id (to correct or to read). */
  readonly payment: GuestPayment | null;
}

function creditNote(fee: number, credit: number): string {
  return credit > 0
    ? `Cuota ${formatMoney(fee)} − ${formatMoney(credit)} que tienes a favor. `
    : '';
}

/** «Lo que estás pagando»: the facts of the month or the stay on the canvas «Voucher». */
export function paymentSummary({ audience, period, stay, payment }: SummarySource): PaymentSummary {
  const contract = audience === 'CONTRACT';
  if (payment !== null) {
    const credit = payment.creditApplied;
    const fee = payment.amountDue + credit;
    // A payment still to correct says what is left to pay; one in review or approved, what it asked.
    const open = payment.status === 'REJECTED';
    let amountLabel = 'Por pagar';
    if (!open) amountLabel = contract ? 'Cuota' : 'Monto acordado';
    return {
      label: contract ? 'Mes' : 'Estadía',
      value: periodLabel({
        period: payment.period,
        stayStartDate: payment.stayStartDate ?? null,
        stayEndDate: payment.stayEndDate ?? null,
      }),
      amountLabel,
      amount: formatMoney(open ? payment.amountDue : fee),
      due: null,
      note: contract ? creditNote(fee, credit) + CONTRACT_NOTE : STAY_NOTE,
    };
  }
  if (!contract) {
    return {
      label: 'Estadía',
      value: stay ? formatStay(stay.startDate, stay.endDate) : '—',
      amountLabel: 'Monto acordado',
      amount: stay ? formatMoney(stay.agreedAmount) : '—',
      due: stay ? formatShortDate(stay.endDate) : null,
      note: STAY_NOTE,
    };
  }
  const credit = period?.creditApplied ?? 0;
  return {
    label: 'Mes',
    value: period ? formatPeriod(period.period) : 'Elige el mes',
    amountLabel: credit > 0 ? 'Por pagar' : 'Cuota',
    amount: period ? formatMoney(period.amountDue) : '—',
    due: period ? formatShortDate(period.dueDate) : null,
    note: creditNote(period?.amount ?? 0, credit) + CONTRACT_NOTE,
  };
}

/** «Pago enviado»: what the guest reads once the payment went, in the words of the canvas «Voucher». */
export function sentText(audience: GuestType, month: string | null): string {
  const what =
    audience === 'CONTRACT' && month !== null ? `Tu pago de ${month}` : 'Tu pago de la estadía';
  return `${what} está en revisión. Verás el resultado en tu ${HOME_NAMES[audience].toLowerCase()}; si no se aprueba, te diremos por qué y podrás corregirlo.`;
}
