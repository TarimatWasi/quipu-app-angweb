import type { components } from '@core/api/bff.generated';
import type { CallFailure } from '@shared/forms/call-failure';
import { NETWORK_TEXT, RATE_LIMITED_TEXT } from '@shared/text/error-text';
import type { Step } from '@shared/ui/step-list/step-list.component';

/** O1 to O3 «Tu registro» (CU-25, CU-26, RN-33), as the canvas «Onboarding» words them. */

export type OnboardingStep = components['schemas']['OnboardingInProgress']['nextStep'];

/** The page of each step: the BFF says which one is next and the screen goes there. */
export const STEP_PATHS: Readonly<Record<OnboardingStep, string>> = {
  PERSONAL_DATA: '/onboarding/personal-data',
  DOCUMENTS: '/onboarding/documents',
  CONSENT: '/onboarding/consent',
};

/** Where a guest goes when it has nothing left to do: its home, which is H1 or T1 by its type. */
export const HOME_PATH = '/home';

export const LOAD_TEXT = 'No se pudo cargar tu registro.';
export const STEPS_LABEL = 'Pasos de tu registro';
export const STEPS_TITLE = 'Tu registro';
export const LEAVE_NOTE =
  'Puedes salir cuando quieras: cada paso se guarda y, al volver a entrar, sigues donde te quedaste.';
export const COMPLETED_TEXT = 'Tu registro está completo.';

const TOTAL_STEPS = 4;

export interface StepText {
  readonly title: string;
  readonly intro: string;
}

export const STEP_TEXTS: Readonly<Record<OnboardingStep, StepText>> = {
  PERSONAL_DATA: {
    title: 'Tus datos',
    intro:
      'Así te conoce la administración y sabe cómo comunicarse contigo. Solo el nombre y el teléfono son obligatorios.',
  },
  DOCUMENTS: {
    title: 'Tus documentos',
    intro:
      'Este paso es opcional. Te recomendamos una foto de tu documento de identidad, por los dos lados.',
  },
  CONSENT: {
    title: 'Tu consentimiento',
    intro: 'Es el último paso. Lee cómo usamos tus datos; sin aceptarlo no puedes usar tu cuenta.',
  },
};

/** «Tu registro · paso 2 de 4»: the password is the first step, already done. */
export function stepCounter(step: OnboardingStep): string {
  const number = { PERSONAL_DATA: 2, DOCUMENTS: 3, CONSENT: 4 }[step];
  return `Tu registro · paso ${String(number)} de ${String(TOTAL_STEPS)}`;
}

function filesText(count: number): string | undefined {
  if (count <= 0) return undefined;
  return count === 1 ? '1 archivo' : `${String(count)} archivos`;
}

/** P-25: the four steps of the registration, the one the guest is on marked as «Ahora». */
export function registrationSteps(at: OnboardingStep, documents: number): Step[] {
  const order: readonly OnboardingStep[] = ['PERSONAL_DATA', 'DOCUMENTS', 'CONSENT'];
  const index = order.indexOf(at);
  const detail = filesText(documents);
  return [
    { label: 'Contraseña', done: true, optional: false },
    { label: 'Tus datos', done: index > 0, optional: false, current: at === 'PERSONAL_DATA' },
    {
      label: 'Documentos',
      done: index > 1,
      optional: true,
      current: at === 'DOCUMENTS',
      ...(detail !== undefined && { detail }),
    },
    { label: 'Consentimiento', done: false, optional: false, current: at === 'CONSENT' },
  ];
}

// The registration finished in another window (ONBOARDING_ALREADY_COMPLETED).

export const COMPLETE_TITLE = 'Tu registro ya está completo';
export const COMPLETE_BUTTON = 'Ir a mi cuenta';
export const COMPLETE_MESSAGES: Readonly<Record<OnboardingStep, string>> = {
  PERSONAL_DATA:
    'Lo terminaste en otra ventana. Tus datos ya están guardados; si quieres cambiarlos, hazlo desde Mis datos.',
  DOCUMENTS:
    'Lo terminaste en otra ventana. Si te faltó subir un documento, puedes hacerlo desde Mis datos.',
  CONSENT: 'Lo terminaste en otra ventana. Ya puedes usar tu cuenta.',
};

/** The registration was already closed, whatever step was being sent. */
export function isAlreadyCompleted({ status, code }: CallFailure): boolean {
  return status === 409 && code === 'ONBOARDING_ALREADY_COMPLETED';
}

/** A step was sent before the one that comes first: the screen asks where it should be. */
export function isOutOfOrder({ status, code }: CallFailure): boolean {
  return status === 409 && code === 'ONBOARDING_STEP_OUT_OF_ORDER';
}

// O1 «Tus datos».

export const DATA_AFTER = 'Después: tus documentos (opcional).';

// O2 «Tus documentos».

export const DOCUMENTS_LIMIT = 5;
export const DOCUMENT_RULES_NOTE =
  'JPG, PNG o PDF, hasta 5 MB cada uno, máximo 5. Solo la administración los ve. Una vez subidos no los puedes borrar ni cambiar: si te equivocas, pídeselo a la administración. Después del registro puedes subir más desde Mis datos.';
export const DOCUMENTS_AFTER = 'Después: el consentimiento para usar tus datos.';
export const DOCUMENT_FIELD_LABEL = 'Archivo del documento';

export function documentsPrompt(chosen: number): string {
  return chosen === 0
    ? 'Elige fotos o PDF de tus documentos.'
    : `Puedes agregar ${String(DOCUMENTS_LIMIT - chosen)} más.`;
}

export function documentsCount(total: number): string {
  return `${String(total)} de ${String(DOCUMENTS_LIMIT)}`;
}

/** The label of the main button of O2: what it does with what the guest chose. */
export function documentsButton(uploaded: number, chosen: number, sending: number): string {
  if (sending > 0) return `Subiendo ${String(sending)} de ${String(chosen)}…`;
  if (chosen > 0) return 'Subir y continuar';
  return uploaded > 0 ? 'Continuar' : 'Continuar sin documentos';
}

export const FINISH_FAILED_TEXT = 'No se pudo continuar. Inténtalo de nuevo.';

/** What a failed «Continuar» says above the buttons. */
export function stepProblem({ status }: CallFailure): string {
  if (status === 0) return NETWORK_TEXT;
  if (status === 429) return RATE_LIMITED_TEXT;
  return FINISH_FAILED_TEXT;
}

// O3 «Tu consentimiento».

export const CONSENT_HEADING = 'Consentimiento para el tratamiento de tus datos personales';
export const CONSENT_CHECK = 'Acepto el tratamiento de mis datos personales';
export const CONSENT_HELP = 'Se guarda la fecha, la hora y la versión del texto que aceptas.';
export const CONSENT_ERROR = 'Debes marcar el consentimiento de datos personales';
export const CONSENT_CHANGED_TITLE = 'El texto se actualizó mientras lo leías.';
export const CONSENT_CHANGED_TEXT = 'Léelo de nuevo y vuelve a marcar la casilla.';
export const CONSENT_NEEDS_CHECK = 'Marca la casilla para terminar.';
export const CONSENT_FAILED_TEXT = 'No se pudo terminar tu registro. Inténtalo de nuevo.';

/** What closing the registration says after it: the guest's account by kind. */
export interface ConsentEnding {
  readonly side: string;
  readonly after: string;
}

export function consentEnding(temporary: boolean): ConsentEnding {
  return temporary
    ? {
        side: 'Al terminar entras a tu estado de pago, donde podrás subir el voucher de tu estadía.',
        after: 'Después: tu estado de pago.',
      }
    : {
        side: 'Al terminar entras a tu cuenta: tu estado de pago, tu contrato y tus datos.',
        after: 'Después: tu cuenta en Quipu.',
      };
}

/** The consent text as the BFF sends it: one paragraph per blank line. */
export function consentParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '');
}

export type ConsentProblem =
  | { readonly place: 'check'; readonly message: string }
  | { readonly place: 'changed' }
  | { readonly place: 'general'; readonly message: string };

/** CONSENT_NOT_ACCEPTED goes under the box; a text that changed (consentVersion) is read again. */
export function consentProblem(failure: CallFailure): ConsentProblem {
  if (failure.code === 'CONSENT_NOT_ACCEPTED') return { place: 'check', message: CONSENT_ERROR };
  if (failure.code === 'VALIDATION_ERROR' && failure.field === 'consentVersion') {
    return { place: 'changed' };
  }
  const { status } = failure;
  if (status === 0) return { place: 'general', message: NETWORK_TEXT };
  if (status === 429) return { place: 'general', message: RATE_LIMITED_TEXT };
  return { place: 'general', message: CONSENT_FAILED_TEXT };
}
