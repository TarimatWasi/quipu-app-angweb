import type { CallFailure } from './call-failure';
import {
  codeError,
  confirmProblem,
  normalizeCode,
  requestProblem,
  resendWaitLabel,
  RESEND_WAIT_SECONDS,
  sameEmail,
  waitText,
} from './email-verification';

const failure = (
  status: number,
  code: string | null,
  field: string | null = null,
  body: Record<string, unknown> = {},
): CallFailure => ({ status, code, field, body });

describe('email-verification (TAR-349)', () => {
  it('takes the 6 digits of the code, also with spaces or a hyphen', () => {
    expect(normalizeCode('123 456')).toBe('123456');
    expect(normalizeCode('123-456')).toBe('123456');
    expect(codeError('123456')).toBeNull();
    expect(codeError(' 123 456 ')).toBeNull();
    expect(codeError('12345')).toBe('Escribe los 6 dígitos del código.');
    expect(codeError('12a456')).toBe('Escribe los 6 dígitos del código.');
  });

  it('compares the addresses without minding the case or the spaces', () => {
    expect(sameEmail('Ana@Correo.pe', ' ana@correo.pe ')).toBe(true);
    expect(sameEmail(null, 'ana@correo.pe')).toBe(false);
    expect(sameEmail('ana@correo.pe', 'luis@correo.pe')).toBe(false);
  });

  it('words the wait and the resend label', () => {
    expect(resendWaitLabel(45)).toBe('Reenviar en 0:45');
    expect(resendWaitLabel(60)).toBe('Reenviar en 1:00');
    expect(waitText(1)).toBe('Espera 1 segundo para pedir otro código.');
    expect(waitText(30)).toBe('Espera 30 segundos para pedir otro código.');
  });

  describe('asking for a code', () => {
    it('counts the wait the BFF gives, or 60 s without it', () => {
      expect(
        requestProblem(
          failure(429, 'EMAIL_VERIFICATION_COOLDOWN', 'email', { retryAfterSeconds: 42 }),
        ),
      ).toEqual({
        place: 'general',
        message: 'Espera 42 segundos para pedir otro código.',
        waitSeconds: 42,
      });
      expect(requestProblem(failure(429, 'EMAIL_VERIFICATION_COOLDOWN', 'email'))).toMatchObject({
        waitSeconds: RESEND_WAIT_SECONDS,
      });
    });

    it('puts under the field the same address, a taken one and a malformed one', () => {
      expect(requestProblem(failure(400, 'EMAIL_UNCHANGED', 'email'))).toEqual({
        place: 'field',
        message: 'Ese ya es tu correo.',
      });
      expect(requestProblem(failure(409, 'ACCOUNT_EMAIL_TAKEN', 'email'))).toEqual({
        place: 'field',
        message: 'Ese correo ya está en uso por otra cuenta',
      });
      expect(requestProblem(failure(400, 'VALIDATION_ERROR', 'email'))).toEqual({
        place: 'field',
        message: 'Escribe un correo válido.',
      });
    });

    it('says the rest above the buttons, never with the text of the server', () => {
      expect(requestProblem(failure(0, null)).message).toBe(
        'No se pudo conectar con el servidor. Inténtalo de nuevo.',
      );
      expect(requestProblem(failure(429, 'RATE_LIMITED')).place).toBe('general');
      expect(requestProblem(failure(500, 'UNEXPECTED_ERROR'))).toEqual({
        place: 'general',
        message: 'No se pudo enviar el código. Inténtalo de nuevo.',
      });
    });
  });

  describe('confirming the code', () => {
    it('tells a wrong code from one that expired or was tried too many times', () => {
      expect(confirmProblem(failure(400, 'EMAIL_VERIFICATION_INVALID', 'code'))).toEqual({
        place: 'field',
        message: 'El código no es correcto. Revísalo e inténtalo de nuevo.',
      });
      expect(confirmProblem(failure(400, 'EMAIL_VERIFICATION_EXPIRED', 'code'))).toEqual({
        place: 'general',
        message: 'El código venció o se intentó demasiadas veces. Pide uno nuevo.',
      });
    });

    it('says when someone took the address meanwhile', () => {
      expect(confirmProblem(failure(409, 'ACCOUNT_EMAIL_TAKEN', 'email'))).toEqual({
        place: 'general',
        message: 'Ese correo ya está en uso por otra cuenta',
      });
    });

    it('falls back to its own text', () => {
      expect(confirmProblem(failure(500, null)).message).toBe(
        'No se pudo confirmar el correo. Inténtalo de nuevo.',
      );
    });
  });
});
