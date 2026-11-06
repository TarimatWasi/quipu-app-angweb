import { HttpErrorResponse } from '@angular/common/http';

export const CSRF_INVALID_TEXT =
  'No se pudo validar la solicitud. Actualiza la página e inténtalo nuevamente.';
export const CSRF_PREPARATION_TEXT =
  'No se pudo preparar la seguridad de las solicitudes. Reintenta antes de guardar cambios.';

export function isCsrfFailure(error: unknown): boolean {
  if (!(error instanceof HttpErrorResponse) || error.status !== 403) return false;
  const body: unknown = error.error;
  return (
    typeof body === 'object' && body !== null && 'code' in body && body.code === 'AUTH_CSRF_INVALID'
  );
}
