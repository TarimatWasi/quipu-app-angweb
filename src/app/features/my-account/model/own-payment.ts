import type { GuestType } from '@core/auth/auth.service';
import { MAX_PROOFS } from '@shared/payments/proof-rules';

/** H3 and T2 in the SRS: «Puedes juntar hasta 5 comprobantes.» */
export const OWN_PROOF_LIMIT_TEXT = `Puedes juntar hasta ${String(MAX_PROOFS)} comprobantes.`;
export const SENT_TEXT = 'Pago enviado. Queda pendiente de revisión.';

/** What a dialog asks the page to do once it is closed. */
export type AfterNotice = 'stay' | 'reload';

export interface Notice {
  readonly title: string;
  readonly text: string;
  readonly afterClose: AfterNotice;
}

const NOT_CORRECTABLE_TEXT = 'Este pago ya no se puede corregir: está en revisión o ya se aprobó';
export const CHANGED: Notice = {
  title: 'Tu pago ya cambió',
  text: NOT_CORRECTABLE_TEXT,
  afterClose: 'reload',
};
const RESOLVED: Notice = {
  title: 'Tu pago ya cambió',
  text: 'Este pago ya fue resuelto por otro proceso',
  afterClose: 'reload',
};
export const NOT_ACTIVE: Notice = {
  title: 'Tu cuenta no está activa',
  text: 'No puedes enviar pagos mientras tu cuenta no esté activa. Consulta con la administración.',
  afterClose: 'stay',
};
const APPROVED_TEXT = 'Ya existe un pago aprobado para este período';

/**
 * The conflicts the SRS shows as a modal for each kind of guest (H3, T2), with the texts of the
 * catalog (SRS 17, QP-UI-17). A payment that can no longer be corrected comes back in read mode.
 */
export const NOTICES: Readonly<Record<GuestType, Readonly<Partial<Record<string, Notice>>>>> = {
  CONTRACT: {
    VOUCHER_NO_ACTIVE_CONTRACT: {
      title: 'No tienes un contrato vigente',
      text: 'No tienes un contrato vigente activo',
      afterClose: 'stay',
    },
    GUEST_NOT_ACTIVE: NOT_ACTIVE,
    VOUCHER_ALREADY_EXISTS: {
      title: 'Este período ya tiene un pago',
      text: 'Ya enviaste un pago para este período y la administración lo está revisando.',
      afterClose: 'reload',
    },
    PAYMENT_ALREADY_EXISTS_FOR_PERIOD: {
      title: 'Ya hay un pago aprobado',
      text: APPROVED_TEXT,
      afterClose: 'reload',
    },
    PAYMENT_NOT_CORRECTABLE: CHANGED,
    PAYMENT_ALREADY_RESOLVED: RESOLVED,
  },
  TEMPORARY: {
    VOUCHER_NO_ACTIVE_STAY: {
      title: 'No tienes una estadía vigente',
      text: 'No tienes una estadía vigente ni próxima; consulta con la administración',
      afterClose: 'stay',
    },
    GUEST_NOT_ACTIVE: NOT_ACTIVE,
    VOUCHER_ALREADY_EXISTS: {
      title: 'Ya subiste un voucher para esta estadía',
      text: 'Ya enviaste un pago para esta estadía y la administración lo está revisando.',
      afterClose: 'reload',
    },
    PAYMENT_ALREADY_EXISTS_FOR_PERIOD: {
      title: 'La estadía ya está pagada',
      text: APPROVED_TEXT,
      afterClose: 'reload',
    },
    PAYMENT_NOT_CORRECTABLE: CHANGED,
    PAYMENT_ALREADY_RESOLVED: RESOLVED,
  },
};

export type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-found'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

/** What the page is for: a first payment, the correction of a rejected one or reading one. */
export type OwnPaymentMode = 'new' | 'correct' | 'read';
