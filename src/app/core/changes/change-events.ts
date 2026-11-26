import type { components } from '@core/api/bff.generated';

export type ChangeRole = 'ADMIN' | 'GUEST';
export type AdminChangeKey =
  | 'admin.dashboard'
  | 'admin.payments.queue'
  | 'admin.guests'
  | 'admin.contracts'
  | 'admin.environments'
  | 'admin.finance'
  | 'admin.credits'
  | 'admin.refunds'
  | 'admin.notifications'
  | `admin.payment:${string}`
  | `admin.guest:${string}`
  | `admin.environment:${string}`;
export type GuestChangeKey =
  | 'guest.home'
  | 'guest.payments'
  | 'guest.contract'
  | 'guest.stay'
  | 'guest.profile'
  | 'guest.notifications'
  | `guest.payment:${string}`;
export type ChangeKey = AdminChangeKey | GuestChangeKey;
export type ChangePayload = Omit<components['schemas']['AdminChange'], 'invalidate'> & {
  readonly invalidate: 'ALL' | readonly ChangeKey[];
};
export type ReadyPayload = components['schemas']['ChangeReady'];
export type ClosingPayload = components['schemas']['ChangeClosing'];

// MaskSession ids keep UUID grouping but their masked bits do not encode an RFC version/variant.
const UUID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const ADMIN_STATIC = new Set([
  'admin.dashboard',
  'admin.payments.queue',
  'admin.guests',
  'admin.contracts',
  'admin.environments',
  'admin.finance',
  'admin.credits',
  'admin.refunds',
  'admin.notifications',
]);
const GUEST_STATIC = new Set([
  'guest.home',
  'guest.payments',
  'guest.contract',
  'guest.stay',
  'guest.profile',
  'guest.notifications',
]);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function version(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function key(value: unknown, role: ChangeRole): value is ChangeKey {
  if (typeof value !== 'string') return false;
  if (role === 'ADMIN') {
    return (
      ADMIN_STATIC.has(value) ||
      new RegExp(String.raw`^admin\.(?:payment|guest|environment):${UUID}$`, 'i').test(value)
    );
  }
  return (
    GUEST_STATIC.has(value) || new RegExp(String.raw`^guest\.payment:${UUID}$`, 'i').test(value)
  );
}

const MAX_KEYS = 64;

/**
 * Tolerant reader (v0.29.0): the keys this client does not know, or that belong to the other area,
 * are dropped and the known ones kept, so a key the BFF adds later does not hide the others of the
 * same frame. A frame with no known key left changes nothing and is ignored, as is one that breaks
 * the shape of the contract (not a list of strings, empty or past its 64 keys).
 */
function invalidations(value: unknown, role: ChangeRole): ChangePayload['invalidate'] | null {
  if (value === 'ALL') return 'ALL';
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_KEYS ||
    !value.every((item) => typeof item === 'string')
  )
    return null;
  const known = [...new Set(value.filter((item): item is ChangeKey => key(item, role)))];
  return known.length > 0 ? known : null;
}

export function parseReady(data: string): ReadyPayload | null {
  try {
    const value: unknown = JSON.parse(data);
    return record(value) &&
      typeof value['epoch'] === 'string' &&
      new RegExp(`^${UUID}$`, 'i').test(value['epoch']) &&
      version(value['version']) &&
      Object.keys(value).length === 2
      ? { epoch: value['epoch'], version: value['version'] }
      : null;
  } catch {
    return null;
  }
}

export function parseChange(data: string, role: ChangeRole): ChangePayload | null {
  try {
    const value: unknown = JSON.parse(data);
    if (
      !record(value) ||
      typeof value['epoch'] !== 'string' ||
      !new RegExp(`^${UUID}$`, 'i').test(value['epoch']) ||
      !version(value['version'])
    )
      return null;
    const invalidate = invalidations(value['invalidate'], role);
    if (invalidate === null || Object.keys(value).length !== 3) return null;
    return { epoch: value['epoch'], version: value['version'], invalidate };
  } catch {
    return null;
  }
}

export function parseClosing(data: string): ClosingPayload | null {
  try {
    const value: unknown = JSON.parse(data);
    const reasons = [
      'access-token-expired',
      'session-updated',
      'session-revoked',
      'max-duration',
      'server-shutdown',
    ];
    return record(value) &&
      typeof value['reason'] === 'string' &&
      reasons.includes(value['reason']) &&
      Object.keys(value).length === 1
      ? { reason: value['reason'] as ClosingPayload['reason'] }
      : null;
  } catch {
    return null;
  }
}
