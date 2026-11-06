import type { AccessGrant, AccessMode } from '@core/api/clients/admin-guests.service';
import { NETWORK_TEXT, RATE_LIMITED_TEXT } from './new-guest';
import type { CallFailure } from './new-guest';

export type { AccessGrant, AccessMode };

/** The actions of A3.2 and their dialogs (P-16) as the canvas «HuespedDetalle» words them. */

// Desactivar (CU-10, RN-12).
export function deactivateTitle(who: string): string {
  return `¿Desactivar a ${who}?`;
}
export const DEACTIVATE_TEXT =
  'No podrá entrar a Quipu. Sus datos y su historial se conservan, y puedes reactivar su cuenta cuando quieras.';
export const ACTIVE_CONTRACT_TITLE = 'Este huésped tiene un contrato vigente';
export const ACTIVE_CONTRACT_TEXT = 'Este huésped tiene un contrato vigente: finalízalo primero.';
export const DEACTIVATED_TEXT = 'Huésped desactivado.';

// Reactivar (CU-28): without confirmation; a debt is explained in «Primero salda su deuda».
export const DETAIL_DEBT_TEXT =
  'El huésped tiene deuda pendiente: salda sus períodos impagos antes de crear un contrato nuevo o reactivarlo';
export const REACTIVATED_EXPIRED_TEXT = 'Huésped reactivado. Su acceso venció: genera otro.';

// Generar otro acceso (A3.4, RF-17, CU-13).
export const ACCESS_TITLE = 'Generar otro acceso';
export const ACCESS_LEAD = 'El acceso anterior deja de servir. ¿Cómo se lo entregas?';
export const ACTIVE_ACCESS_LEAD =
  'Su contraseña actual sigue sirviendo hasta que use el acceso nuevo. ¿Cómo se lo entregas?';
export const ACCESS_NOTE =
  'Los dos valen 30 minutos y sirven una sola vez. Después verás el mensaje listo para enviarle.';

export interface AccessOption {
  readonly mode: AccessMode;
  readonly label: string;
  readonly help: string;
}

export const ACCESS_OPTIONS: readonly AccessOption[] = [
  {
    mode: 'LINK',
    label: 'Enlace (recomendado)',
    help: 'Abre el enlace y elige su contraseña. Si tiene correo de cuenta, también le llega ahí.',
  },
  {
    mode: 'TEMPORARY_PASSWORD',
    label: 'Contraseña temporal',
    help: 'Entra con su documento y una contraseña que le dictas o envías; la cambia al entrar.',
  },
];

// Correo de cuenta (RF-16, D-76).
export const EMAIL_TITLE = 'Correo de cuenta';
export const EMAIL_LEAD =
  'A este correo le llega el código para recuperar su contraseña. Es distinto del correo de contacto, que cambia el huésped en Mis datos.';
export const EMAIL_FIELD_HELP =
  'Si ya tenía uno, le avisamos al anterior del cambio y los códigos que tenga dejan de servir.';
export const EMAIL_REQUIRED_TEXT = 'Escribe el correo de cuenta.';
export const EMAIL_INVALID_TEXT = 'Escribe un correo válido.';
export const EMAIL_LONG_TEXT = 'El correo puede tener hasta 200 caracteres.';
export const EMAIL_TAKEN_TEXT = 'Ese correo ya está en uso por otra cuenta';
export const EMAIL_SAVED_TEXT = 'Correo de cuenta guardado.';

// Failures shared by the three calls, worded here (QP-ANGWEB-BFF-02: never the server's text).
export const CONFLICT_TEXT =
  'El huésped cambió mientras tanto. Cierra este aviso y vuelve a intentarlo.';
export const GONE_TEXT = 'Ese huésped ya no existe.';
export const INACTIVE_GUEST_TEXT = 'El huésped está inactivo: reactívalo antes de seguir.';
export const DEACTIVATE_FAILED_TEXT = 'No se pudo desactivar al huésped. Inténtalo de nuevo.';
export const ACCESS_FAILED_TEXT = 'No se pudo generar el acceso. Inténtalo de nuevo.';
export const EMAIL_FAILED_TEXT = 'No se pudo guardar el correo. Inténtalo de nuevo.';

/** What any of these calls answers when it is not the code of its own action. */
function commonProblem({ status, code }: CallFailure): string | null {
  if (status === 0) return NETWORK_TEXT;
  if (status === 429 || code === 'RATE_LIMITED') return RATE_LIMITED_TEXT;
  if (status === 404) return GONE_TEXT;
  if (code === 'CONCURRENT_MODIFICATION') return CONFLICT_TEXT;
  if (code === 'GUEST_INACTIVE') return INACTIVE_GUEST_TEXT;
  return null;
}

/** Whether «Desactivar huésped» was refused for a contract in force (RN-12). */
export function hasActiveContract({ status, code }: CallFailure): boolean {
  return status === 409 && code === 'GUEST_HAS_ACTIVE_CONTRACT';
}

export function deactivateProblem(failure: CallFailure): string {
  return commonProblem(failure) ?? DEACTIVATE_FAILED_TEXT;
}

export function accessProblem(failure: CallFailure): string {
  return commonProblem(failure) ?? ACCESS_FAILED_TEXT;
}

export type EmailProblem =
  | { readonly place: 'field'; readonly message: string }
  | { readonly place: 'general'; readonly message: string };

/** Where a failure of the account email goes: under the field, or above the buttons. */
export function emailProblem(failure: CallFailure): EmailProblem {
  const { status, code, field } = failure;
  if (status === 409 && (code === 'ACCOUNT_EMAIL_TAKEN' || code === 'GUEST_EMAIL_TAKEN')) {
    return { place: 'field', message: EMAIL_TAKEN_TEXT };
  }
  if (code === 'VALIDATION_ERROR' && field === 'email') {
    return { place: 'field', message: EMAIL_INVALID_TEXT };
  }
  return { place: 'general', message: commonProblem(failure) ?? EMAIL_FAILED_TEXT };
}
