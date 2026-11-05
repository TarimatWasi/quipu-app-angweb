import type { components } from '@core/api/bff.generated';
import { ADMIN_REVIEWER, DEMO_CLAVE } from '../data/demo-users';
import { ID_KIND, mockId } from '../data/mock-db';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];
type Summary = Schemas['AdministratorSummary'];

const URL = '/bff/admin/administrators';
const JULIO = mockId(ID_KIND.admin, 2);
const CARMEN = mockId(ID_KIND.admin, 3);
const PENDING = mockId(ID_KIND.admin, 4);

async function admin(): Promise<MockHarness> {
  const mock = setUpMockBff();
  await mock.signIn('admin');
  return mock;
}

const list = (mock: MockHarness) => mock.get<Summary[]>(URL);
const create = (mock: MockHarness, fields: Record<string, unknown> = {}) =>
  mock.send<Schemas['AdministratorCreated']>('POST', URL, {
    documentType: 'DNI',
    documentNumber: '41234567',
    email: 'otro.admin@example.com',
    currentPassword: DEMO_CLAVE,
    ...fields,
  });
const change = (mock: MockHarness, id: string, action: string, password = DEMO_CLAVE) =>
  mock.send<null>('POST', `${URL}/${id}/${action}`, { currentPassword: password });

describe('administrators in the simulated BFF (A7)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('lists the four seeded administrators oldest first, masked, with the session as «self»', async () => {
    const mock = await admin();
    const all = await list(mock);

    expect(all.map(({ name, status, self }) => ({ name, status, self }))).toEqual([
      { name: ADMIN_REVIEWER.name, status: 'ACTIVE', self: true },
      { name: 'Julio César Mamani Apaza', status: 'ACTIVE', self: false },
      { name: 'Carmen Rosa Huanca Flores', status: 'INACTIVE', self: false },
      { name: null, status: 'ACTIVE', self: false },
    ]);
    expect(all.map((one) => one.documentNumber)).toEqual([
      '*****001',
      '******654',
      '******123',
      '*****912',
    ]);
  });

  it('is only for the administrator', async () => {
    const mock = setUpMockBff();
    expect((await mock.fail(list(mock))).status).toBe(401);
    await mock.signIn('contract-guest');
    const forbidden = await mock.fail(list(mock));
    expect(forbidden.status).toBe(403);
    expect(catalogOf(forbidden)).toEqual({ code: 'AUTH_FORBIDDEN', message: SOME_TEXT });
  });

  it('creates a pending administrator, and emailSent is false for an email with «sin-envio»', async () => {
    const mock = await admin();

    const created = await create(mock);
    expect(created.emailSent).toBe(true);
    const unsent = await create(mock, {
      documentType: 'CE',
      documentNumber: 'X-77',
      email: 'Sin-Envio@example.com',
    });
    expect(unsent.emailSent).toBe(false);

    const all = await list(mock);
    expect(all).toHaveLength(6);
    expect(all.find((one) => one.id === created.id)).toEqual(
      expect.objectContaining({ name: null, status: 'ACTIVE', email: 'otro.admin@example.com' }),
    );
  });

  it('checks the password, the fields, the maximum and what is taken', async () => {
    const mock = await admin();
    const failure = async (fields: Record<string, unknown>) =>
      catalogOf(await mock.fail(create(mock, fields)));

    expect(await failure({ currentPassword: 'otra' })).toEqual({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: SOME_TEXT,
      field: 'currentPassword',
    });
    expect(await failure({ documentNumber: '1234' })).toEqual({
      code: 'VALIDATION_ERROR',
      message: SOME_TEXT,
      field: 'documentNumber',
    });
    expect(await failure({ email: 'no-es-correo' })).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', field: 'email' }),
    );
    expect(await failure({ documentNumber: '45678912' })).toEqual({
      code: 'ACCOUNT_DOCUMENT_TAKEN',
      message: SOME_TEXT,
      field: 'documentNumber',
    });
    // A guest's document is taken too.
    expect(await failure({ documentNumber: '70000002' })).toEqual(
      expect.objectContaining({ code: 'ACCOUNT_DOCUMENT_TAKEN' }),
    );
    expect(await failure({ email: 'JULIO.mamani@example.com' })).toEqual({
      code: 'ACCOUNT_EMAIL_TAKEN',
      message: SOME_TEXT,
      field: 'email',
    });

    await create(mock, { documentNumber: '41111111', email: 'a@example.com' });
    await create(mock, { documentNumber: '42222222', email: 'b@example.com' });
    const limit = await mock.fail(create(mock));
    expect(limit.status).toBe(409);
    expect(catalogOf(limit)).toEqual({ code: 'ADMIN_LIMIT_REACHED', message: SOME_TEXT });
  });

  it('deactivates and reactivates another administrator after checking the password', async () => {
    const mock = await admin();

    const wrong = await mock.fail(change(mock, JULIO, 'deactivate', 'otra'));
    expect(wrong.status).toBe(403);
    expect((await list(mock)).find((one) => one.id === JULIO)?.status).toBe('ACTIVE');

    expect(await change(mock, JULIO, 'deactivate')).toBeNull();
    expect((await list(mock)).find((one) => one.id === JULIO)?.status).toBe('INACTIVE');
    // Idempotent both ways.
    expect(await change(mock, JULIO, 'deactivate')).toBeNull();
    expect(await change(mock, CARMEN, 'reactivate')).toBeNull();
    expect(await change(mock, CARMEN, 'reactivate')).toBeNull();
    expect((await list(mock)).find((one) => one.id === CARMEN)?.status).toBe('ACTIVE');
  });

  it('refuses the own account, the last active one, the maximum and an unknown id', async () => {
    const mock = await admin();

    const self = await mock.fail(change(mock, ADMIN_REVIEWER.id, 'deactivate'));
    expect(catalogOf(self)).toEqual({ code: 'ADMIN_SELF_DEACTIVATION', message: SOME_TEXT });
    expect((await mock.fail(change(mock, 'nadie', 'deactivate'))).status).toBe(404);

    await change(mock, JULIO, 'deactivate');
    await change(mock, PENDING, 'deactivate');
    mock.bff.db.data.administrators.forEach((record) => {
      if (record.id === ADMIN_REVIEWER.id) record.status = 'INACTIVE';
    });
    await change(mock, CARMEN, 'reactivate');
    const last = await mock.fail(change(mock, CARMEN, 'deactivate'));
    expect(catalogOf(last)).toEqual({ code: 'LAST_ACTIVE_ADMIN', message: SOME_TEXT });

    for (const n of [5, 6, 7, 8]) {
      await create(mock, {
        documentNumber: `4${String(n).repeat(7)}`,
        email: `n${String(n)}@example.com`,
      });
    }
    const full = await mock.fail(change(mock, JULIO, 'reactivate'));
    expect(catalogOf(full)).toEqual({ code: 'ADMIN_LIMIT_REACHED', message: SOME_TEXT });
  });
});
