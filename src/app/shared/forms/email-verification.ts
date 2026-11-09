import type { Observable } from 'rxjs';
import { NETWORK_TEXT, RATE_LIMITED_TEXT } from '../text/error-text';
import type { CallFailure } from './call-failure';
import { EMAIL_TEXT } from './contact-rules';

/**
 * The email of a guest is the one of its account and only changes once the guest proves it is
 * theirs (TAR-349, replaces D-76): a code of 6 digits goes to the new address and the change
 * happens when the code comes back. O1, H5 and T3 share the dialog; each one only says under
 * which path of the BFF it asks (guest, temporary guest or onboarding).
 */
export interface EmailVerificationClient {
  /** Sends a code to the new address (202); a new request replaces the one pending. */
  request(email: string): Observable<unknown>;
  /** Confirms the code (204): only now the email changes and the old one is told. */
  confirm(code: string): Observable<unknown>;
}

export const CODE_LENGTH = 6;
/** The wait between two codes when the BFF does not say how long is left (60 s). */
export const RESEND_WAIT_SECONDS = 60;
const CODE_SHAPE = /^\d{6}$/;

// The texts (QP-UI-17): proposals until the person words them on the canvas (MisDatos, Onboarding).
export const EMAIL_LABEL = 'Correo';
export const NO_EMAIL_TEXT = 'Sin correo';
export const EMAIL_FIELD_HELP =
  'Aquí te llegan los avisos y el código para recuperar tu contraseña.';
export const CHANGE_EMAIL_LABEL = 'Cambiar correo';
export const ADD_EMAIL_LABEL = 'Agregar correo';
export const ENTER_CODE_LABEL = 'Escribir el código';
export const NEW_EMAIL_LABEL = 'Correo nuevo';
export const REQUEST_LEAD =
  'Te enviaremos un código de 6 dígitos para confirmar que el correo es tuyo.';
export const SEND_CODE_LABEL = 'Enviar código';
export const SENDING_CODE_LABEL = 'Enviando…';
export const CODE_LABEL = 'Código';
export const CONFIRM_LABEL = 'Confirmar correo';
export const CONFIRMING_LABEL = 'Confirmando…';
export const RESEND_LABEL = 'Reenviar código';
export const OTHER_EMAIL_LABEL = 'Usar otro correo';
export const CODE_REQUIRED_TEXT = `Escribe los ${String(CODE_LENGTH)} dígitos del código.`;
export const EMAIL_REQUIRED_TEXT = 'Escribe el correo nuevo.';
export const EMAIL_CHANGED_TEXT = 'Correo actualizado. Le avisamos a tu correo anterior.';
export const EMAIL_ADDED_TEXT = 'Correo guardado.';
export const CODE_SENT_TEXT = 'Te enviamos un código nuevo.';
const EMAIL_UNCHANGED_TEXT = 'Ese ya es tu correo.';
const EMAIL_TAKEN_TEXT = 'Ese correo ya está en uso por otra cuenta';
const CODE_INVALID_TEXT = 'El código no es correcto. Revísalo e inténtalo de nuevo.';
const CODE_EXPIRED_TEXT = 'El código venció o se intentó demasiadas veces. Pide uno nuevo.';
const REQUEST_FAILED_TEXT = 'No se pudo enviar el código. Inténtalo de nuevo.';
const CONFIRM_FAILED_TEXT = 'No se pudo confirmar el correo. Inténtalo de nuevo.';

/** «Falta confirmar ana@correo.pe: escribe el código que te enviamos.» */
export function pendingText(email: string): string {
  return `Falta confirmar ${email}: escribe el código que te enviamos.`;
}

/** «Escribe el código de 6 dígitos que enviamos a ana@correo.pe. Vence en 10 minutos.» */
export function codeLead(email: string): string {
  return `Escribe el código de ${String(CODE_LENGTH)} dígitos que enviamos a ${email}. Vence en 10 minutos.`;
}

/** «Reenviar en 0:45». */
export function resendWaitLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `Reenviar en ${String(minutes)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** The code as the BFF takes it: the digits only, so «123 456» or a pasted «123-456» also work. */
export function normalizeCode(code: string): string {
  return code.replace(/[\s-]/g, '');
}

export function codeError(code: string): string | null {
  return CODE_SHAPE.test(normalizeCode(code)) ? null : CODE_REQUIRED_TEXT;
}

/** Whether the new address is the one the guest already has, without minding the case. */
export function sameEmail(a: string | null, b: string): boolean {
  return a !== null && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Where a failure goes: under the field of the step, or above the buttons; and a wait to count. */
export type VerificationProblem =
  | { readonly place: 'field'; readonly message: string; readonly waitSeconds?: undefined }
  | { readonly place: 'general'; readonly message: string; readonly waitSeconds?: number };

function waitOf(body: CallFailure['body']): number {
  const seconds = body['retryAfterSeconds'];
  return typeof seconds === 'number' && Number.isInteger(seconds) && seconds > 0
    ? seconds
    : RESEND_WAIT_SECONDS;
}

function common({ status, code }: CallFailure, fallback: string): VerificationProblem {
  if (status === 0) return { place: 'general', message: NETWORK_TEXT };
  if (code === 'RATE_LIMITED') return { place: 'general', message: RATE_LIMITED_TEXT };
  return { place: 'general', message: fallback };
}

/** A failure of asking for a code (the first step, or «Reenviar código»). */
export function requestProblem(failure: CallFailure): VerificationProblem {
  const { code, field, body } = failure;
  if (code === 'EMAIL_VERIFICATION_COOLDOWN') {
    const waitSeconds = waitOf(body);
    return { place: 'general', message: waitText(waitSeconds), waitSeconds };
  }
  if (code === 'EMAIL_UNCHANGED') return { place: 'field', message: EMAIL_UNCHANGED_TEXT };
  if (code === 'ACCOUNT_EMAIL_TAKEN') return { place: 'field', message: EMAIL_TAKEN_TEXT };
  if (code === 'VALIDATION_ERROR' && field === 'email') {
    return { place: 'field', message: EMAIL_TEXT };
  }
  return common(failure, REQUEST_FAILED_TEXT);
}

/** A failure of confirming the code. A taken email here means someone took it meanwhile. */
export function confirmProblem(failure: CallFailure): VerificationProblem {
  const { code, field } = failure;
  if (code === 'EMAIL_VERIFICATION_INVALID') return { place: 'field', message: CODE_INVALID_TEXT };
  if (code === 'EMAIL_VERIFICATION_EXPIRED') {
    return { place: 'general', message: CODE_EXPIRED_TEXT };
  }
  if (code === 'ACCOUNT_EMAIL_TAKEN') return { place: 'general', message: EMAIL_TAKEN_TEXT };
  if (code === 'VALIDATION_ERROR' && field === 'code') {
    return { place: 'field', message: CODE_REQUIRED_TEXT };
  }
  return common(failure, CONFIRM_FAILED_TEXT);
}

/** «Espera 45 segundos para pedir otro código.» */
export function waitText(seconds: number): string {
  return seconds === 1
    ? 'Espera 1 segundo para pedir otro código.'
    : `Espera ${String(seconds)} segundos para pedir otro código.`;
}
