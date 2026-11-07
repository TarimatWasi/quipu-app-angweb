import type { components } from '@core/api/bff.generated';
import type { Environment } from './environment';
import { ENVIRONMENT_TYPE_LABELS } from '@shared/text/environment-text';
import { parseAmount } from '@shared/payments/payment-format';
import { nightsBetween } from './guest-texts';
type Stay = components['schemas']['Stay'];
type StayInput = components['schemas']['StayInput'];

export type LoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error'; readonly message: string };

/** The parts of the form a BFF error can point to. */
export type FieldKey = 'dates' | 'environment' | 'amount';

export const FIELD_KEYS: Readonly<Partial<Record<string, FieldKey>>> = {
  startDate: 'dates',
  endDate: 'dates',
  environmentId: 'environment',
  agreedAmount: 'amount',
};

export interface Notice {
  readonly title: string;
  /** Null: the BFF's own message is shown (QP-UI-17); otherwise the canvas text. */
  readonly text: string | null;
  readonly buttonLabel: string;
  /** Whether the action goes back to A3.2 (nothing left to do here). */
  readonly leaves: boolean;
}

/** The rejections shown as a modal: the occupied environment as the canvas words it. */
export const NOTICES: Readonly<Partial<Record<string, Notice>>> = {
  ENVIRONMENT_OCCUPIED: {
    title: 'El ambiente ya está ocupado en esas fechas',
    text: 'Otra persona lo ocupa en esas fechas. Elige otro ambiente libre.',
    buttonLabel: 'Elegir otro ambiente',
    leaves: false,
  },
  GUEST_NOT_ACTIVE: {
    title: 'El huésped no está activo',
    text: null,
    buttonLabel: 'Volver al huésped',
    leaves: true,
  },
  GUEST_NOT_TEMPORARY: {
    title: 'El huésped no es temporal',
    text: null,
    buttonLabel: 'Volver al huésped',
    leaves: true,
  },
};

export interface Draft {
  readonly start: string;
  readonly end: string;
  readonly environmentId: string;
  readonly amount: string;
}

export const EMPTY_DRAFT: Draft = { start: '', end: '', environmentId: '', amount: '' };

export function draftOf(stay: Stay): Draft {
  return {
    start: stay.startDate,
    end: stay.endDate,
    environmentId: stay.environmentId ?? '',
    amount: stay.agreedAmount.toFixed(2),
  };
}

export interface Option {
  readonly id: string;
  readonly label: string;
}

/** A fact of the side panel (P-11); `wide` takes both columns. */
export interface Fact {
  readonly label: string;
  readonly value: string;
  readonly wide: boolean;
}

export function optionOf(environment: Environment): Option {
  return {
    id: environment.id,
    label: `${ENVIRONMENT_TYPE_LABELS[environment.type]} ${environment.code}`,
  };
}

/** The fields of a correction that differ from the stay as it was loaded. */
export function changesOf(loaded: Stay, draft: Draft): Partial<StayInput> {
  const amount = parseAmount(draft.amount) ?? 0;
  return {
    ...(draft.environmentId !== (loaded.environmentId ?? '')
      ? { environmentId: draft.environmentId }
      : {}),
    ...(draft.start === loaded.startDate ? {} : { startDate: draft.start }),
    ...(draft.end === loaded.endDate ? {} : { endDate: draft.end }),
    ...(amount === loaded.agreedAmount ? {} : { agreedAmount: amount }),
  };
}

export function nightsValue(start: string, end: string): string {
  const nights = nightsBetween(start, end);
  return nights === null ? '—' : String(nights);
}
