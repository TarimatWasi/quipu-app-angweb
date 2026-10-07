import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, NEVER, timeout } from 'rxjs';
import { toBffError } from './bff-error';

const bff = (status: number, code: string, message = 'texto del servidor', field?: unknown) =>
  new HttpErrorResponse({ status, error: { code, message, field } });

describe('toBffError', () => {
  it.each([
    [401, 'AUTH_INVALID_CREDENTIALS', 'Documento o contraseña incorrectos'],
    [403, 'AUTH_ACCOUNT_DISABLED', 'Tu cuenta está deshabilitada. Contacta al administrador.'],
    [
      423,
      'AUTH_ACCOUNT_LOCKED',
      'Tu cuenta está bloqueada por intentos fallidos. Inténtalo más tarde o restablece tu contraseña.',
    ],
    [
      415,
      'UNSUPPORTED_MEDIA_TYPE',
      'No se pudo enviar el formulario. Recarga la página e inténtalo de nuevo.',
    ],
  ])('maps %i %s to its own Spanish text', (status, code, text) => {
    expect(toBffError(bff(status, code))).toEqual({ code, message: text });
  });

  describe('the lock of a 423 (TAR-131)', () => {
    const LOCKED_UNTIL = '2026-10-07T20:42:00Z';
    const locked = (
      retryAfter: string | null,
      extra: Record<string, unknown> = { lockedUntil: LOCKED_UNTIL },
    ) =>
      new HttpErrorResponse({
        status: 423,
        headers:
          retryAfter === null ? new HttpHeaders() : new HttpHeaders({ 'Retry-After': retryAfter }),
        error: { code: 'AUTH_ACCOUNT_LOCKED', message: 'texto del servidor', ...extra },
      });

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-07T20:27:00Z'));
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('keeps the seconds of Retry-After and the instant the lock ends', () => {
      expect(toBffError(locked('900')).lock).toEqual({
        retryAfterSeconds: 900,
        lockedUntil: new Date(LOCKED_UNTIL),
      });
    });

    it('counts from lockedUntil when the header is missing or not a whole number of seconds', () => {
      for (const header of [null, '', '0', '-3', '1.5', 'abc']) {
        expect(toBffError(locked(header)).lock).toEqual({
          retryAfterSeconds: 900,
          lockedUntil: new Date(LOCKED_UNTIL),
        });
      }
    });

    it('builds lockedUntil from the header when the body does not give a valid one', () => {
      for (const lockedUntil of [undefined, 'ayer', 12]) {
        expect(toBffError(locked('600', { lockedUntil })).lock).toEqual({
          retryAfterSeconds: 600,
          lockedUntil: new Date('2026-10-07T20:37:00Z'),
        });
      }
    });

    it('gives no lock when neither the header nor the body say how long it lasts', () => {
      expect(toBffError(locked(null, {}))).toEqual({
        code: 'AUTH_ACCOUNT_LOCKED',
        message:
          'Tu cuenta está bloqueada por intentos fallidos. Inténtalo más tarde o restablece tu contraseña.',
      });
    });

    it('gives no lock when lockedUntil is already in the past and the header is unusable', () => {
      expect(
        toBffError(locked(null, { lockedUntil: '2026-10-07T20:00:00Z' })).lock,
      ).toBeUndefined();
    });
  });

  it('never shows the text the server sent for a code it knows', () => {
    const error = toBffError(bff(401, 'AUTH_INVALID_CREDENTIALS', 'Wrong password for user 7'));

    expect(error.message).not.toContain('Wrong password');
  });

  it.each([
    ['documentType', 'Elige un tipo de documento válido'],
    ['documentNumber', 'Revisa el número de documento'],
    ['password', 'Revisa la contraseña'],
  ])('maps a VALIDATION_ERROR on %s to a Spanish text for that field', (field, text) => {
    expect(toBffError(bff(400, 'VALIDATION_ERROR', 'Datos de entrada inválidos', field))).toEqual({
      code: 'VALIDATION_ERROR',
      message: text,
      field,
    });
  });

  it('uses a general text for a VALIDATION_ERROR without a field or with an unknown one', () => {
    expect(toBffError(bff(400, 'VALIDATION_ERROR', 'x', null))).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Revisa los datos ingresados',
    });
    expect(toBffError(bff(400, 'VALIDATION_ERROR', 'x', 'nickname'))).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Revisa los datos ingresados',
      field: 'nickname',
    });
  });

  it('hides the message of a code it does not know', () => {
    const error = toBffError(bff(409, 'SOMETHING_NEW', 'detalle interno'));

    expect(error).toEqual({
      code: 'UNEXPECTED_ERROR',
      message: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    });
  });

  it('maps a network failure (status 0) to NETWORK_ERROR', () => {
    const response = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    expect(toBffError(response)).toEqual({
      code: 'NETWORK_ERROR',
      message: 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
    });
  });

  it('maps a timeout to TIMEOUT', async () => {
    // A real TimeoutError, produced the way the app produces it.
    const timedOut = await firstValueFrom(NEVER.pipe(timeout({ first: 1 }))).catch(
      (error: unknown) => error,
    );

    expect(toBffError(timedOut)).toEqual({
      code: 'TIMEOUT',
      message: 'El servidor tardó demasiado en responder. Inténtalo de nuevo.',
    });
  });

  it.each([
    ['an HTML body', new HttpErrorResponse({ status: 502, error: '<html>Bad gateway</html>' })],
    [
      'a non-string code',
      new HttpErrorResponse({ status: 500, error: { code: 7, message: null } }),
    ],
    ['no body', new HttpErrorResponse({ status: 500 })],
    ['a non-HTTP error', new Error('boom')],
  ])('maps %s to UNEXPECTED_ERROR', (_name, error) => {
    expect(toBffError(error)).toEqual({
      code: 'UNEXPECTED_ERROR',
      message: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    });
  });
});

describe('toBffError for the password change (RF-12)', () => {
  it.each([
    ['AUTH_WEAK_PASSWORD', 'Mínimo 8 caracteres'],
    ['AUTH_PASSWORD_UNCHANGED', 'Elige una contraseña distinta de la temporal'],
  ])('maps %s to its own Spanish text and keeps the field', (code, text) => {
    expect(toBffError(bff(400, code, 'texto del servidor', 'newPassword'))).toEqual({
      code,
      message: text,
      field: 'newPassword',
    });
  });

  it('maps the block of a session that must change its password', () => {
    expect(toBffError(bff(403, 'AUTH_PASSWORD_CHANGE_REQUIRED'))).toEqual({
      code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
      message: 'Debes cambiar tu contraseña para continuar',
    });
  });
});

describe('toBffError for the password recovery (RF-16)', () => {
  it.each([
    ['AUTH_INVALID_OR_EXPIRED_CODE', 400, 'Enlace inválido o expirado, solicita uno nuevo'],
    ['RATE_LIMITED', 429, 'Demasiados intentos, espera un momento antes de volver a intentar'],
  ])('maps %s to its own Spanish text', (code, status, text) => {
    expect(toBffError(bff(status, code, 'texto del servidor'))).toEqual({ code, message: text });
  });

  it('keeps the email field of a validation error with its own text', () => {
    expect(toBffError(bff(400, 'VALIDATION_ERROR', 'x', 'email'))).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Revisa el correo',
      field: 'email',
    });
  });
});
