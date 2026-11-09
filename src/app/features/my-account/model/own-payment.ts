import type { GuestType } from '@core/auth/auth.service';
import { MAX_PROOFS } from '@shared/payments/proof-rules';

/** H3 and T2 in the SRS: «Puedes juntar hasta 5 comprobantes.» */
export const OWN_PROOF_LIMIT_TEXT = `Puedes juntar hasta ${String(MAX_PROOFS)} comprobantes.`;
export const SENT_TEXT = 'Pago enviado. Queda pendiente de revisión.';

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
