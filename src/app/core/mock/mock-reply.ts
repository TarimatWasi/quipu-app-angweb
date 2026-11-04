import type { HttpParams } from '@angular/common/http';
import type { components } from '@core/api/bff.generated';
import type { MockReply } from './mock-types';

type ErrorBody = components['schemas']['Error'];
type ConcurrentModificationError = components['schemas']['ConcurrentModificationError'];

export function ok(body: unknown, status = 200): MockReply {
  return { status, body };
}

export function noContent(status: 202 | 204 = 204): MockReply {
  return { status, body: null };
}

/** An error of the catalog of the BFF: `{ code, message, field? }`, message in Spanish. */
export function failure(status: number, code: string, message: string, field?: string): MockReply {
  const body: ErrorBody = field === undefined ? { code, message } : { code, message, field };
  return { status, body };
}

/** Thrown by a handler to answer an error at once; the simulated BFF turns it into the reply. */
export class MockFailure extends Error {
  constructor(readonly reply: MockReply) {
    super(`Mock BFF ${String(reply.status)}`);
  }
}

export function raise(status: number, code: string, message: string, field?: string): never {
  throw new MockFailure(failure(status, code, message, field));
}

export function invalid(field: string): never {
  return raise(400, 'VALIDATION_ERROR', 'Revisa los datos ingresados', field);
}

export function notFound(): never {
  return raise(404, 'RESOURCE_NOT_FOUND', 'No encontramos lo que buscas.');
}

/** The 409 of optimistic locking (BE-SPR-DAT-13), with the text of the contract's example. */
export function concurrentModification(): MockReply {
  const body: ConcurrentModificationError = {
    code: 'CONCURRENT_MODIFICATION',
    message: 'El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo',
  };
  return { status: 409, body };
}

export function raiseConcurrentModification(): never {
  throw new MockFailure(concurrentModification());
}

export interface Page<T> {
  readonly content: T[];
  readonly nextCursor: string | null;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const CURSOR_PREFIX = 'mock:';

function limitOf(query: HttpParams): number {
  const raw = query.get('limit');
  if (raw === null) {
    return DEFAULT_LIMIT;
  }
  const limit = Number(raw);
  return Number.isInteger(limit) && limit >= 1 && limit <= MAX_LIMIT ? limit : invalid('limit');
}

function offsetOf(query: HttpParams): number {
  const raw = query.get('after');
  if (raw === null) {
    return 0;
  }
  let decoded: string;
  try {
    decoded = atob(raw);
  } catch {
    return invalid('after');
  }
  const offset = Number(decoded.slice(CURSOR_PREFIX.length));
  return decoded.startsWith(CURSOR_PREFIX) && Number.isInteger(offset) && offset > 0
    ? offset
    : invalid('after');
}

/** One page of `items` with the `limit` and the opaque `after` cursor of the query (1 to 100). */
export function paginate<T>(items: readonly T[], query: HttpParams): Page<T> {
  const limit = limitOf(query);
  const offset = offsetOf(query);
  const end = offset + limit;
  return {
    content: items.slice(offset, end),
    nextCursor: end < items.length ? btoa(`${CURSOR_PREFIX}${String(end)}`) : null,
  };
}
