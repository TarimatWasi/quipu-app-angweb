import type { CallFailure } from '@shared/forms/call-failure';
import { RATE_LIMITED_TEXT } from '@shared/text/error-text';
import {
  DOCUMENT_LOCKED_TEXT,
  documentProblem,
  goneText,
  stayFieldText,
} from './stay-document-failures';

function failure(status: number, code: string | null = null): CallFailure {
  return { status, code, field: null, body: {} };
}

describe('failures of the document and stay forms (A3.5)', () => {
  it('words the refusals of the document with the catalog', () => {
    expect(documentProblem(failure(409, 'GUEST_DOCUMENT_LOCKED'))).toEqual({
      place: 'document',
      message: DOCUMENT_LOCKED_TEXT,
    });
    expect(documentProblem(failure(409, 'GUEST_DOCUMENT_TAKEN')).place).toBe('document');
    expect(documentProblem(failure(400, 'VALIDATION_ERROR')).place).toBe('document');
  });

  it('puts any other failure above the actions, in local words', () => {
    expect(documentProblem(failure(429, 'RATE_LIMITED'))).toEqual({
      place: 'general',
      message: RATE_LIMITED_TEXT,
    });
    expect(documentProblem(failure(0)).place).toBe('general');
    expect(documentProblem(failure(500, 'X')).message).toBe(
      'No se pudo corregir el documento. Inténtalo de nuevo.',
    );
  });

  it('says what is gone from the code of a 404, the guest when it names nothing', () => {
    expect(goneText(failure(404, 'STAY_NOT_FOUND'))).toBe('La estadía no existe');
    expect(goneText(failure(404, 'ENVIRONMENT_NOT_FOUND'))).toBe('El ambiente no existe');
    expect(goneText(failure(404, 'GUEST_NOT_FOUND'))).toBe('El huésped no existe');
  });

  it('has a text for each field of the stay a validation can point at', () => {
    expect(stayFieldText('amount')).toBe('Escribe un monto mayor que 0.');
    expect(stayFieldText('dates')).toBe('Elige la llegada y la salida.');
    expect(stayFieldText('environment')).toBe('Elige el ambiente de la estadía.');
  });
});
