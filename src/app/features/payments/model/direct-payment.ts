import type { components } from '@core/api/bff.generated';
import { formatMoney, periodLabel } from '@shared/payments/payment-format';
import { MAX_PROOFS } from '@shared/payments/proof-rules';
import type { Balance } from '@shared/payments/payment-format';
import type { BalanceNotice } from './payment-review';

/** A5.1 «Registrar pago directo», as the canvas words it (PagoDirecto), Spanish only. */

// Every type comes from the contract (TAR-23).
type PayablePeriod = components['schemas']['PayablePeriod'];
type GuestSummary = components['schemas']['GuestSummary'];

/** One tile of «Lo que se está pagando». */
export interface PayingTile {
  readonly label: string;
  readonly value: string;
  /** The guest takes the whole row. */
  readonly wide: boolean;
}

/** The guest and, once chosen, the month or stay with what is due and the credit it uses (RN-38). */
export function payingTiles(guest: string, item: PayablePeriod | null): PayingTile[] {
  const tiles: PayingTile[] = [{ label: 'Huésped', value: guest, wide: true }];
  if (item === null) return tiles;
  const stay = item.stayId !== null;
  tiles.push(
    { label: stay ? 'Estadía' : 'Mes', value: periodLabel(item), wide: false },
    { label: stay ? 'Acordado' : 'Cuota', value: formatMoney(item.expectedAmount), wide: false },
  );
  if (item.creditApplied > 0) {
    tiles.push(
      { label: 'Crédito a favor', value: `− ${formatMoney(item.creditApplied)}`, wide: false },
      { label: 'Por pagar', value: formatMoney(item.amountDue), wide: false },
    );
  }
  return tiles;
}

/** The note under the tiles: what registering does, and where the credit comes from. */
export function payingNote(item: PayablePeriod | null): string {
  if (item !== null && item.creditApplied > 0) {
    return 'El crédito a favor se descuenta de lo que corresponde (RN-38). Lo registrado queda aprobado: anota lo que verificaste.';
  }
  return 'Lo registrado queda aprobado: anota lo que verificaste.';
}

/** «Suma recibida» against what is due: Completo, Faltan or Sobran, and where the surplus goes. */
export function receivedNotice(balance: Balance | null, item: PayablePeriod | null): BalanceNotice {
  if (balance === null || item === null) {
    return {
      tone: 'info',
      heading: 'Elige el período',
      text: 'para comparar lo recibido con lo que corresponde.',
    };
  }
  const stay = item.stayId !== null;
  switch (balance.kind) {
    case 'complete':
      return {
        tone: 'success',
        heading: 'Completo.',
        text: `Lo recibido cubre ${stay ? 'el monto acordado' : 'la cuota'}.`,
      };
    case 'short':
      return {
        tone: 'error',
        heading: `Faltan ${formatMoney(balance.difference)}.`,
        text: `Corresponde ${formatMoney(item.amountDue)}.`,
      };
    case 'over':
      return {
        tone: 'info',
        heading: `Sobran ${formatMoney(balance.difference)}.`,
        text: balance.refund
          ? `${stay ? 'Es su única estadía' : 'Es el último mes de su contrato'}: al registrar queda una devolución por registrar en Finanzas.`
          : 'Quedan como crédito para el mes siguiente.',
      };
  }
}

/** Texts of A5.1 in the SRS (Textos de validación). */
export const GUEST_TEXT = 'Elige un huésped';
export const FUTURE_DATE_TEXT = 'La fecha no puede ser posterior a hoy';
export const PROOF_LIMIT_TEXT = `Hasta ${String(MAX_PROOFS)} comprobantes por pago.`;

/** The 409 conflicts the SRS shows as a modal, with the BFF's own message (QP-UI-17). */
export const NOTICE_TITLES: Readonly<Partial<Record<string, string>>> = {
  GUEST_NOT_ACTIVE: 'El huésped no está activo',
  PAYMENT_ALREADY_EXISTS_FOR_PERIOD: 'Ya hay un pago aprobado',
  VOUCHER_ALREADY_EXISTS: 'Este período ya tiene un pago',
};

/** Only periods and stays without any payment take a direct one (TAR-239). */
export const PAYABLE: ReadonlySet<PayablePeriod['status']> = new Set(['UNPAID', 'OVERDUE']);

export const TYPE_LABELS: Readonly<Record<GuestSummary['type'], string>> = {
  CONTRACT: 'Con contrato',
  TEMPORARY: 'Temporal',
};

interface GuestLike {
  readonly name: string | null;
  readonly documentNumber: string;
  readonly type: GuestSummary['type'];
}

/** The name of a guest, which links to its detail (A3.2), and the rest of its label. */
export interface GuestText {
  readonly name: string;
  readonly detail: string;
}

export function guestText(guest: GuestLike): GuestText {
  return {
    name: guest.name ?? 'Sin nombre aún',
    detail: `${guest.documentNumber} · ${TYPE_LABELS[guest.type]}`,
  };
}

export function guestLabel(guest: GuestLike): string {
  const { name, detail } = guestText(guest);
  return `${name} · ${detail}`;
}

/** The value of a period in the select; a month and a stay id never collide. */
export function periodKey(item: PayablePeriod): string | null {
  if (item.period !== null) return `p:${item.period}`;
  return item.stayId !== null ? `id:${item.stayId}` : null;
}

export interface PeriodOption {
  readonly key: string;
  readonly label: string;
  readonly item: PayablePeriod;
}

export function optionOf(item: PayablePeriod): PeriodOption | null {
  const key = periodKey(item);
  if (key === null) return null;
  const overdue = item.status === 'OVERDUE' ? ' · Atrasado' : '';
  return {
    key,
    label: `${periodLabel(item)}${overdue} · Por pagar ${formatMoney(item.amountDue)}`,
    item,
  };
}

/** Today in the time of the residence, as yyyy-mm-dd. */
export function todayInLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

export type LoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'error'; readonly message: string };
