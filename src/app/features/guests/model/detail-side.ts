import type { components } from '@core/api/bff.generated';
import type { GuestDetail } from '@core/api/clients/admin-guests.service';
import { formatDate, formatMoney } from '@shared/payments/payment-format';
import { ENVIRONMENT_TYPE_LABELS } from '@shared/text/environment-text';
import type { StatusTone } from '@shared/ui/status-badge/status-badge.component';
import { documentText, GUEST_STATUS_BADGES, GUEST_TYPE_LABELS, STATUS_TONES } from './guest-texts';

export type { GuestDetail };

/** The right column of A3.2 on the canvas «HuespedDetalle»: Sus datos, Contrato, Su registro. */

export type Contract = components['schemas']['Contract'];
export type OnboardingProgress = components['schemas']['OnboardingProgress'];
type EmergencyContact = components['schemas']['EmergencyContact'];

/** A value longer than this goes one step smaller (24 px, 20 on a phone), so it never overflows. */
export const LONG_FACT = 18;

export interface DetailFact {
  readonly label: string;
  readonly value: string;
  readonly wide: boolean;
  readonly long: boolean;
}

function fact(label: string, value: string, wide = false): DetailFact {
  return { label, value, wide, long: value.length > LONG_FACT };
}

/** The state of the guest as a badge of the kit (P-08). */
export function guestStatusBadge(status: GuestDetail['status']): {
  readonly label: string;
  readonly tone: StatusTone;
} {
  const badge = GUEST_STATUS_BADGES[status];
  return { label: badge.label, tone: STATUS_TONES[badge.tone] };
}

export const NO_PHONE = 'Sin teléfono';
export const NO_EMAIL = 'Sin correo';
export const NO_EMERGENCY = 'Sin registrar';

/** «Rosa Huamán (madre) · 984 112 233», with what the guest saved; null without a name or phone. */
export function emergencyText(contact: EmergencyContact | undefined): string | null {
  const name = contact?.name?.trim() ?? '';
  const phone = contact?.phone?.trim() ?? '';
  const relationship = contact?.relationship?.trim() ?? '';
  const who = relationship === '' || name === '' ? name : `${name} (${relationship})`;
  const text = [who, phone].filter((part) => part !== '').join(' · ');
  return text === '' ? null : text;
}

/**
 * «Sus datos»: the facts before the state badge (Documento) and after it (Tipo, Teléfono, Correo
 * and, once it went through the onboarding, the emergency contact). The badge goes in between.
 */
export function dataFacts(guest: GuestDetail): {
  readonly before: readonly DetailFact[];
  readonly after: readonly DetailFact[];
} {
  const phone = guest.phone?.trim() ?? '';
  const email = guest.contactEmail?.trim() ?? '';
  const after = [
    fact('Tipo', GUEST_TYPE_LABELS[guest.type]),
    fact('Teléfono', phone === '' ? NO_PHONE : phone),
    fact('Correo', email === '' ? NO_EMAIL : email, true),
  ];
  if (guest.status === 'ACTIVE' || guest.status === 'INACTIVE') {
    after.push(
      fact('Contacto de emergencia', emergencyText(guest.emergencyContact) ?? NO_EMERGENCY, true),
    );
  }
  return { before: [fact('Documento', documentText(guest))], after };
}

export const PENDING_DATA_NOTE =
  'Su nombre y sus datos los completa el huésped al activar su acceso.';
export const DATA_NOTE = 'Sus datos de contacto los cambia solo el huésped, desde Mis datos.';

export function dataNote(guest: GuestDetail): string {
  return guest.status === 'PENDING_ACTIVATION' ? PENDING_DATA_NOTE : DATA_NOTE;
}

/** «Contrato» while in force, «Último contrato» once it ended. */
export function contractTitle(contract: Contract): string {
  return contract.status === 'ACTIVE' ? 'Contrato' : 'Último contrato';
}

/** «1 jul 2026 – 30 jun 2027», or «Desde 1 jul 2026» for an open-ended contract (RN-07). */
function validity(contract: Contract): string {
  const end = contract.terminatedAt ?? contract.endDate ?? null;
  const start = formatDate(contract.startDate);
  return end === null ? `Desde ${start}` : `${start} – ${formatDate(end)}`;
}

/**
 * «Contrato»: the facts before its state badge (Ambiente) and after it (Cuota, Día de pago,
 * Vigencia). The badge goes in between, as in «Sus datos».
 */
export function contractFacts(contract: Contract): {
  readonly before: readonly DetailFact[];
  readonly after: readonly DetailFact[];
} {
  return {
    before: [
      fact(
        'Ambiente',
        `${ENVIRONMENT_TYPE_LABELS[contract.environmentType]} ${contract.environmentCode}`,
      ),
    ],
    after: [
      fact('Cuota', formatMoney(contract.monthlyAmount)),
      fact('Día de pago', `${String(contract.paymentDay)} de cada mes`),
      fact('Vigencia', validity(contract), true),
    ],
  };
}

/** The state of a contract as a badge: «Activo» in green, «Finalizado» in grey. */
export function contractStatusBadge(contract: Contract): {
  readonly label: string;
  readonly tone: StatusTone;
} {
  return contract.status === 'ACTIVE'
    ? { label: 'Activo', tone: 'paid' }
    : { label: 'Finalizado', tone: 'unpaid' };
}

/** One step of the registration of the guest (P-25), in the order the guest takes them (RN-33). */
export interface OnboardingStep {
  readonly label: string;
  /** As it goes inside a sentence: «documentos (opcional)». */
  readonly inSentence: string;
  readonly done: boolean;
  readonly optional: boolean;
}

const STEPS = [
  { label: 'Contraseña', inSentence: 'contraseña', optional: false },
  { label: 'Datos personales', inSentence: 'datos personales', optional: false },
  { label: 'Documentos', inSentence: 'documentos (opcional)', optional: true },
  { label: 'Consentimiento', inSentence: 'consentimiento', optional: false },
] as const;

const STEPS_DONE: Readonly<Record<OnboardingProgress, number>> = {
  NOT_STARTED: 0,
  PASSWORD_SET: 1,
  PERSONAL_DATA_SAVED: 2,
  DOCUMENTS_DONE: 3,
  COMPLETED: 4,
};

export function onboardingSteps(progress: OnboardingProgress): readonly OnboardingStep[] {
  const done = STEPS_DONE[progress];
  return STEPS.map((step, index) => ({ ...step, done: index < done }));
}

/** «documentos (opcional) y consentimiento». */
export function joinWords(words: readonly string[]): string {
  if (words.length <= 1) return words.join('');
  return `${words.slice(0, -1).join(', ')} y ${words.at(-1) ?? ''}`;
}
