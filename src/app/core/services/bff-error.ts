import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import type { components } from '@core/api/bff.generated';

/**
 * A failed BFF call, reduced to what the UI needs. `code` is stable and decides what the app does
 * (QP-ANGWEB-BFF-02); `message` is always a local Spanish text, never the one the server sent, so
 * a server detail can never reach the screen.
 */
export type BffError = Readonly<components['schemas']['Error']> & { readonly lock?: AccountLock };

/**
 * How long a locked account stays locked (TAR-131). `retryAfterSeconds` comes from the
 * `Retry-After` header and is what a countdown starts from; `lockedUntil` is the time of day to show.
 */
export interface AccountLock {
  readonly retryAfterSeconds: number;
  readonly lockedUntil: Date;
}

const KNOWN_TEXTS = new Map<string, string>([
  ['AUTH_INVALID_CREDENTIALS', 'Documento o contraseña incorrectos'],
  ['AUTH_ACCOUNT_DISABLED', 'Tu cuenta está deshabilitada. Contacta al administrador.'],
  [
    'AUTH_ACCOUNT_LOCKED',
    'Tu cuenta está bloqueada por intentos fallidos. Inténtalo más tarde o restablece tu contraseña.',
  ],
  ['AUTH_WEAK_PASSWORD', 'Mínimo 8 caracteres'],
  ['AUTH_PASSWORD_UNCHANGED', 'Elige una contraseña distinta de la temporal'],
  ['AUTH_PASSWORD_CHANGE_REQUIRED', 'Debes cambiar tu contraseña para continuar'],
  ['AUTH_INVALID_OR_EXPIRED_CODE', 'Enlace inválido o expirado, solicita uno nuevo'],
  ['RATE_LIMITED', 'Demasiados intentos, espera un momento antes de volver a intentar'],
  [
    'UNSUPPORTED_MEDIA_TYPE',
    'No se pudo enviar el formulario. Recarga la página e inténtalo de nuevo.',
  ],
  ['NETWORK_ERROR', 'No se pudo conectar con el servidor. Inténtalo de nuevo.'],
  ['TIMEOUT', 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'],
  ['UNEXPECTED_ERROR', 'Ocurrió un error inesperado. Inténtalo de nuevo.'],
]);

const VALIDATION_TEXTS = new Map<string, string>([
  ['documentType', 'Elige un tipo de documento válido'],
  ['documentNumber', 'Revisa el número de documento'],
  ['password', 'Revisa la contraseña'],
  ['newPassword', 'Revisa la nueva contraseña'],
  ['email', 'Revisa el correo'],
]);
const VALIDATION_FALLBACK = 'Revisa los datos ingresados';

function known(code: string): BffError {
  return { code, message: KNOWN_TEXTS.get(code) ?? VALIDATION_FALLBACK };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** A whole number of seconds, at least one (the contract's `Retry-After`). */
function wholeSeconds(header: string | null): number | undefined {
  return header !== null && /^[1-9]\d*$/.test(header) ? Number(header) : undefined;
}

/**
 * The lock a 423 reports. The header decides the seconds; the body's `lockedUntil` is only the time
 * of day. Each one stands in for the other when it is missing or unusable; with neither there is
 * no countdown to show.
 */
function lockOf(error: HttpErrorResponse, body: Record<string, unknown>): AccountLock | undefined {
  const until = typeof body['lockedUntil'] === 'string' ? new Date(body['lockedUntil']) : undefined;
  const validUntil = until && !Number.isNaN(until.getTime()) ? until : undefined;
  const seconds =
    wholeSeconds(error.headers.get('Retry-After')) ??
    (validUntil ? Math.ceil((validUntil.getTime() - Date.now()) / 1000) : undefined);
  if (seconds === undefined || seconds < 1) {
    return undefined;
  }
  return {
    retryAfterSeconds: seconds,
    lockedUntil: validUntil ?? new Date(Date.now() + seconds * 1000),
  };
}

function fieldOf(body: Record<string, unknown>): string | undefined {
  return typeof body['field'] === 'string' ? body['field'] : undefined;
}

function withField(base: BffError, field: string | undefined): BffError {
  return field ? { ...base, field } : base;
}

/** Turns whatever a failed BFF call threw into a {@link BffError}. */
export function toBffError(error: unknown): BffError {
  if (error instanceof TimeoutError) {
    return known('TIMEOUT');
  }
  if (!(error instanceof HttpErrorResponse)) {
    return known('UNEXPECTED_ERROR');
  }
  if (error.status === 0) {
    return known('NETWORK_ERROR');
  }
  const body: unknown = error.error;
  if (!isRecord(body) || typeof body['code'] !== 'string') {
    return known('UNEXPECTED_ERROR');
  }
  const code = body['code'];
  if (code === 'VALIDATION_ERROR') {
    const field = fieldOf(body);
    const message = (field && VALIDATION_TEXTS.get(field)) ?? VALIDATION_FALLBACK;
    return withField({ code, message }, field);
  }
  if (!KNOWN_TEXTS.has(code)) {
    return known('UNEXPECTED_ERROR');
  }
  if (code === 'AUTH_ACCOUNT_LOCKED') {
    const lock = lockOf(error, body);
    return lock ? { ...known(code), lock } : known(code);
  }
  return withField(known(code), fieldOf(body));
}
