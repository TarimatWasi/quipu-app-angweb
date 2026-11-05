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
