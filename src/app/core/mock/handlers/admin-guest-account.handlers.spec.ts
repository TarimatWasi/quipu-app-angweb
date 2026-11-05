import type { components } from '@core/api/bff.generated';
import { GUEST_IDS } from '../data/demo-users';
import { CONTRACT_IDS } from '../data/seed-people';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];

async function admin(): Promise<MockHarness> {
  const mock = setUpMockBff('normal');
  await mock.signIn('admin');
  return mock;
}

const detail = (mock: MockHarness, id: string) =>
  mock.get<Schemas['GuestDetail']>(`/bff/admin/guests/${id}`);
const months = (mock: MockHarness, id: string) =>
  mock.get<Schemas['PeriodStatus'][]>(`/bff/admin/guests/${id}/account-status`);

describe('the actions of A3.2 in the simulated BFF', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('answers the months of a guest with one scenario per state of the panel', async () => {
    const mock = await admin();

    const luis = await months(mock, GUEST_IDS.luis);
    const rejected = luis.at(-2);
    expect(rejected).toEqual(
      expect.objectContaining({ status: 'OVERDUE', contractId: CONTRACT_IDS.luis }),
    );
    expect(rejected?.paymentId).toEqual(expect.any(String));
    expect(rejected?.rejectionReason).toBe('El voucher no se lee; vuelve a subirlo con mejor luz.');
    expect(luis.at(-1)?.status).toBe('UNDER_REVIEW');
    const carmen = await months(mock, GUEST_IDS.reviewing);
    expect(carmen.map((month) => month.status)).toEqual(['PAID', 'PAID', 'UNDER_REVIEW']);
    const julia = await months(mock, GUEST_IDS.upToDate);
    expect(julia.map((month) => month.status)).toEqual(['PAID', 'PAID', 'PAID', 'PAID']);
    expect(await months(mock, GUEST_IDS.noContract)).toEqual([]);
    expect(await months(mock, GUEST_IDS.ana)).toEqual([]);
    expect((await mock.fail(months(mock, 'nadie'))).status).toBe(404);
  });

  it('discounts the credit of a guest once even with a past contract', async () => {
    const mock = await admin();
    const db = mock.bff.db;
    const current = db.contractOf(GUEST_IDS.reviewing);
    if (current === undefined) throw new Error('expected the contract of Carmen');
    db.data.contracts.push({ ...current, id: 'old-contract', status: 'EXPIRED' });
    db.credit(GUEST_IDS.reviewing).balance = 820;

    const all = await months(mock, GUEST_IDS.reviewing);

    // Only the contract in force is charged, so its months come once and the credit once.
    expect(all.map((item) => [item.contractId, item.status])).toEqual([
      [current.id, 'PAID'],
      [current.id, 'PAID'],
      [current.id, 'UNDER_REVIEW'],
    ]);
  });

  it('shows the onboarding and the lapsed guest as their states need', async () => {
    const mock = await admin();

    const onboarding = await detail(mock, GUEST_IDS.onboarding);
    expect(onboarding).toEqual(
      expect.objectContaining({ status: 'ONBOARDING', onboardingProgress: 'PERSONAL_DATA_SAVED' }),
    );
    const pending = await detail(mock, GUEST_IDS.pending);
    const minutes = (Date.parse(pending.accessExpiresAt ?? '') - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(17);
    expect(minutes).toBeLessThanOrEqual(18);
    const lapsed = await detail(mock, GUEST_IDS.lapsed);
    expect(lapsed).toEqual(
      expect.objectContaining({
        status: 'INACTIVE',
        onboardingProgress: 'NOT_STARTED',
        name: null,
      }),
    );
    expect(Date.parse(lapsed.accessExpiresAt ?? '')).toBeLessThan(Date.now());

    const back = await mock.send<Schemas['NonInactiveGuestSummary']>(
      'POST',
      `/bff/admin/guests/${GUEST_IDS.lapsed}/reactivate`,
      null,
    );
    expect(back.status).toBe('PENDING_ACTIVATION');
  });

  it('deactivates a guest without a contract in force and refuses one with it', async () => {
    const mock = await admin();

    await mock.send('POST', `/bff/admin/guests/${GUEST_IDS.noContract}/deactivate`, null);
    const deactivated = await detail(mock, GUEST_IDS.noContract);
    expect(deactivated.status).toBe('INACTIVE');
    expect(deactivated.status === 'INACTIVE' ? deactivated.deactivatedAt : null).toEqual(
      expect.any(String),
    );

    const refused = await mock.fail(
      mock.send('POST', `/bff/admin/guests/${GUEST_IDS.luis}/deactivate`, null),
    );
    expect(refused.status).toBe(409);
    expect(catalogOf(refused)).toEqual({
      code: 'GUEST_HAS_ACTIVE_CONTRACT',
      message: SOME_TEXT,
      contractId: CONTRACT_IDS.luis,
    });
    expect((await detail(mock, GUEST_IDS.luis)).status).toBe('ACTIVE');
  });

  it('generates a new access for a guest that is not inactive and keeps its expiry', async () => {
    const mock = await admin();
    const before = Date.now();

    const access = await mock.send<Schemas['AccessGrant']>(
      'POST',
      `/bff/admin/guests/${GUEST_IDS.expired}/access`,
      { accessMode: 'TEMPORARY_PASSWORD' },
    );
    if (access.mode !== 'TEMPORARY_PASSWORD') throw new Error('expected a temporary password');
    expect(access.shareMessage).toContain(access.temporaryPassword);
    expect(access.emailSent).toBe(false);
    expect((Date.parse(access.expiresAt) - before) / 60_000).toBeGreaterThan(29.9);
    expect((await detail(mock, GUEST_IDS.expired)).accessExpiresAt).toBe(access.expiresAt);
    const luis = await mock.send<Schemas['AccessGrant']>(
      'POST',
      `/bff/admin/guests/${GUEST_IDS.luis}/access`,
      { accessMode: 'LINK' },
    );
    expect(luis).toEqual(expect.objectContaining({ mode: 'LINK', emailSent: true }));

    const inactive = await mock.fail(
      mock.send('POST', `/bff/admin/guests/${GUEST_IDS.pedro}/access`, { accessMode: 'LINK' }),
    );
    expect(inactive.status).toBe(409);
    expect(catalogOf(inactive)).toEqual({
      code: 'GUEST_INACTIVE',
      message: SOME_TEXT,
      guestId: GUEST_IDS.pedro,
    });
    const wrong = await mock.fail(
      mock.send('POST', `/bff/admin/guests/${GUEST_IDS.luis}/access`, { accessMode: 'SMS' }),
    );
    expect(catalogOf(wrong)).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', field: 'accessMode' }),
    );
  });

  it('saves an account email and refuses one of another account, any case', async () => {
    const mock = await admin();
    const url = `/bff/admin/guests/${GUEST_IDS.jorge}/account-email`;

    await mock.send('PUT', url, { email: 'jorge.quispe@example.com' });
    expect((await detail(mock, GUEST_IDS.jorge)).accountEmail).toBe('jorge.quispe@example.com');

    const taken = await mock.fail(mock.send('PUT', url, { email: 'LUIS.HUAMAN@example.com' }));
    expect(taken.status).toBe(409);
    expect(catalogOf(taken)).toEqual({
      code: 'ACCOUNT_EMAIL_TAKEN',
      message: SOME_TEXT,
      field: 'email',
    });
    const invalid = await mock.fail(mock.send('PUT', url, { email: 'no-es-correo' }));
    expect(catalogOf(invalid)).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', field: 'email' }),
    );
    const inactive = await mock.fail(
      mock.send('PUT', `/bff/admin/guests/${GUEST_IDS.pedro}/account-email`, {
        email: 'pedro@example.com',
      }),
    );
    expect(catalogOf(inactive)).toEqual(expect.objectContaining({ code: 'GUEST_INACTIVE' }));
  });
});
