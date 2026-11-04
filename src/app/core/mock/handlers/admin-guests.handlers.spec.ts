import type { components } from '@core/api/bff.generated';
import { GUEST_IDS } from '../data/demo-users';
import { addDays, today } from '../data/mock-dates';
import { STAY_IDS } from '../data/seed-payments';
import { ENVIRONMENT_IDS } from '../data/seed-people';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];

const CONFLICT = {
  code: 'CONCURRENT_MODIFICATION',
  message: 'El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo',
};

async function admin(scenario: 'normal' | 'conflict' = 'normal'): Promise<MockHarness> {
  const mock = setUpMockBff(scenario);
  await mock.signIn('admin');
  return mock;
}

const stays = (mock: MockHarness, guestId: string) =>
  mock.get<Schemas['PagedStays']>(`/bff/admin/guests/${guestId}/stays`, { limit: 100 });

describe('admin guests in the simulated BFF', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('lists every guest with the counts of the notice', async () => {
    const mock = await admin();
    const page = await mock.get<Schemas['PagedGuests']>('/bff/admin/guests', {
      status: 'ALL',
      limit: 100,
    });
    expect(page.content).toHaveLength(6);
    expect(page.pendingActivationCount).toBe(1);
    expect(page.onboardingCount).toBe(0);
    const current = await mock.get<Schemas['PagedGuests']>('/bff/admin/guests');
    expect(current.content.map((guest) => guest.status)).not.toContain('INACTIVE');
    expect((await mock.fail(mock.get('/bff/admin/guests', { status: 'OTRO' }))).status).toBe(400);
  });

  it('answers the guest 360 in the variant of its status', async () => {
    const mock = await admin();
    const luis = await mock.get<Schemas['GuestDetail']>(`/bff/admin/guests/${GUEST_IDS.luis}`);
    expect(luis.status).toBe('ACTIVE');
    expect(luis.contract?.environmentCode).toBe('201');
    expect(luis.paymentHistory.length).toBeGreaterThan(0);
    const pending = await mock.get<Schemas['GuestDetail']>(
      `/bff/admin/guests/${GUEST_IDS.pending}`,
    );
    expect(pending).toEqual(
      expect.objectContaining({ status: 'PENDING_ACTIVATION', version: 1, name: null }),
    );
    const pedro = await mock.get<Schemas['GuestDetail']>(`/bff/admin/guests/${GUEST_IDS.pedro}`);
    expect(pedro.status).toBe('INACTIVE');
    expect((await mock.fail(mock.get('/bff/admin/guests/nadie'))).status).toBe(404);
  });

  it('corrects the document of a pending guest only with the current version', async () => {
    const mock = await admin();
    const url = `/bff/admin/guests/${GUEST_IDS.pending}`;
    const summary = await mock.send<Schemas['GuestSummary']>('PATCH', url, {
      version: 1,
      documentNumber: '70000016',
    });
    expect(summary.documentNumber).toBe('70000016');
    const stale = await mock.fail(
      mock.send('PATCH', url, { version: 1, documentNumber: '70000026' }),
    );
    expect(stale.status).toBe(409);
    expect(stale.error).toEqual(CONFLICT);
    const taken = await mock.fail(
      mock.send('PATCH', url, { version: 2, documentNumber: '70000002' }),
    );
    expect(catalogOf(taken)).toEqual({
      code: 'GUEST_DOCUMENT_TAKEN',
      message: SOME_TEXT,
      field: 'documentNumber',
    });
    const locked = await mock.fail(
      mock.send('PATCH', `/bff/admin/guests/${GUEST_IDS.luis}`, {
        version: 1,
        documentNumber: '1',
      }),
    );
    expect(catalogOf(locked)).toEqual({
      code: 'GUEST_DOCUMENT_LOCKED',
      message: SOME_TEXT,
      field: 'documentNumber',
    });
  });

  it('registers a stay, which then shows in the history and occupies its environment', async () => {
    const mock = await admin();
    const input = {
      environmentId: ENVIRONMENT_IDS.cabinC3,
      startDate: addDays(today(), 30),
      endDate: addDays(today(), 33),
      agreedAmount: 390.5,
    };
    const stay = await mock.send<Schemas['Stay']>(
      'POST',
      `/bff/admin/guests/${GUEST_IDS.ana}/stays`,
      input,
    );
    expect(stay).toEqual(
      expect.objectContaining({
        ...input,
        environmentCode: 'C3',
        paymentStatus: 'UNPAID',
        version: 1,
      }),
    );
    expect((await stays(mock, GUEST_IDS.ana)).content[0]?.id).toBe(stay.id);
    const overlap = await mock.fail(
      mock.send('POST', `/bff/admin/guests/${GUEST_IDS.ana}/stays`, input),
    );
    expect(catalogOf(overlap)).toEqual({ code: 'STAY_OVERLAP', message: SOME_TEXT });
    const taken = await mock.fail(
      mock.send('POST', `/bff/admin/guests/${GUEST_IDS.jorge}/stays`, input),
    );
    expect(taken.error).toEqual({
      code: 'ENVIRONMENT_OCCUPIED',
      message: 'El ambiente ya está ocupado en esas fechas',
    });
  });

  it('refuses a stay for a guest with a contract or an inactive one', async () => {
    const mock = await admin();
    const input = {
      environmentId: ENVIRONMENT_IDS.room203,
      startDate: today(),
      endDate: today(),
      agreedAmount: 100,
    };
    const contract = await mock.fail(
      mock.send('POST', `/bff/admin/guests/${GUEST_IDS.luis}/stays`, input),
    );
    expect(catalogOf(contract)).toEqual({ code: 'GUEST_NOT_TEMPORARY', message: SOME_TEXT });
    const inactive = await mock.fail(
      mock.send('POST', `/bff/admin/guests/${GUEST_IDS.pedro}/stays`, input),
    );
    expect(catalogOf(inactive)).toEqual({ code: 'GUEST_NOT_ACTIVE', message: SOME_TEXT });
    const backwards = { ...input, endDate: addDays(today(), -1) };
    const error = await mock.fail(
      mock.send('POST', `/bff/admin/guests/${GUEST_IDS.ana}/stays`, backwards),
    );
    expect(catalogOf(error)).toEqual({
      code: 'VALIDATION_ERROR',
      message: SOME_TEXT,
      field: 'endDate',
    });
  });

  it('corrects a stay with its version and answers 409 to a stale one (BE-SPR-DAT-13)', async () => {
    const mock = await admin();
    const url = `/bff/admin/guests/${GUEST_IDS.jorge}/stays/${STAY_IDS.jorgeNext}`;
    const updated = await mock.send<Schemas['Stay']>('PATCH', url, {
      version: 1,
      agreedAmount: 365,
    });
    expect(updated).toEqual(expect.objectContaining({ agreedAmount: 365, version: 2 }));
    const stale = await mock.fail(mock.send('PATCH', url, { version: 1, agreedAmount: 370 }));
    expect(stale.status).toBe(409);
    expect(stale.error).toEqual(CONFLICT);
    const listed = (await stays(mock, GUEST_IDS.jorge)).content.find(
      (stay) => stay.id === STAY_IDS.jorgeNext,
    );
    expect(listed).toEqual(expect.objectContaining({ agreedAmount: 365, version: 2 }));
    expect((await mock.fail(mock.send('PATCH', url, { agreedAmount: 1 }))).status).toBe(400);
  });

  it('keeps a stay without environment when its correction does not choose one', async () => {
    const mock = await admin();
    const url = `/bff/admin/guests/${GUEST_IDS.pedro}/stays/${STAY_IDS.pedroOld}`;
    const updated = await mock.send<Schemas['Stay']>('PATCH', url, {
      version: 1,
      agreedAmount: 260,
    });
    expect(updated).toEqual(
      expect.objectContaining({ environmentId: null, environmentCode: null, agreedAmount: 260 }),
    );
  });

  it('answers 409 CONCURRENT_MODIFICATION to every versioned edit in «Conflicto 409»', async () => {
    const mock = await admin('conflict');
    const url = `/bff/admin/guests/${GUEST_IDS.jorge}/stays/${STAY_IDS.jorgeNext}`;
    const stay = await mock.fail(mock.send('PATCH', url, { version: 1, agreedAmount: 365 }));
    expect(stay.error).toEqual(CONFLICT);
    const guest = await mock.fail(
      mock.send('PATCH', `/bff/admin/guests/${GUEST_IDS.pending}`, {
        version: 1,
        documentNumber: '7',
      }),
    );
    expect(guest.error).toEqual(CONFLICT);
    expect(
      (await stays(mock, GUEST_IDS.jorge)).content.find((item) => item.id === STAY_IDS.jorgeNext)
        ?.version,
    ).toBe(1);
  });

  it('lists the environments free in a range for the picker of A3.5', async () => {
    const mock = await admin();
    const page = await mock.get<Schemas['PagedEnvironments']>('/bff/admin/environments', {
      status: 'ACTIVE',
      freeFrom: today(),
      freeTo: addDays(today(), 2),
      limit: 100,
    });
    const codes = page.content.map((environment) => environment.code);
    expect(codes).toEqual(['C2', '203', 'C3']);
    expect(page.freeCount).toBe(2);
    expect((await mock.fail(mock.get('/bff/admin/environments', { freeTo: today() }))).status).toBe(
      400,
    );
  });
});
