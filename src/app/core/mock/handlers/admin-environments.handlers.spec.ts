import type { components } from '@core/api/bff.generated';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];
type Environment = Schemas['Environment'];

const LIST = '/bff/admin/environments';

afterEach(() => {
  resetMockSettings();
});

async function adminMock(): Promise<MockHarness> {
  const mock = setUpMockBff();
  await mock.signIn('admin');
  return mock;
}

const all = (mock: MockHarness, status: 'ACTIVE' | 'INACTIVE' = 'ACTIVE') =>
  mock.get<Schemas['PagedEnvironments']>(LIST, { status });

/** The first active environment that matches, from the list the BFF answers. */
async function some(mock: MockHarness, occupied: boolean): Promise<Environment> {
  const found = (await all(mock)).content.find(
    (environment) =>
      (environment.occupant !== null) === occupied &&
      (occupied || environment.nextOccupant === null),
  );
  if (found === undefined) throw new Error(`expected ${occupied ? 'an occupied' : 'a free'} one`);
  return found;
}

describe('the environments in the simulated BFF (A2)', () => {
  it('lists them by code with who is in them, who comes next and since when they are free', async () => {
    const mock = await adminMock();

    const page = await all(mock);

    const codes = page.content.map((environment) => environment.code);
    expect(codes).toEqual([...codes].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })));
    expect(page.content.some((environment) => environment.occupant !== null)).toBe(true);
    for (const environment of page.content) {
      expect(environment.status).toBe('ACTIVE');
      expect(environment.freeSince === null).toBe(environment.occupant !== null);
    }
    expect((await all(mock, 'INACTIVE')).content.every((e) => e.status === 'INACTIVE')).toBe(true);
  });

  it('creates an environment that is active, free and listed', async () => {
    const mock = await adminMock();

    const created = await mock.send<Environment>('POST', LIST, { code: ' C9 ', type: 'CABIN' });

    expect(created).toEqual(
      expect.objectContaining({ code: 'C9', type: 'CABIN', status: 'ACTIVE', occupant: null }),
    );
    expect((await all(mock)).content.map((environment) => environment.code)).toContain('C9');
  });

  it('refuses a code that is empty, badly written or already taken, and a missing type', async () => {
    const mock = await adminMock();
    const taken = (await all(mock)).content[0]?.code ?? '';
    const bad = async (body: object) => catalogOf(await mock.fail(mock.send('POST', LIST, body)));
    const invalid = (field: string) => ({ code: 'VALIDATION_ERROR', message: SOME_TEXT, field });

    expect(await bad({ code: '  ', type: 'ROOM' })).toEqual(invalid('code'));
    expect(await bad({ code: '1@3', type: 'ROOM' })).toEqual(invalid('code'));
    expect(await bad({ code: 'X1', type: 'SUITE' })).toEqual(invalid('type'));
    expect(await bad({ code: taken.toLowerCase(), type: 'ROOM' })).toEqual({
      code: 'ENVIRONMENT_CODE_TAKEN',
      message: SOME_TEXT,
      field: 'code',
    });
  });

  it('edits with the version it loaded and grows the version', async () => {
    const mock = await adminMock();
    const loaded = await some(mock, false);

    const edited = await mock.send<Environment>('PATCH', `${LIST}/${loaded.id}`, {
      version: loaded.version,
      code: '109-A',
    });

    expect(edited.code).toBe('109-A');
    expect(edited.type).toBe(loaded.type);
    expect(edited.version).toBe(loaded.version + 1);
  });

  it('answers 409 CONCURRENT_MODIFICATION to a stale version, and saves nothing', async () => {
    const mock = await adminMock();
    const loaded = await some(mock, false);
    await mock.send('PATCH', `${LIST}/${loaded.id}`, { version: loaded.version, code: 'Z1' });

    const error = await mock.fail(
      mock.send('PATCH', `${LIST}/${loaded.id}`, { version: loaded.version, code: 'Z2' }),
    );

    expect(catalogOf(error)).toEqual(expect.objectContaining({ code: 'CONCURRENT_MODIFICATION' }));
    expect((await mock.get<Environment>(`${LIST}/${loaded.id}`)).code).toBe('Z1');
  });

  it('refuses to edit into the code of another environment', async () => {
    const mock = await adminMock();
    const [first, second] = (await all(mock)).content;
    if (first === undefined || second === undefined) throw new Error('expected two');

    const error = await mock.fail(
      mock.send('PATCH', `${LIST}/${first.id}`, { version: first.version, code: second.code }),
    );

    expect(catalogOf(error)).toEqual(
      expect.objectContaining({ code: 'ENVIRONMENT_CODE_TAKEN', field: 'code' }),
    );
  });

  it('deactivates a free environment, which moves to the inactive ones, and reactivates it', async () => {
    const mock = await adminMock();
    const free = await some(mock, false);

    await mock.send('POST', `${LIST}/${free.id}/deactivate`, null);
    const inactive = await all(mock, 'INACTIVE');
    expect(inactive.content.find((environment) => environment.id === free.id)).toEqual(
      expect.objectContaining({ status: 'INACTIVE' }),
    );
    expect((await all(mock)).content.some((environment) => environment.id === free.id)).toBe(false);

    await mock.send('POST', `${LIST}/${free.id}/reactivate`, null);
    expect((await mock.get<Environment>(`${LIST}/${free.id}`)).status).toBe('ACTIVE');
  });

  it('does not deactivate an occupied one: 409 ENVIRONMENT_OCCUPIED with who is in it', async () => {
    const mock = await adminMock();
    const busy = await some(mock, true);

    const error = await mock.fail(mock.send('POST', `${LIST}/${busy.id}/deactivate`, null));

    expect(error.status).toBe(409);
    const body = error.error as Schemas['EnvironmentOccupiedError'];
    expect(body.code).toBe('ENVIRONMENT_OCCUPIED');
    expect(body.occupant?.guestId).toBe(busy.occupant?.guestId);
    expect((await mock.get<Environment>(`${LIST}/${busy.id}`)).status).toBe('ACTIVE');
  });

  it('answers 404 for an environment that does not exist', async () => {
    const mock = await adminMock();

    expect((await mock.fail(mock.get(`${LIST}/nadie`))).status).toBe(404);
    expect((await mock.fail(mock.send('POST', `${LIST}/nadie/deactivate`, null))).status).toBe(404);
  });

  it('is for the administration only', async () => {
    const mock = setUpMockBff();
    await mock.signIn('contract-guest');

    expect((await mock.fail(mock.get(`${LIST}/nadie`))).status).toBe(403);
  });
});
