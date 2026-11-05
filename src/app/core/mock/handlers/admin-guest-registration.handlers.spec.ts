import type { components } from '@core/api/bff.generated';
import { GUEST_IDS } from '../data/demo-users';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];

async function admin(): Promise<MockHarness> {
  const mock = setUpMockBff('normal');
  await mock.signIn('admin');
  return mock;
}

const NEW_GUEST = {
  documentType: 'DNI',
  documentNumber: '71234567',
  type: 'CONTRACT',
  accessMode: 'LINK',
} as const;

describe('guest registration in the simulated BFF (A3.1)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('creates a pending guest with a 30-minute link and lists it', async () => {
    const mock = await admin();
    const before = Date.now();
    const created = await mock.send<Schemas['GuestCreated']>('POST', '/bff/admin/guests', {
      ...NEW_GUEST,
      phone: '+51 987 000 111',
    });

    expect(created.alreadyRegistered).toBe(false);
    expect(created.guest).toEqual(
      expect.objectContaining({
        documentType: 'DNI',
        documentNumber: '71234567',
        name: null,
        type: 'CONTRACT',
        status: 'PENDING_ACTIVATION',
      }),
    );
    const access = created.access;
    if (access.mode !== 'LINK') throw new Error('expected a link');
    expect(access.activationUrl).toMatch(/\/activate#token=/);
    expect(access.shareMessage).toContain(access.activationUrl);
    expect(access.emailSent).toBe(false);
    const minutes = (Date.parse(access.expiresAt) - before) / 60_000;
    expect(minutes).toBeGreaterThan(29.9);
    expect(minutes).toBeLessThanOrEqual(30.1);

    const list = await mock.get<Schemas['PagedGuests']>('/bff/admin/guests', { limit: 100 });
    expect(list.content.map((guest) => guest.id)).toContain(created.guest.id);
  });

  it('gives a temporary password and says whether the email went out', async () => {
    const mock = await admin();
    const sent = await mock.send<Schemas['GuestCreated']>('POST', '/bff/admin/guests', {
      ...NEW_GUEST,
      accessMode: 'TEMPORARY_PASSWORD',
      contactEmail: 'nuevo@example.com',
    });
    if (sent.access.mode !== 'TEMPORARY_PASSWORD') throw new Error('expected a password');
    expect(sent.access.shareMessage).toContain(sent.access.temporaryPassword);
    expect(sent.access.emailSent).toBe(true);

    const unsent = await mock.send<Schemas['GuestCreated']>('POST', '/bff/admin/guests', {
      ...NEW_GUEST,
      documentNumber: '71234568',
      contactEmail: 'nuevo-sin-envio@example.com',
    });
    expect(unsent.access.emailSent).toBe(false);
  });

  it('answers the existing guest, unchanged, when the document is already registered', async () => {
    const mock = await admin();
    const answer = await mock.send<Schemas['GuestAlreadyRegistered']>('POST', '/bff/admin/guests', {
      ...NEW_GUEST,
      documentNumber: '70000006',
    });
    expect(answer).toEqual({
      alreadyRegistered: true,
      guest: {
        id: GUEST_IDS.pending,
        documentType: 'DNI',
        documentNumber: '70000006',
        name: null,
        type: 'CONTRACT',
        status: 'PENDING_ACTIVATION',
        hasLoginAccess: false,
      },
    });
  });

  it('refuses an inactive guest with its id, an administrator document and taken emails', async () => {
    const mock = await admin();
    const create = (body: object) =>
      mock.fail(mock.send('POST', '/bff/admin/guests', { ...NEW_GUEST, ...body }));

    const inactive = await create({ documentType: 'PASSPORT', documentNumber: 'PX0012345' });
    expect(inactive.status).toBe(409);
    expect(catalogOf(inactive)).toEqual({
      code: 'GUEST_INACTIVE',
      message: SOME_TEXT,
      guestId: GUEST_IDS.pedro,
    });

    const adminDocument = await create({ documentNumber: '40000001' });
    expect(catalogOf(adminDocument)).toEqual({
      code: 'GUEST_DOCUMENT_TAKEN',
      message: SOME_TEXT,
      field: 'documentNumber',
    });

    const guestEmail = await create({ contactEmail: 'MARIA.CCAHUANA@example.com' });
    expect(catalogOf(guestEmail)).toEqual({
      code: 'GUEST_EMAIL_TAKEN',
      message: SOME_TEXT,
      field: 'contactEmail',
    });

    const accountEmail = await create({ contactEmail: 'ana.torres@example.com' });
    expect(catalogOf(accountEmail)).toEqual({
      code: 'ACCOUNT_EMAIL_TAKEN',
      message: SOME_TEXT,
      field: 'contactEmail',
    });
  });

  it('checks every field as GuestInput does', async () => {
    const mock = await admin();
    const fieldOf = async (body: object) => {
      const error = await mock.fail(
        mock.send('POST', '/bff/admin/guests', { ...NEW_GUEST, ...body }),
      );
      return [error.status, catalogOf(error)['field']];
    };
    expect(await fieldOf({ documentNumber: '1234567' })).toEqual([400, 'documentNumber']);
    expect(await fieldOf({ documentType: 'CE', documentNumber: 'AB 12' })).toEqual([
      400,
      'documentNumber',
    ]);
    expect(await fieldOf({ phone: '12345' })).toEqual([400, 'phone']);
    expect(await fieldOf({ contactEmail: 'no-es-correo' })).toEqual([400, 'contactEmail']);
    expect(await fieldOf({ type: 'OTRO' })).toEqual([400, 'type']);
    expect(await fieldOf({ accessMode: 'SMS' })).toEqual([400, 'accessMode']);
  });

  it('reactivates an inactive guest without debt and refuses one that owes', async () => {
    const mock = await admin();
    const reactivated = await mock.send<Schemas['NonInactiveGuestSummary']>(
      'POST',
      `/bff/admin/guests/${GUEST_IDS.pedro}/reactivate`,
      null,
    );
    expect(reactivated).toEqual(expect.objectContaining({ id: GUEST_IDS.pedro, status: 'ACTIVE' }));

    const owing = await mock.fail(
      mock.send('POST', `/bff/admin/guests/${GUEST_IDS.owing}/reactivate`, null),
    );
    expect(owing.status).toBe(409);
    const body = owing.error as Schemas['GuestHasPendingDebtError'];
    expect(body.code).toBe('GUEST_HAS_PENDING_DEBT');
    expect(body.periods).toHaveLength(1);
    expect(body.debts).toHaveLength(1);
    const [owed] = body.debts ?? [];
    expect(owed).toEqual(expect.objectContaining({ period: null, amountDue: 650 }));
    expect(typeof owed?.stayId).toBe('string');
    expect(body.periods).toEqual([owed?.stayEndDate?.slice(0, 7)]);
    const still = await mock.get<Schemas['GuestDetail']>(`/bff/admin/guests/${GUEST_IDS.owing}`);
    expect(still.status).toBe('INACTIVE');

    const missing = await mock.fail(mock.send('POST', '/bff/admin/guests/nadie/reactivate', null));
    expect(missing.status).toBe(404);
  });
});
