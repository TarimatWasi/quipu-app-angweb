// Reading a failed call of the BFF without ever keeping its text (QP-ANGWEB-BFF-02).

/** What a failed call answered: its status and, when the body is the BFF's, its code and field. */
export interface CallFailure {
  readonly status: number;
  readonly code: string | null;
  readonly field: string | null;
  readonly body: Readonly<Record<string, unknown>>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Reads the code and the field of a failed call (an HttpErrorResponse: its `status` and its body in
 * `error`); the server's `message` is never kept. Anything else is a failure without status (-1).
 */
export function callFailure(error: unknown): CallFailure {
  if (!isRecord(error) || typeof error['status'] !== 'number') {
    return { status: -1, code: null, field: null, body: {} };
  }
  const status = error['status'];
  const body: unknown = error['error'];
  if (!isRecord(body)) return { status, code: null, field: null, body: {} };
  const code = typeof body['code'] === 'string' ? body['code'] : null;
  const field = typeof body['field'] === 'string' ? body['field'] : null;
  return { status, code, field, body };
}
