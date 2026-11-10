import { DEMO_CLAVE } from '../data/demo-users';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';

const CHANGE = '/bff/auth/change-password';

describe('change of password from the account menu in the simulated BFF (A0.6)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('rejects a missing or wrong current password with 403 on currentPassword', async () => {
    const mock = setUpMockBff();
    await mock.signIn('admin');

    for (const body of [
      { newPassword: 'nueva-clave-1' },
      { currentPassword: 'otra-clave-1', newPassword: 'nueva-clave-1' },
    ]) {
      const wrong = await mock.fail(mock.send('POST', CHANGE, body));
      expect(wrong.status).toBe(403);
      expect(catalogOf(wrong)).toEqual({
        message: SOME_TEXT,
        code: 'AUTH_INVALID_CREDENTIALS',
        field: 'currentPassword',
      });
    }
  });

  it('rejects a short password and the current one, both on newPassword', async () => {
    const mock = setUpMockBff();
    await mock.signIn('contract-guest');

    const weak = await mock.fail(
      mock.send('POST', CHANGE, { currentPassword: DEMO_CLAVE, newPassword: 'corta' }),
    );
    expect(weak.status).toBe(400);
    expect(catalogOf(weak)).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_WEAK_PASSWORD',
      field: 'newPassword',
    });
    const same = await mock.fail(
      mock.send('POST', CHANGE, { currentPassword: DEMO_CLAVE, newPassword: DEMO_CLAVE }),
    );
    expect(same.status).toBe(400);
    expect(catalogOf(same)).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_PASSWORD_UNCHANGED',
      field: 'newPassword',
    });
  });

  it('changes it with the right current password and keeps the session', async () => {
    const mock = setUpMockBff();
    await mock.signIn('admin');

    expect(
      await mock.send('POST', CHANGE, {
        currentPassword: DEMO_CLAVE,
        newPassword: 'nueva-clave-1',
      }),
    ).toBeNull();
    expect(await mock.get('/bff/auth/me')).toEqual(
      expect.objectContaining({ role: 'ADMIN', mustChangePassword: false }),
    );
  });

  it('keeps A0.1 without the current password while the change is pending', async () => {
    const mock = setUpMockBff();
    await mock.signIn('temporary-password');

    expect(await mock.send('POST', CHANGE, { newPassword: 'nueva-clave-1' })).toBeNull();
  });

  it('answers 401 without a session', async () => {
    const mock = setUpMockBff();

    const none = await mock.fail(
      mock.send('POST', CHANGE, { currentPassword: DEMO_CLAVE, newPassword: 'nueva-clave-1' }),
    );
    expect(none.status).toBe(401);
  });
});

describe('the refresh of the session in the simulated BFF (TAR-228, TAR-364)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  const ME = '/bff/auth/me';
  const REFRESH = '/bff/auth/refresh';

  it('answers 401 to every call with an expired access until the refresh renews it', async () => {
    const mock = setUpMockBff();
    await mock.signIn('admin');
    mock.bff.expire('access-expired');

    expect((await mock.fail(mock.get(ME))).status).toBe(401);
    expect((await mock.fail(mock.get('/bff/admin/guests'))).status).toBe(401);
    expect(await mock.send('POST', REFRESH, null)).toBeNull();

    expect(mock.bff.sessionState()).toBe('live');
    expect(await mock.get(ME)).toEqual(expect.objectContaining({ role: 'ADMIN' }));
  });

  it('refuses the refresh of an expired session and closes it', async () => {
    const mock = setUpMockBff();
    await mock.signIn('contract-guest');
    mock.bff.expire('expired');

    const refused = await mock.fail(mock.send('POST', REFRESH, null));

    expect(refused.status).toBe(401);
    expect(catalogOf(refused)).toEqual({ message: SOME_TEXT, code: 'AUTH_NO_SESSION' });
    expect(mock.bff.user()).toBeNull();
    // A new sign-in starts a live session.
    await mock.signIn('contract-guest');
    expect(mock.bff.sessionState()).toBe('live');
  });

  it('refuses the refresh without a session, and expiring nothing does nothing', async () => {
    const mock = setUpMockBff();
    mock.bff.expire('access-expired');

    expect(mock.bff.sessionState()).toBe('live');
    expect((await mock.fail(mock.send('POST', REFRESH, null))).status).toBe(401);
  });

  it('still lets an expired session sign in again or log out', async () => {
    const mock = setUpMockBff();
    await mock.signIn('admin');
    mock.bff.expire('expired');

    expect(await mock.send('POST', '/bff/auth/logout', null)).toBeNull();
    expect(mock.bff.user()).toBeNull();
    await mock.signIn('admin');
    expect(await mock.get(ME)).toEqual(expect.objectContaining({ role: 'ADMIN' }));
  });
});
