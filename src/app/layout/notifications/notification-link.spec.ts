import { notificationLink } from './notification-link';

const ID = '00000005-0000-f000-c000-000000000001';
const GUEST = '00000001-0000-f000-c000-000000000009';

describe('notificationLink (contract v0.30.0)', () => {
  it('opens the payment, guest, contract or documents of the guest for the administrator', () => {
    expect(notificationLink('ADMIN', { kind: 'PAYMENT', id: ID })).toBe(`/admin/payments/${ID}`);
    expect(notificationLink('ADMIN', { kind: 'GUEST', id: ID })).toBe(`/admin/guests/${ID}`);
    expect(notificationLink('ADMIN', { kind: 'CONTRACT', id: ID })).toBe(`/admin/contracts/${ID}`);
    expect(notificationLink('ADMIN', { kind: 'DOCUMENT', id: ID, guestId: GUEST })).toBe(
      `/admin/guests/${GUEST}/documents?document=${ID}`,
    );
    expect(notificationLink('ADMIN', { kind: 'DOCUMENT', id: ID })).toBeNull();
  });

  it('opens the payment, contract and credit of the guest with a contract; a fine opens nothing', () => {
    expect(notificationLink('CONTRACT', { kind: 'PAYMENT', id: ID })).toBe(`/guest/payments/${ID}`);
    expect(notificationLink('CONTRACT', { kind: 'CONTRACT', id: ID })).toBe('/guest/contract');
    expect(notificationLink('CONTRACT', { kind: 'REFUND', id: ID })).toBe('/home');
    expect(notificationLink('CONTRACT', { kind: 'FINE', id: ID })).toBeNull();
  });

  it('opens the payment and the payment status (with its refund) of the temporary guest', () => {
    expect(notificationLink('TEMPORARY', { kind: 'PAYMENT', id: ID })).toBe(
      `/temporary-guest/payment/${ID}`,
    );
    expect(notificationLink('TEMPORARY', { kind: 'GUEST', id: ID })).toBe('/home');
    expect(notificationLink('TEMPORARY', { kind: 'REFUND', id: ID })).toBe('/home');
    expect(notificationLink('TEMPORARY', { kind: 'CONTRACT', id: ID })).toBeNull();
  });

  it('has no link without a target or with a kind it does not know', () => {
    expect(notificationLink('ADMIN', null)).toBeNull();
    expect(notificationLink('CONTRACT', { kind: 'INVOICE', id: ID })).toBeNull();
  });

  it('escapes the opaque ids for the address', () => {
    expect(notificationLink('ADMIN', { kind: 'PAYMENT', id: 'a/b' })).toBe('/admin/payments/a%2Fb');
  });
});
