import { parseChange, parseClosing, parseReady } from './change-events';

const epoch = 'f18a40da-6ddf-4ab4-a75b-f4ad8de2d615';
const payload = (invalidate: unknown) => JSON.stringify({ epoch, version: 2, invalidate });

describe('SSE contract messages (QP-SPRMONO-SSE-04)', () => {
  it('accepts ready and typed closing, rejects malformed data and unsafe counters', () => {
    expect(parseReady(JSON.stringify({ epoch, version: 0 }))).toEqual({ epoch, version: 0 });
    for (const data of [
      'null',
      '{',
      '{}',
      JSON.stringify({ epoch: 'bad', version: 0 }),
      JSON.stringify({ epoch, version: 2 ** 53 }),
    ])
      expect(parseReady(data)).toBeNull();
    expect(parseClosing('{"reason":"access-token-expired"}')).toEqual({
      reason: 'access-token-expired',
    });
    expect(parseClosing('{"reason":"unknown"}')).toBeNull();
    expect(parseClosing('null')).toBeNull();
  });

  it('admits only keys of the receiving area, bounded and distinct', () => {
    expect(
      parseChange(payload(['admin.dashboard', `admin.guest:${epoch}`]), 'ADMIN'),
    ).not.toBeNull();
    expect(parseChange(payload(['guest.home', `guest.payment:${epoch}`]), 'GUEST')).not.toBeNull();
    expect(parseChange(payload('ALL'), 'GUEST')?.invalidate).toBe('ALL');
    for (const keys of [
      [],
      ['ALL'],
      ['guest.home'],
      ['admin.dashboard', 'admin.dashboard'],
      ['admin.payment:unmasked'],
      Array(65).fill('admin.dashboard'),
    ])
      expect(parseChange(payload(keys), 'ADMIN')).toBeNull();
    expect(parseChange(payload(['admin.dashboard']), 'GUEST')).toBeNull();
    expect(parseChange('{', 'GUEST')).toBeNull();
  });
  it('accepts opaque masked ids without imposing RFC version or variant bits', () => {
    const masked = '00000000-0000-f000-c000-000000000001';
    const adminKeys = [
      'admin.payments.queue',
      `admin.payment:${masked}`,
      `admin.guest:${masked}`,
      `admin.environment:${masked}`,
    ];
    expect(parseChange(payload(adminKeys), 'ADMIN')?.invalidate).toEqual(adminKeys);
    const guestKeys = ['guest.home', 'guest.profile', `guest.payment:${masked}`];
    expect(parseChange(payload(guestKeys), 'GUEST')?.invalidate).toEqual(guestKeys);
    expect(parseChange(payload(['guest.profile']), 'ADMIN')).toBeNull();
    expect(parseChange(payload([`guest.payment:${masked}x`]), 'GUEST')).toBeNull();
    expect(
      parseChange(payload([`admin.payment:${masked.replace('f000', 'zzzz')}`]), 'ADMIN'),
    ).toBeNull();
  });
});
