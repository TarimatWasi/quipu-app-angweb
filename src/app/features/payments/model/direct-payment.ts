import type { components } from '@core/api/bff.generated';
import { formatMoney, periodLabel } from '@shared/payments/payment-format';
import type { Balance } from '@shared/payments/payment-format';
import type { BalanceNotice } from './payment-review';

/** A5.1 «Registrar pago directo», as the canvas words it (PagoDirecto), Spanish only. */

// Every type comes from the contract (TAR-23).
type PayablePeriod = components['schemas']['PayablePeriod'];

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
