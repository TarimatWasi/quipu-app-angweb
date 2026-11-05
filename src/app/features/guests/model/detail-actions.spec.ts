import {
  accessProblem,
  deactivateProblem,
  deactivateTitle,
  emailProblem,
  hasActiveContract,
} from './detail-actions';
import type { CallFailure } from './new-guest';

function failure(status: number, code: string | null = null, field: string | null = null) {
  const value: CallFailure = { status, code, field, body: {} };
  return value;
}

describe('A3.2 actions: titles and failures in local words (QP-ANGWEB-BFF-02)', () => {
  it('names the guest in the title of «Desactivar»', () => {
    expect(deactivateTitle('Luis Huamán')).toBe('¿Desactivar a Luis Huamán?');
  });

  it('tells a contract in force apart from the other failures of deactivating', () => {
    expect(hasActiveContract(failure(409, 'GUEST_HAS_ACTIVE_CONTRACT'))).toBe(true);
    expect(hasActiveContract(failure(409, 'CONCURRENT_MODIFICATION'))).toBe(false);
    expect(deactivateProblem(failure(409, 'CONCURRENT_MODIFICATION'))).toBe(
      'El huésped cambió mientras tanto. Cierra este aviso y vuelve a intentarlo.',
    );
    expect(deactivateProblem(failure(0))).toBe(
      'No se pudo conectar con el servidor. Inténtalo de nuevo.',
    );
    expect(deactivateProblem(failure(404, 'RESOURCE_NOT_FOUND'))).toBe('Ese huésped ya no existe.');
    expect(deactivateProblem(failure(500))).toBe(
      'No se pudo desactivar al huésped. Inténtalo de nuevo.',
    );
  });

  it('words the failures of a new access', () => {
    expect(accessProblem(failure(409, 'GUEST_INACTIVE'))).toBe(
      'El huésped está inactivo: reactívalo antes de seguir.',
    );
    expect(accessProblem(failure(429))).toBe(
      'Demasiados intentos, espera un momento antes de volver a intentar.',
    );
    expect(accessProblem(failure(503))).toBe('No se pudo generar el acceso. Inténtalo de nuevo.');
  });

  it('puts a taken or invalid email under the field and anything else above the buttons', () => {
    expect(emailProblem(failure(409, 'ACCOUNT_EMAIL_TAKEN', 'email'))).toEqual({
      place: 'field',
      message: 'Ese correo ya está en uso por otra cuenta',
    });
    expect(emailProblem(failure(409, 'GUEST_EMAIL_TAKEN', 'contactEmail'))).toEqual({
      place: 'field',
      message: 'Ese correo ya está en uso por otra cuenta',
    });
    expect(emailProblem(failure(400, 'VALIDATION_ERROR', 'email'))).toEqual({
      place: 'field',
      message: 'Escribe un correo válido.',
    });
    expect(emailProblem(failure(409, 'GUEST_INACTIVE'))).toEqual({
      place: 'general',
      message: 'El huésped está inactivo: reactívalo antes de seguir.',
    });
    expect(emailProblem(failure(500))).toEqual({
      place: 'general',
      message: 'No se pudo guardar el correo. Inténtalo de nuevo.',
    });
  });
});
