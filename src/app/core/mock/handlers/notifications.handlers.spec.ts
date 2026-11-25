import type { components } from '@core/api/bff.generated';
import { addMonths, today } from '../data/mock-dates';
import {
  catalogOf,
  proofsForm,
  resetMockSettings,
  setUpMockBff,
  voucherFile,
} from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Paged = components['schemas']['PagedNotifications'];

async function signedIn(key: 'admin' | 'contract-guest' | 'temporary-guest'): Promise<MockHarness> {
  const mock = setUpMockBff();
  await mock.signIn(key);
  return mock;
}

describe('bell of the simulated BFF (contract v0.27.0)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('lists the inbox of the administrators newest first, with the server text and the count', async () => {
    const mock = await signedIn('admin');
    const page = await mock.get<Paged>('/bff/admin/notifications');
    expect(page.content.length).toBeGreaterThan(0);
    const dates = page.content.map((item) => item.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(page.unreadCount).toBe(page.content.filter((item) => item.readAt === null).length);
    expect(page.content.every((item) => item.title !== '' && item.body !== '')).toBe(true);
    const unread = await mock.get<Paged>('/bff/admin/notifications', { unread: 'true' });
    expect(unread.content.every((item) => item.readAt === null)).toBe(true);
    expect(unread.unreadCount).toBe(page.unreadCount);
  });

  it('marks one and then all as read, idempotently', async () => {
    const mock = await signedIn('admin');
    const before = await mock.get<Paged>('/bff/admin/notifications');
    const first = before.content.find((item) => item.readAt === null);
    await mock.send('POST', `/bff/admin/notifications/${first?.id ?? ''}/read`, null);
    await mock.send('POST', `/bff/admin/notifications/${first?.id ?? ''}/read`, null);
    const after = await mock.get<Paged>('/bff/admin/notifications');
    expect(after.unreadCount).toBe(before.unreadCount - 1);
    await mock.send('POST', '/bff/admin/notifications/read-all', null);
    expect((await mock.get<Paged>('/bff/admin/notifications')).unreadCount).toBe(0);
  });

  it('answers 404 for a notification of another inbox', async () => {
    const mock = await signedIn('admin');
    const admin = await mock.get<Paged>('/bff/admin/notifications');
    await mock.signIn('contract-guest');
    const error = await mock.fail(
      mock.send('POST', `/bff/guest/notifications/${admin.content[0]?.id ?? ''}/read`, null),
    );
    expect(error.status).toBe(404);
  });

  it('gives the guest with a contract its own bell, with a type this client may not know', async () => {
    const mock = await signedIn('contract-guest');
    const own = await mock.get<Paged>('/bff/guest/notifications');
    expect(own.content.map((item) => item.type)).toContain('HOUSE_ANNOUNCEMENT');
  });

  it('keeps the temporary guest out of /bff/guest/**, as the BFF does', async () => {
    const mock = await signedIn('temporary-guest');
    expect((await mock.fail(mock.get('/bff/guest/notifications'))).status).toBe(403);
  });

  it('keeps the bell of the guests out of the administration and the other way around', async () => {
    const mock = await signedIn('contract-guest');
    expect((await mock.fail(mock.get('/bff/admin/notifications'))).status).toBe(403);
    await mock.signIn('admin');
    expect(catalogOf(await mock.fail(mock.get('/bff/guest/notifications')))['code']).toBe(
      'AUTH_FORBIDDEN',
    );
  });

  it('tells the administrators of a proof the guest sends again, and the guest of the decision', async () => {
    const mock = await signedIn('contract-guest');
    const periods = await mock.get<components['schemas']['PeriodStatus'][]>(
      '/bff/guest/account-status',
    );
    const id = periods.find((period) => period.period === addMonths(today(), -1))?.paymentId ?? '';
    const body = proofsForm(
      [{ kind: 'VOUCHER', amount: 750, method: 'Yape', fileIndex: 0 }],
      [voucherFile()],
    );
    await mock.send('PUT', `/bff/guest/payments/${id}`, body);
    await mock.signIn('admin');
    const admin = await mock.get<Paged>('/bff/admin/notifications');
    expect(admin.content[0]).toEqual(
      expect.objectContaining({
        type: 'PAYMENT_PROOF_SUBMITTED',
        readAt: null,
        target: { kind: 'PAYMENT', id },
      }),
    );
    expect(admin.content[0]?.body).toContain('Luis');
    await mock.send('PATCH', `/bff/admin/payments/${id}`, {
      status: 'REJECTED',
      reason: 'Ilegible',
    });
    await mock.signIn('contract-guest');
    const guest = await mock.get<Paged>('/bff/guest/notifications');
    expect(guest.content[0]).toEqual(
      expect.objectContaining({ type: 'PAYMENT_REJECTED', target: { kind: 'PAYMENT', id } }),
    );
  });
});
