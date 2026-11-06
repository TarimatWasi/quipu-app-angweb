import { TestBed } from '@angular/core/testing';
import { MOCK_BUNDLE_MARKER, MOCK_HEADER, MOCK_LATENCY, MockBff } from './mock-bff';
import { bffPath } from './mock-bff.interceptor';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from './mock-bff.testing';
import { readMockSetting } from './mock-storage';

describe('bffPath', () => {
  it('keeps only calls to /bff/*, without query or fragment', () => {
    expect(bffPath('/bff/admin/payments?status=PENDING', '')).toBe('/bff/admin/payments');
    expect(bffPath('/bff/auth/me#x', '')).toBe('/bff/auth/me');
    expect(bffPath('/assets/logo.svg', '')).toBeNull();
    expect(bffPath('/bffx/admin', '')).toBeNull();
    expect(bffPath('/bff', '')).toBeNull();
    expect(bffPath('https://other.example/bff/auth/me', '')).toBeNull();
  });

  it('strips an absolute base URL of the BFF', () => {
    const base = 'https://bff.example';
    expect(bffPath(`${base}/bff/guest/credit`, base)).toBe('/bff/guest/credit');
    expect(bffPath('https://other.example/bff/guest/credit', base)).toBeNull();
  });
});

describe('mockBffInterceptor', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('lets any URL outside /bff go to the network untouched', async () => {
    const mock = setUpMockBff();
    const answer = mock.get<{ ok: boolean }>('/assets/config.json');
    mock.backend.expectOne('/assets/config.json').flush({ ok: true });
    expect(await answer).toEqual({ ok: true });
    const other = mock.get<{ ok: boolean }>('https://other.example/bff/auth/me');
    mock.backend.expectOne('https://other.example/bff/auth/me').flush({ ok: false });
    expect(await other).toEqual({ ok: false });
    mock.backend.verify();
  });

  it('answers /bff/* in memory, never through the network, with the marker header', async () => {
    const mock = setUpMockBff();
    const response = await new Promise<{ headers: { get(name: string): string | null } }>(
      (resolve, reject) => {
        mock.http
          .post(
            '/bff/auth/login',
            { documentType: 'DNI', documentNumber: '40000001', password: 'Quipu2026' },
            { observe: 'response' },
          )
          .subscribe({ next: resolve, error: reject });
      },
    );
    expect(response.headers.get(MOCK_HEADER)).toBe(MOCK_BUNDLE_MARKER);
    mock.backend.verify();
  });

  it('answers a route the mock does not simulate with a 404 of the catalog', async () => {
    const mock = setUpMockBff();
    const error = await mock.fail(mock.get('/bff/admin/finance'));
    expect(error.status).toBe(404);
    expect(catalogOf(error)).toEqual({ code: 'RESOURCE_NOT_FOUND', message: SOME_TEXT });
  });

  it('waits the configured delay, longer in «Servidor lento»', () => {
    TestBed.configureTestingModule({
      providers: [{ provide: MOCK_LATENCY, useValue: { normalMs: 120, slowMs: 9_500 } }],
    });
    const bff = TestBed.inject(MockBff);
    expect(bff.latencyMs()).toBe(120);
    bff.setScenario('slow');
    expect(bff.latencyMs()).toBe(9_500);
    expect(readMockSetting('quipu-mock:scenario')).toBe('slow');
  });
});

describe('simulated session', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it.each([
    ['admin', { role: 'ADMIN', name: 'Rosa Elvira Quispe Mamani', mustChangePassword: false }],
    [
      'contract-guest',
      {
        role: 'GUEST',
        guestType: 'CONTRACT',
        name: 'Luis Alberto Huamán Ccori',
        mustChangePassword: false,
        guestStatus: 'ACTIVE',
      },
    ],
    [
      'temporary-guest',
      {
        role: 'GUEST',
        guestType: 'TEMPORARY',
        name: 'Ana Lucía Torres Vela',
        mustChangePassword: false,
        guestStatus: 'ACTIVE',
      },
    ],
  ] as const)('signs in %s and /me answers the same session', async (key, session) => {
    const mock = setUpMockBff();
    expect(await mock.signIn(key)).toEqual(session);
    expect(await mock.get('/bff/auth/me')).toEqual(session);
  });

  it('rejects a wrong password with AUTH_INVALID_CREDENTIALS and opens no session', async () => {
    const mock = setUpMockBff();
    const error = await mock.fail(
      mock.send('POST', '/bff/auth/login', {
        documentType: 'DNI',
        documentNumber: '40000001',
        password: 'otra-clave',
      }),
    );
    expect(error.status).toBe(401);
    expect(error.error).toEqual({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'Documento o contraseña incorrectos',
    });
    expect((await mock.fail(mock.get('/bff/auth/me'))).status).toBe(401);
  });

  it('answers AUTH_TEMPORARY_PASSWORD_EXPIRED for the expired temporary password, only on its account', async () => {
    const mock = setUpMockBff();
    const login = (documentNumber: string) =>
      mock.fail(
        mock.send('POST', '/bff/auth/login', {
          documentType: 'DNI',
          documentNumber,
          password: 'Vencida2026',
        }),
      );

    const expired = await login('70000003');
    expect(expired.status).toBe(401);
    expect(catalogOf(expired)).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_TEMPORARY_PASSWORD_EXPIRED',
    });
    expect(catalogOf(await login('40000001'))).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_INVALID_CREDENTIALS',
    });
    expect((await mock.fail(mock.get('/bff/auth/me'))).status).toBe(401);
  });

  it('activates an access (A0.4) and starts the session, and rejects the token «vencido»', async () => {
    const mock = setUpMockBff();
    const expired = await mock.fail(
      mock.send('POST', '/bff/auth/activate', { token: 'vencido', newPassword: 'nueva-clave-1' }),
    );
    expect(catalogOf(expired)).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_INVALID_OR_EXPIRED_CODE',
    });
    const weak = await mock.fail(
      mock.send('POST', '/bff/auth/activate', { token: 'demo', newPassword: 'corta' }),
    );
    expect(catalogOf(weak)).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_WEAK_PASSWORD',
      field: 'newPassword',
    });
    expect((await mock.fail(mock.get('/bff/auth/me'))).status).toBe(401);

    const session = await mock.send('POST', '/bff/auth/activate', {
      token: 'demo',
      newPassword: 'nueva-clave-1',
    });
    expect(session).toMatchObject({ role: 'GUEST', guestType: 'CONTRACT' });
    expect(await mock.get('/bff/auth/me')).toEqual(session);
  });

  it('reports a missing login field as VALIDATION_ERROR with its field', async () => {
    const mock = setUpMockBff();
    const error = await mock.fail(mock.send('POST', '/bff/auth/login', { documentType: 'DNI' }));
    expect(error.status).toBe(400);
    expect(catalogOf(error)).toEqual({
      message: SOME_TEXT,
      code: 'VALIDATION_ERROR',
      field: 'documentNumber',
    });
  });

  it('closes the session on logout', async () => {
    const mock = setUpMockBff();
    await mock.signIn('admin');
    expect(await mock.send('POST', '/bff/auth/logout', null)).toBeNull();
    const error = await mock.fail(mock.get('/bff/auth/me'));
    expect(catalogOf(error)).toEqual({ message: SOME_TEXT, code: 'AUTH_NO_SESSION' });
    expect((await mock.fail(mock.send('POST', '/bff/auth/logout', null))).status).toBe(401);
  });

  it('keeps each role in its own area: 401 without session, 403 with another role', async () => {
    const mock = setUpMockBff();
    expect((await mock.fail(mock.get('/bff/admin/payments'))).status).toBe(401);
    await mock.signIn('contract-guest');
    const forbidden = await mock.fail(mock.get('/bff/admin/payments'));
    expect(forbidden.status).toBe(403);
    expect(catalogOf(forbidden)).toEqual({ message: SOME_TEXT, code: 'AUTH_FORBIDDEN' });
    expect((await mock.fail(mock.get('/bff/temporary-guest/payment-status'))).status).toBe(403);
  });

  it('forces the change of a temporary password before anything else (RF-12)', async () => {
    const mock = setUpMockBff();
    expect(await mock.signIn('temporary-password')).toEqual(
      expect.objectContaining({ mustChangePassword: true }),
    );
    const blocked = await mock.fail(mock.get('/bff/guest/account-status'));
    expect(blocked.status).toBe(403);
    expect(catalogOf(blocked)).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_PASSWORD_CHANGE_REQUIRED',
    });
    const weak = await mock.fail(
      mock.send('POST', '/bff/auth/change-password', { newPassword: 'corta' }),
    );
    expect(catalogOf(weak)).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_WEAK_PASSWORD',
      field: 'newPassword',
    });
    const same = await mock.fail(
      mock.send('POST', '/bff/auth/change-password', { newPassword: 'Quipu2026' }),
    );
    expect(catalogOf(same)).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_PASSWORD_UNCHANGED',
      field: 'newPassword',
    });
    expect(
      await mock.send('POST', '/bff/auth/change-password', { newPassword: 'nueva-clave-1' }),
    ).toBeNull();
    expect(await mock.get('/bff/auth/me')).toEqual(
      expect.objectContaining({ mustChangePassword: false }),
    );
    expect(await mock.get<unknown[]>('/bff/guest/account-status')).not.toHaveLength(0);
  });

  it('accepts the password recovery, and rejects the code «vencido»', async () => {
    const mock = setUpMockBff();
    expect(
      await mock.send('POST', '/bff/auth/forgot-password', { email: 'luis.huaman@example.com' }),
    ).toBeNull();
    expect(
      catalogOf(
        await mock.fail(mock.send('POST', '/bff/auth/forgot-password', { email: 'sin-arroba' })),
      ),
    ).toEqual({
      message: SOME_TEXT,
      code: 'VALIDATION_ERROR',
      field: 'email',
    });
    expect(
      await mock.send('POST', '/bff/auth/reset-password', {
        code: 'abc123',
        newPassword: 'nueva-clave-1',
      }),
    ).toBeNull();
    const expired = await mock.fail(
      mock.send('POST', '/bff/auth/reset-password', {
        code: 'vencido',
        newPassword: 'nueva-clave-1',
      }),
    );
    expect(catalogOf(expired)).toEqual({
      message: SOME_TEXT,
      code: 'AUTH_INVALID_OR_EXPIRED_CODE',
    });
    // A0.5: the link of an administrator without a name needs one.
    const noName = await mock.fail(
      mock.send('POST', '/bff/auth/reset-password', {
        code: 'admin-nuevo',
        newPassword: 'nueva-clave-1',
        name: '   ',
      }),
    );
    expect(catalogOf(noName)).toEqual({
      message: SOME_TEXT,
      code: 'VALIDATION_ERROR',
      field: 'name',
    });
    expect(
      await mock.send('POST', '/bff/auth/reset-password', {
        code: 'admin-nuevo',
        newPassword: 'nueva-clave-1',
        name: 'Carmen Rojas',
      }),
    ).toBeNull();
  });

  it('keeps the role across a reload of the page (a new MockBff)', async () => {
    const mock = setUpMockBff();
    await mock.signIn('temporary-guest');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [] });
    expect(TestBed.inject(MockBff).user()?.key).toBe('temporary-guest');
  });
});

describe('scenarios', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('«Error de carga» fails every read with the shape of the catalog, but not the session', async () => {
    const mock = setUpMockBff('load-error');
    await mock.signIn('admin');
    const error = await mock.fail(mock.get('/bff/admin/payments', { status: 'PENDING' }));
    expect(error.status).toBe(500);
    expect(error.error).toEqual({
      code: 'UNEXPECTED_ERROR',
      message: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    });
    expect(await mock.get('/bff/auth/me')).toEqual(expect.objectContaining({ role: 'ADMIN' }));
  });

  it('«Vacío» answers empty lists', async () => {
    const mock = setUpMockBff('empty');
    await mock.signIn('admin');
    expect(await mock.get('/bff/admin/payments', { status: 'PENDING' })).toEqual({
      content: [],
      nextCursor: null,
    });
    await mock.signIn('contract-guest');
    expect(await mock.get('/bff/guest/account-status')).toEqual([]);
    await mock.signIn('temporary-guest');
    expect((await mock.fail(mock.get('/bff/temporary-guest/payment-status'))).status).toBe(404);
  });
});

describe('simulated session without browser storage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetMockSettings();
  });

  it('keeps the session in memory while the page is open', async () => {
    const mock = setUpMockBff();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    await mock.signIn('contract-guest');
    expect(await mock.get('/bff/auth/me')).toEqual(expect.objectContaining({ role: 'GUEST' }));
    expect(await mock.get<unknown[]>('/bff/guest/account-status')).not.toHaveLength(0);
    await mock.send('POST', '/bff/auth/logout', null);
    expect((await mock.fail(mock.get('/bff/auth/me'))).status).toBe(401);
  });
});
