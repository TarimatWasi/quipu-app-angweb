import { notificationLink } from './notification-link';

const ID = '00000005-0000-f000-c000-000000000001';

describe('notificationLink (contract v0.27.0)', () => {
  it('opens the payment, guest or contract of the administrator, and nothing else', () => {
    expect(notificationLink('ADMIN', { kind: 'PAYMENT', id: ID })).toBe(`/admin/payments/${ID}`);
    expect(notificationLink('ADMIN', { kind: 'GUEST', id: ID })).toBe(`/admin/guests/${ID}`);
    expect(notificationLink('ADMIN', { kind: 'CONTRACT', id: ID })).toBe(`/admin/contracts/${ID}`);
    expect(notificationLink('ADMIN', { kind: 'DOCUMENT', id: ID })).toBeNull();
  });

  it('opens the pages of each type of guest', () => {
    expect(notificationLink('CONTRACT', { kind: 'PAYMENT', id: ID })).toBe(`/guest/payments/${ID}`);
    expect(notificationLink('TEMPORARY', { kind: 'PAYMENT', id: ID })).toBe(
      `/temporary-guest/payment/${ID}`,
    );
    expect(notificationLink('CONTRACT', { kind: 'CONTRACT', id: ID })).toBe('/guest/contract');
    for (const kind of ['GUEST', 'FINE', 'REFUND'] as const)
      expect(notificationLink('CONTRACT', { kind, id: ID })).toBe('/home');
  });

  it('has no link without a target or with a kind it does not know', () => {
    expect(notificationLink('ADMIN', null)).toBeNull();
    const future = { kind: 'INVOICE', id: ID } as unknown as Parameters<typeof notificationLink>[1];
    expect(notificationLink('CONTRACT', future)).toBeNull();
  });

  it('escapes the opaque id for the address', () => {
    expect(notificationLink('ADMIN', { kind: 'PAYMENT', id: 'a/b' })).toBe('/admin/payments/a%2Fb');
  });
});
