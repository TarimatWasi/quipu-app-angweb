import type { components } from '@core/api/bff.generated';
import { GUEST_IDS } from '../data/demo-users';
import { addDays, today } from '../data/mock-dates';
import {
  CASE_CONTRACT_IDS,
  CASE_ENVIRONMENT_IDS,
  CASE_GUEST_IDS,
} from '../data/seed-contract-cases';
import { CONTRACT_IDS, ENVIRONMENT_IDS } from '../data/seed-people';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];

async function admin(): Promise<MockHarness> {
  const mock = setUpMockBff();
  await mock.signIn('admin');
  return mock;
}

function pdf(name = 'contrato.pdf', type = 'application/pdf', bytes = 'pdf'): File {
  return new File([bytes], name, { type });
}

/** A multipart body like the service sends; `overrides` replace a field, `null` removes it. */
function form(overrides: Readonly<Record<string, string | File | null>> = {}): FormData {
  const fields: Record<string, string | File> = {
    file: pdf(),
    environmentId: ENVIRONMENT_IDS.room203,
    guestId: GUEST_IDS.noContract,
    monthlyAmount: '650.50',
    paymentDay: '5',
    graceDays: '3',
    startDate: today(),
    endDate: addDays(today(), 364),
  };
  const body = new FormData();
  for (const [name, value] of Object.entries({ ...fields, ...overrides })) {
    if (value === null) continue;
    if (value instanceof File) body.append(name, value, value.name);
    else body.append(name, value);
  }
  return body;
}

const list = (mock: MockHarness, query: Record<string, string | number> = {}) =>
  mock.get<Schemas['PagedContracts']>('/bff/admin/contracts', query);

describe('admin contracts in the simulated BFF', () => {
  afterEach(() => {
    vi.useRealTimers();
    resetMockSettings();
  });

  it('lists the contracts of a state without the signed file, the soonest end first', async () => {
    const mock = await admin();
    const active = await list(mock, { status: 'ACTIVE' });
    expect(active.content).toHaveLength(7);
    expect(active.content[0]).toEqual(
      expect.objectContaining({ environmentCode: expect.any(String) as unknown, status: 'ACTIVE' }),
    );
    expect(active.content[0]).not.toHaveProperty('fileUrl');
    const ends = active.content.map((contract) => contract.endDate ?? '9999-12-31');
    expect(ends).toEqual([...ends].sort());
    expect((await list(mock, { status: 'EXPIRED' })).content.map((item) => item.id)).toEqual([
      CASE_CONTRACT_IDS.expired,
    ]);
    expect((await list(mock, { status: 'ACTIVE', limit: 2 })).nextCursor).not.toBeNull();
  });

  it('refuses a state that does not exist and «por vencer» with another state', async () => {
    const mock = await admin();
    expect((await mock.fail(list(mock, { status: 'OTRO' }))).status).toBe(400);
    expect((await mock.fail(list(mock, { status: 'EXPIRED', expiringSoon: 'true' }))).status).toBe(
      400,
    );
    const soon = await list(mock, { expiringSoon: 'true' });
    expect(soon.content.map((item) => item.id)).toEqual([CASE_CONTRACT_IDS.expiring]);
    expect(soon.content[0]?.expiringSoon).toBe(true);
  });

  it('gives the detail with the signed file and answers 404 to an unknown one', async () => {
    const mock = await admin();
    const detail = await mock.get<Schemas['Contract']>(`/bff/admin/contracts/${CONTRACT_IDS.luis}`);
    expect(detail.fileUrl).toEqual(expect.stringContaining('.pdf'));
    expect(detail.file.name).toEqual(expect.any(String));
    expect((await mock.fail(mock.get('/bff/admin/contracts/nadie'))).status).toBe(404);
  });

  it('loads a contract, which then shows in the list and occupies its environment', async () => {
    // A contract that starts today owes its first month once the payment day and its grace have
    // passed (day 5 plus 3): on the 9th the second load would say «deuda» and not «ocupado».
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-02T17:00:00Z'));
    const mock = await admin();
    const created = await mock.send<Schemas['Contract']>('POST', '/bff/admin/contracts', form());
    expect(created).toEqual(
      expect.objectContaining({
        environmentCode: '203',
        guestId: GUEST_IDS.noContract,
        monthlyAmount: 650.5,
        paymentDay: 5,
        graceDays: 3,
        status: 'ACTIVE',
        file: expect.objectContaining({ name: 'contrato.pdf' }) as unknown,
      }),
    );
    expect((await list(mock, { status: 'ACTIVE' })).content.map((item) => item.id)).toContain(
      created.id,
    );
    const again = await mock.fail(mock.send('POST', '/bff/admin/contracts', form()));
    expect(again.error).toEqual(
      expect.objectContaining({
        code: 'ENVIRONMENT_OCCUPIED',
        occupant: expect.anything() as unknown,
      }),
    );
  });

  it('loads an open-ended contract when the end date is left out', async () => {
    const mock = await admin();
    const created = await mock.send<Schemas['Contract']>(
      'POST',
      '/bff/admin/contracts',
      form({ endDate: null }),
    );
    expect(created.endDate).toBeNull();
    expect(created.expiringSoon).toBe(false);
  });

  it('answers 400 under the field that is wrong', async () => {
    const mock = await admin();
    const wrong = async (overrides: Parameters<typeof form>[0]) =>
      catalogOf(await mock.fail(mock.send('POST', '/bff/admin/contracts', form(overrides))));

    expect(await wrong({ file: pdf('foto.jpg', 'image/jpeg') })).toEqual({
      code: 'CONTRACT_INVALID_FILE',
      message: SOME_TEXT,
      field: 'file',
    });
    expect(await wrong({ file: null })).toEqual(expect.objectContaining({ field: 'file' }));
    expect(await wrong({ endDate: today() })).toEqual({
      code: 'CONTRACT_INVALID_DATES',
      message: SOME_TEXT,
      field: 'endDate',
    });
    for (const [field, value] of [
      ['monthlyAmount', '0'],
      ['monthlyAmount', '650.555'],
      ['paymentDay', '32'],
      ['graceDays', '-1'],
      ['startDate', 'mañana'],
    ] as const) {
      expect(await wrong({ [field]: value })).toEqual({
        code: 'VALIDATION_ERROR',
        message: SOME_TEXT,
        field,
      });
    }
    const json = await mock.fail(mock.send('POST', '/bff/admin/contracts', {}));
    expect(json.status).toBe(415);
  });

  it('answers 404 to an environment or a guest that does not exist', async () => {
    const mock = await admin();
    const send = (overrides: Parameters<typeof form>[0]) =>
      mock.fail(mock.send('POST', '/bff/admin/contracts', form(overrides)));
    expect((await send({ environmentId: 'nada' })).error).toEqual(
      expect.objectContaining({ code: 'ENVIRONMENT_NOT_FOUND' }),
    );
    expect((await send({ guestId: 'nadie' })).error).toEqual(
      expect.objectContaining({ code: 'GUEST_NOT_FOUND' }),
    );
  });

  it('answers 409 in the order of the guest and then the environment', async () => {
    const mock = await admin();
    const code = async (overrides: Parameters<typeof form>[0]) =>
      (
        (await mock.fail(mock.send('POST', '/bff/admin/contracts', form(overrides)))).error as {
          code: string;
        }
      ).code;

    expect(await code({ guestId: GUEST_IDS.pedro })).toBe('GUEST_NOT_ACTIVE');
    expect(await code({ guestId: GUEST_IDS.ana })).toBe('GUEST_NOT_CONTRACT');
    expect(await code({ environmentId: ENVIRONMENT_IDS.room204 })).toBe('ENVIRONMENT_INACTIVE');
    expect(await code({ environmentId: ENVIRONMENT_IDS.room201 })).toBe('ENVIRONMENT_OCCUPIED');
  });

  it('refuses a guest that owes months, with what it owes', async () => {
    const mock = await admin();
    const owing = await mock.fail(
      mock.send('POST', '/bff/admin/contracts', form({ guestId: GUEST_IDS.luis })),
    );
    expect(owing.status).toBe(409);
    expect(owing.error).toEqual(
      expect.objectContaining({
        code: 'GUEST_HAS_PENDING_DEBT',
        periods: expect.any(Array) as unknown,
      }),
    );
  });

  it('finalizes a contract, frees its environment and does it again without changing anything', async () => {
    const mock = await admin();
    const url = `/bff/admin/contracts/${CONTRACT_IDS.luis}`;
    await mock.send('POST', `${url}/terminate`, null);
    const detail = await mock.get<Schemas['Contract']>(url);
    expect(detail).toEqual(
      expect.objectContaining({ status: 'TERMINATED', terminatedAt: today() }),
    );
    await mock.send('POST', `${url}/terminate`, null);
    expect((await mock.get<Schemas['Contract']>(url)).terminatedAt).toBe(today());
    expect((await list(mock, { status: 'TERMINATED' })).content).toHaveLength(2);
    const environment = await mock.get<Schemas['Environment']>(
      `/bff/admin/environments/${ENVIRONMENT_IDS.room201}`,
    );
    expect(environment.occupant).toBeNull();
    expect(
      (await mock.fail(mock.send('POST', '/bff/admin/contracts/nadie/terminate', null))).status,
    ).toBe(404);
  });
});

describe('the seeded contracts of every state (A4)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  const detail = (mock: MockHarness, id: string) =>
    mock.get<Schemas['Contract']>(`/bff/admin/contracts/${id}`);
  const months = (mock: MockHarness, guestId: string, contractId: string) =>
    mock
      .get<Schemas['PeriodStatus'][]>(`/bff/admin/guests/${guestId}/account-status`)
      .then((all) => all.filter((month) => month.contractId === contractId));

  it('has one with no end date, one about to end, one expired, one finalized and one to begin', async () => {
    const mock = await admin();

    const open = await detail(mock, CASE_CONTRACT_IDS.openEnded);
    expect(open).toEqual(expect.objectContaining({ status: 'ACTIVE', expiringSoon: false }));
    expect(open.endDate ?? null).toBeNull();
    expect(await detail(mock, CASE_CONTRACT_IDS.expiring)).toEqual(
      expect.objectContaining({ status: 'ACTIVE', expiringSoon: true }),
    );
    expect(await detail(mock, CASE_CONTRACT_IDS.expired)).toEqual(
      expect.objectContaining({ status: 'EXPIRED', expiringSoon: false }),
    );
    expect(await detail(mock, CASE_CONTRACT_IDS.terminated)).toEqual(
      expect.objectContaining({
        status: 'TERMINATED',
        terminatedAt: expect.any(String) as unknown,
      }),
    );
    const upcoming = await detail(mock, CASE_CONTRACT_IDS.upcoming);
    expect(upcoming.status).toBe('ACTIVE');
    expect(upcoming.startDate > today()).toBe(true);
  });

  it('occupies the environment of the ones in force and frees the ones that ended', async () => {
    const mock = await admin();
    const environment = (id: string) =>
      mock.get<Schemas['Environment']>(`/bff/admin/environments/${id}`);

    expect((await environment(CASE_ENVIRONMENT_IDS.room103)).occupant).not.toBeNull();
    expect((await environment(CASE_ENVIRONMENT_IDS.room104)).occupant).not.toBeNull();
    expect((await environment(CASE_ENVIRONMENT_IDS.room207)).occupant).toBeNull();
    expect((await environment(CASE_ENVIRONMENT_IDS.room208)).occupant).toBeNull();
    const reserved = await environment(CASE_ENVIRONMENT_IDS.room105);
    expect(reserved.occupant).toBeNull();
    expect(reserved.nextOccupant?.contractId).toBe(CASE_CONTRACT_IDS.upcoming);
  });

  it('leaves the expired one paid and the finalized one with the months it still owes (D-31)', async () => {
    const mock = await admin();

    const expired = await months(mock, CASE_GUEST_IDS.expired, CASE_CONTRACT_IDS.expired);
    expect(expired.length).toBeGreaterThan(1);
    expect(expired.every((month) => month.status === 'PAID')).toBe(true);
    const terminated = await months(mock, CASE_GUEST_IDS.terminated, CASE_CONTRACT_IDS.terminated);
    const owed = terminated.filter((month) => month.status !== 'PAID');
    expect(owed.length).toBeGreaterThanOrEqual(1);
    expect(owed.some((month) => month.status === 'OVERDUE')).toBe(true);
    expect(terminated.at(-1)?.period).toBe(
      (await detail(mock, CASE_CONTRACT_IDS.terminated)).terminatedAt?.slice(0, 7),
    );
  });

  it('lets a guest with an expired contract take a new one and stops the one that owes', async () => {
    const mock = await admin();

    const renewed = await mock.send<Schemas['Contract']>(
      'POST',
      '/bff/admin/contracts',
      form({ guestId: CASE_GUEST_IDS.expired, environmentId: CASE_ENVIRONMENT_IDS.cabinC4 }),
    );
    expect(renewed.environmentCode).toBe('C4');
    const owing = await mock.fail(
      mock.send(
        'POST',
        '/bff/admin/contracts',
        form({ guestId: CASE_GUEST_IDS.terminated, environmentId: CASE_ENVIRONMENT_IDS.room207 }),
      ),
    );
    expect(owing.error).toEqual(
      expect.objectContaining({
        code: 'GUEST_HAS_PENDING_DEBT',
        debts: expect.any(Array) as unknown,
      }),
    );
  });

  it('shows in the dashboard the contract about to end', async () => {
    const mock = await admin();

    const dashboard = await mock.get<{ expiringContracts: { count: number } }>(
      '/bff/admin/dashboard',
    );

    expect(dashboard.expiringContracts.count).toBe(1);
  });
});
