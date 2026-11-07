import type { components } from '@core/api/bff.generated';
import { GUEST_IDS } from '../data/demo-users';
import { ID_KIND } from '../data/mock-db';
import { catalogOf, resetMockSettings, setUpMockBff } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

interface Contracts {
  current: components['schemas']['Contract'];
  next: unknown;
}

async function contractGuest(): Promise<MockHarness> {
  const mock = setUpMockBff();
  await mock.signIn('contract-guest');
  return mock;
}

describe('H2 the own contract in the simulated BFF', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('answers the contract of the guest with a sample file to open, and no renewal', async () => {
    const mock = await contractGuest();

    const body = await mock.get<Contracts>('/bff/guest/contract');

    expect(body.current.guestId).toBe(GUEST_IDS.luis);
    expect(body.current.status).toBe('ACTIVE');
    expect(body.current.fileUrl).toBe('/mock-assets/voucher-muestra.pdf');
    expect(body.next).toBeNull();
  });

  it('adds the next contract when a renewal that starts later is already loaded', async () => {
    const mock = await contractGuest();
    const current = mock.bff.db.contractOf(GUEST_IDS.luis);
    if (current === undefined) throw new Error('expected the contract of Luis');
    mock.bff.db.data.contracts.push({
      ...current,
      id: mock.bff.db.newId(ID_KIND.contract),
      startDate: '2999-01-01',
      endDate: '2999-12-31',
    });

    const body = await mock.get<{ current: { id: string }; next: { startDate: string } | null }>(
      '/bff/guest/contract',
    );

    expect(body.current.id).toBe(current.id);
    expect(body.next?.startDate).toBe('2999-01-01');
  });

  it('says 404 to a guest that never had a contract', async () => {
    const mock = await contractGuest();
    mock.bff.db.data.contracts.length = 0;

    const error = await mock.fail(mock.get('/bff/guest/contract'));

    expect(error.status).toBe(404);
  });

  it('keeps it from the temporary guest', async () => {
    const mock = setUpMockBff();
    await mock.signIn('temporary-guest');

    const error = await mock.fail(mock.get('/bff/guest/contract'));

    expect(catalogOf(error)).toEqual(expect.objectContaining({ code: 'AUTH_FORBIDDEN' }));
  });

  it('keeps it from the administration', async () => {
    const mock = setUpMockBff();
    await mock.signIn('admin');

    expect((await mock.fail(mock.get('/bff/guest/contract'))).status).toBe(403);
  });
});
