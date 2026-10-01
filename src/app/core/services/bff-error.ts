import { HttpErrorResponse } from '@angular/common/http';

/** Error body of the BFF: a stable English `code`, a Spanish `message` and, optionally, a `field`. */
export interface BffError {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
}

const NETWORK_ERROR: BffError = {
  code: 'NETWORK_ERROR',
  message: 'No se pudo conectar con el servidor. Inténtalo de nuevo.',
};

const UNEXPECTED_ERROR: BffError = {
  code: 'UNEXPECTED_ERROR',
  message: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Turns whatever a failed BFF call threw into a {@link BffError}. Callers decide by `code`
 * (QP-ANGWEB-BFF-02); the `message` is only for showing to the user.
 */
export function toBffError(error: unknown): BffError {
  if (!(error instanceof HttpErrorResponse)) {
    return UNEXPECTED_ERROR;
  }
  if (error.status === 0) {
    return NETWORK_ERROR;
  }
  const body: unknown = error.error;
  if (isRecord(body) && typeof body['code'] === 'string' && typeof body['message'] === 'string') {
    const { code, message } = { code: body['code'], message: body['message'] };
    return typeof body['field'] === 'string'
      ? { code, message, field: body['field'] }
      : { code, message };
  }
  return UNEXPECTED_ERROR;
}
