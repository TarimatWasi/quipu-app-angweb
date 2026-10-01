import { HttpErrorResponse } from '@angular/common/http';
import { toBffError } from './bff-error';

describe('toBffError', () => {
  it('reads code, message and field from a BFF error body', () => {
    const response = new HttpErrorResponse({
      status: 400,
      error: { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos', field: 'password' },
    });

    expect(toBffError(response)).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Datos de entrada inválidos',
      field: 'password',
    });
  });

  it('leaves the field out when the BFF sends none or null', () => {
    const response = new HttpErrorResponse({
      status: 401,
      error: {
        code: 'AUTH_INVALID_CREDENTIALS',
        message: 'Documento o contraseña incorrectos',
        field: null,
      },
    });

    expect(toBffError(response)).toEqual({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Documento o contraseña incorrectos',
    });
  });

  it('maps a network failure (status 0) to NETWORK_ERROR', () => {
    const response = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    expect(toBffError(response).code).toBe('NETWORK_ERROR');
  });

  it('maps a body that is not a BFF error to UNEXPECTED_ERROR', () => {
    const response = new HttpErrorResponse({ status: 502, error: '<html>Bad gateway</html>' });

    expect(toBffError(response).code).toBe('UNEXPECTED_ERROR');
  });

  it('maps a body with a non-string code or message to UNEXPECTED_ERROR', () => {
    const response = new HttpErrorResponse({ status: 500, error: { code: 7, message: null } });

    expect(toBffError(response).code).toBe('UNEXPECTED_ERROR');
  });

  it('maps errors that are not HTTP errors to UNEXPECTED_ERROR', () => {
    expect(toBffError(new Error('boom')).code).toBe('UNEXPECTED_ERROR');
  });

  it('always gives the user a Spanish message', () => {
    expect(toBffError(new Error('boom')).message).toMatch(/inesperado/);
  });
});
