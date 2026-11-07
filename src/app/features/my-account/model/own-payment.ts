import type { GuestType } from '@core/auth/auth.service';
import { MAX_PROOFS } from '@shared/payments/proof-rules';

/** H3 and T2 in the SRS: «Puedes juntar hasta 5 comprobantes.» */
export const OWN_PROOF_LIMIT_TEXT = `Puedes juntar hasta ${String(MAX_PROOFS)} comprobantes.`;
export const SENT_TEXT = 'Pago enviado. Queda pendiente de revisión.';

/** What a dialog asks the page to do once it is closed. */
export type AfterNotice = 'stay' | 'reload';

export interface Notice {
  readonly title: string;
  readonly afterClose: AfterNotice;
}

export const CHANGED: Notice = { title: 'Tu pago ya cambió', afterClose: 'reload' };
export const NOT_ACTIVE: Notice = { title: 'Tu cuenta no está activa', afterClose: 'stay' };

/**
 * The conflicts the SRS shows as a modal for each kind of guest (H3, T2), with the BFF's own
 * message (QP-UI-17). A payment that can no longer be corrected comes back in read mode.
 */
export const NOTICES: Readonly<Record<GuestType, Readonly<Partial<Record<string, Notice>>>>> = {
  CONTRACT: {
    VOUCHER_NO_ACTIVE_CONTRACT: { title: 'No tienes un contrato vigente', afterClose: 'stay' },
    GUEST_NOT_ACTIVE: NOT_ACTIVE,
    VOUCHER_ALREADY_EXISTS: { title: 'Este período ya tiene un pago', afterClose: 'reload' },
    PAYMENT_ALREADY_EXISTS_FOR_PERIOD: { title: 'Ya hay un pago aprobado', afterClose: 'reload' },
    PAYMENT_NOT_CORRECTABLE: CHANGED,
    PAYMENT_ALREADY_RESOLVED: CHANGED,
  },
  TEMPORARY: {
    VOUCHER_NO_ACTIVE_STAY: { title: 'No tienes una estadía vigente', afterClose: 'stay' },
    GUEST_NOT_ACTIVE: NOT_ACTIVE,
    VOUCHER_ALREADY_EXISTS: {
      title: 'Ya subiste un voucher para esta estadía',
      afterClose: 'reload',
    },
    PAYMENT_ALREADY_EXISTS_FOR_PERIOD: { title: 'La estadía ya está pagada', afterClose: 'reload' },
    PAYMENT_NOT_CORRECTABLE: CHANGED,
    PAYMENT_ALREADY_RESOLVED: CHANGED,
  },
};

export type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-found'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

/** What the page is for: a first payment, the correction of a rejected one or reading one. */
export type OwnPaymentMode = 'new' | 'correct' | 'read';
