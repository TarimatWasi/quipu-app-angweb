import { Location } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { routes } from './app.routes';

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
  });
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  const signIn = async (
    mustChangePassword = false,
    role: 'ADMIN' | 'GUEST' = 'ADMIN',
    guestType?: 'CONTRACT' | 'TEMPORARY',
  ) => {
    const login = firstValueFrom(
      TestBed.inject(AuthService).login({
        documentType: 'DNI',
        documentNumber: '12345678',
        password: 'secret-1',
      }),
    );
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/bff/auth/login'))
      .flush({ role, name: 'admin@example.test', mustChangePassword, guestType });
    await login;
  };
  const text = () => harness.routeNativeElement?.textContent ?? '';
  // A protected page asks the BFF who the session is (TAR-74): the browser has none.
  const answerNoSession = () =>
    vi.waitFor(() => {
      TestBed.inject(HttpTestingController)
        .expectOne((req) => req.url.endsWith('/bff/auth/me'))
        .flush(
          { code: 'AUTH_NO_SESSION', message: 'x' },
          { status: 401, statusText: 'Unauthorized' },
        );
    });
  // The address bar: «Sin acceso» keeps the one that was asked for (A0.7).
  const address = () => TestBed.inject(Location).path();
  const heading = () => harness.routeNativeElement?.querySelector('h1')?.textContent.trim();
  const action = () => harness.routeNativeElement?.querySelector('main a');
  return { harness, router, signIn, text, answerNoSession, address, heading, action };
}

describe('routes', () => {
  afterEach(() => {
    const http = TestBed.inject(HttpTestingController);
    // The home of the administrator (A1) asks its summary; these tests are about the routes.
    // A page that is gone already cancelled its read (a resource does): only the open ones answer.
    for (const request of http.match((req) => req.url.endsWith('/bff/admin/dashboard'))) {
      if (!request.cancelled) request.error(new ProgressEvent('error'));
    }
    http.verify();
  });

  it('opens the login page at the root', async () => {
    const { harness, router, text, answerNoSession } = await setup();

    // The login asks the BFF whether the browser already has a session (TAR-318).
    const navigation = harness.navigateByUrl('/');
    await answerNoSession();
    await navigation;

    expect(router.url).toBe('/login');
    expect(text()).toContain('Iniciar sesión');
  });

  describe('a page that does not exist (A0.7)', () => {
    it('tells someone without a session, under a bar without menu, and offers the login', async () => {
      const { harness, router, text, answerNoSession, address, heading, action } = await setup();

      const navigation = harness.navigateByUrl('/does-not-exist');
      await answerNoSession();
      await navigation;

      expect(router.url).toBe('/does-not-exist');
      expect(address()).toBe('/does-not-exist');
      expect(heading()).toBe('No encontramos esta página');
      expect(text()).toContain('Quipu');
      expect(text()).not.toContain('Salir');
      expect(harness.routeNativeElement?.querySelector('nav')).toBeNull();
      expect(action()?.textContent.trim()).toBe('Ir a iniciar sesión');
      expect(action()?.getAttribute('href')).toBe('/login');
    });

    it('shows it inside the bar of the administrator, with no section marked', async () => {
      const { harness, router, signIn, text, heading, action } = await setup();
      await signIn();

      await harness.navigateByUrl('/admin/does-not-exist');

      expect(router.url).toBe('/admin/does-not-exist');
      expect(heading()).toBe('No encontramos esta página');
      expect(text()).toContain('Pagos');
      expect(text()).toContain('Tu cuenta: admin@example.test');
      expect(harness.routeNativeElement?.querySelector('[aria-current="page"]')).toBeNull();
      expect(action()?.textContent.trim()).toBe('Ir al inicio');
      expect(action()?.getAttribute('href')).toBe('/home');
    });

    it('marks no section even under the path of one', async () => {
      const { harness, router, signIn, heading } = await setup();
      await signIn();

      await harness.navigateByUrl('/admin/payments/pay_1/does-not-exist');

      expect(router.url).toBe('/admin/payments/pay_1/does-not-exist');
      expect(heading()).toBe('No encontramos esta página');
      expect(harness.routeNativeElement?.querySelector('[aria-current="page"]')).toBeNull();
      expect(harness.routeNativeElement?.querySelector('.is-current')).toBeNull();
    });

    it('offers a guest its account statement', async () => {
      const { harness, signIn, heading, action } = await setup();
      await signIn(false, 'GUEST', 'CONTRACT');

      await harness.navigateByUrl('/does-not-exist');

      expect(heading()).toBe('No encontramos esta página');
      expect(action()?.textContent.trim()).toBe('Ir a mi estado de cuenta');
      expect(action()?.getAttribute('href')).toBe('/home');
    });
  });

  it('keeps /home behind the login', async () => {
    const { harness, router, answerNoSession } = await setup();

    const navigation = harness.navigateByUrl('/home');
    await answerNoSession();
    await navigation;

    expect(router.url).toBe('/login');
  });

  it('opens /home once the user is signed in', async () => {
    const { harness, router, signIn, text } = await setup();
    await signIn();

    await harness.navigateByUrl('/home');

    expect(router.url).toBe('/home');
    expect(text()).toContain('admin@example.test');
  });

  it('takes a user who is already signed in from /login to /home', async () => {
    const { harness, router, signIn } = await setup();
    await signIn();

    await harness.navigateByUrl('/login');

    expect(router.url).toBe('/home');
  });

  it('takes to /home a session that a reload restores when /login is typed in the address bar (TAR-318)', async () => {
    const { harness, router } = await setup();

    const navigation = harness.navigateByUrl('/login');
    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController)
        .expectOne((req) => req.url.endsWith('/bff/auth/me'))
        .flush({ role: 'ADMIN', name: 'admin@example.test', mustChangePassword: false });
    });
    await navigation;

    expect(router.url).toBe('/home');
  });

  // RF-12: the change cannot be skipped from the client either (the BFF enforces it too).
  it('sends a session that must change its password from /home to /change-password', async () => {
    const { harness, router, signIn, text } = await setup();
    await signIn(true);

    await harness.navigateByUrl('/home');

    expect(router.url).toBe('/change-password');
    expect(text()).toContain('Cambia tu contraseña');
  });

  it('keeps a session that must change its password away from /login', async () => {
    const { harness, router, signIn } = await setup();
    await signIn(true);

    await harness.navigateByUrl('/login');

    expect(router.url).toBe('/change-password');
  });

  it('opens /change-password only for a session that must change its password', async () => {
    const { harness, router, signIn } = await setup();
    await signIn(false);

    await harness.navigateByUrl('/change-password');

    expect(router.url).toBe('/home');
  });

  it('keeps /change-password behind the login', async () => {
    const { harness, router, answerNoSession } = await setup();

    const navigation = harness.navigateByUrl('/change-password');
    await answerNoSession();
    await navigation;

    expect(router.url).toBe('/login');
  });

  it('opens the recovery pages without a session', async () => {
    const { harness, router, text, answerNoSession } = await setup();

    const navigation = harness.navigateByUrl('/forgot-password');
    await answerNoSession();
    await navigation;
    expect(router.url).toBe('/forgot-password');
    expect(text()).toContain('Recuperar contraseña');

    await harness.navigateByUrl('/reset-password');
    expect(router.url).toBe('/reset-password');
    expect(text()).toContain('Este enlace no es válido');
  });

  it('opens the activation of an access (A0.4) without a session and cleans the token', async () => {
    const { harness, router, text } = await setup();

    await harness.navigateByUrl('/activate#token=abc-DEF_123');

    await vi.waitFor(() => {
      expect(router.url).toBe('/activate');
    });
    expect(text()).toContain('Activa tu cuenta');
  });

  it('opens the activation of an administrator (A0.5) without a session and cleans the code', async () => {
    const { harness, router, text } = await setup();

    await harness.navigateByUrl('/activate-admin?code=abc-DEF_123');

    await vi.waitFor(() => {
      expect(router.url).toBe('/activate-admin');
    });
    expect(text()).toContain('Activa tu cuenta de administrador');
  });

  it('keeps a signed-in user away from the request page but not from the emailed link', async () => {
    const { harness, router, signIn } = await setup();
    await signIn();

    await harness.navigateByUrl('/forgot-password');
    expect(router.url).toBe('/home');

    await harness.navigateByUrl('/reset-password?code=abc-DEF_123');
    await vi.waitFor(() => {
      expect(router.url).toBe('/reset-password');
    });
  });

  it('takes the code out of the address bar once the reset page has read it', async () => {
    const { harness, router, text } = await setup();

    await harness.navigateByUrl('/reset-password?code=abc-DEF_123');

    await vi.waitFor(() => {
      expect(router.url).toBe('/reset-password');
    });
    expect(text()).toContain('Elige una contraseña nueva');
  });

  it('offers the recovery link on the login page and confirms an updated password', async () => {
    const { harness, text, answerNoSession } = await setup();

    const navigation = harness.navigateByUrl('/login');
    await answerNoSession();
    await navigation;
    expect(text()).toContain('¿Olvidaste tu contraseña?');
    expect(text()).not.toContain('Contraseña actualizada');

    await harness.navigateByUrl('/login?updated=1');
    expect(text()).toContain('Contraseña actualizada. Ya puedes iniciar sesión.');
  });

  it('opens the payments of the administrator (A5) and asks its queue', async () => {
    const { harness, router, signIn } = await setup();
    await signIn();

    await harness.navigateByUrl('/admin/payments');

    expect(router.url).toBe('/admin/payments');
    await vi.waitFor(() => {
      const http = TestBed.inject(HttpTestingController);
      http
        .expectOne((req) => req.url.endsWith('/bff/admin/dashboard'))
        .flush({
          pendingVouchers: [],
          pendingVouchersTotal: 0,
          rejected: { count: 0, oldest: null },
        });
      http
        .expectOne((req) => req.url.endsWith('/bff/admin/payments'))
        .flush({ content: [], nextCursor: null });
    });
  });

  it('shows «Sin acceso» to a guest who opens the payments of the administrator, at its address', async () => {
    const { harness, signIn, text, address, heading, action } = await setup();
    await signIn(false, 'GUEST', 'CONTRACT');

    await harness.navigateByUrl('/admin/payments/pay_1');

    expect(address()).toBe('/admin/payments/pay_1');
    expect(heading()).toBe('Esta página no es para tu cuenta');
    expect(text()).toContain('Sin acceso');
    expect(action()?.getAttribute('href')).toBe('/home');
    expect(harness.routeNativeElement?.querySelector('[aria-current="page"]')).toBeNull();
    TestBed.inject(HttpTestingController).expectNone((req) => req.url.includes('/admin/'));
  });

  it('opens the detail of a guest (A3.2) for the administrator and asks it', async () => {
    const { harness, router, signIn } = await setup();
    await signIn();

    await harness.navigateByUrl('/admin/guests/g1');

    expect(router.url).toBe('/admin/guests/g1');
    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController)
        .expectOne((req) => req.url.endsWith('/bff/admin/guests/g1'))
        .flush({ code: 'GUEST_NOT_FOUND', message: 'x' }, { status: 404, statusText: 'x' });
    });
  });

  it('shows «Sin acceso» to a temporary guest who opens the guests of the administrator', async () => {
    const { harness, signIn, address, heading, text, action } = await setup();
    await signIn(false, 'GUEST', 'TEMPORARY');

    await harness.navigateByUrl('/admin/guests/g1/stays/new');

    expect(address()).toBe('/admin/guests/g1/stays/new');
    expect(heading()).toBe('Esta página no es para tu cuenta');
    expect(text()).toContain('Desde tu cuenta puedes ver tu estado de pago y tus datos.');
    expect(text()).not.toContain('contrato');
    expect(action()?.textContent.trim()).toBe('Ir a mi estado de pago');
    TestBed.inject(HttpTestingController).expectNone((req) => req.url.includes('/admin/'));
  });

  it('opens the administrators (A7) for the administrator and asks their list', async () => {
    const { harness, router, signIn, heading } = await setup();
    await signIn();

    await harness.navigateByUrl('/admin/administrators');

    expect(router.url).toBe('/admin/administrators');
    expect(heading()).toBe('Administradores');
    await vi.waitFor(() => {
      TestBed.inject(HttpTestingController)
        .expectOne((req) => req.method === 'GET' && req.url.endsWith('/bff/admin/administrators'))
        .flush([]);
    });
  });

  it('shows «Sin acceso» to a guest who opens the administrators, without asking them', async () => {
    const { harness, signIn, address, heading } = await setup();
    await signIn(false, 'GUEST', 'CONTRACT');

    await harness.navigateByUrl('/admin/administrators');

    expect(address()).toBe('/admin/administrators');
    expect(heading()).toBe('Esta página no es para tu cuenta');
    TestBed.inject(HttpTestingController).expectNone((req) => req.url.includes('/admin/'));
  });

  it('keeps the administrators behind the login', async () => {
    const { harness, router, answerNoSession } = await setup();

    const navigation = harness.navigateByUrl('/admin/administrators');
    await answerNoSession();
    await navigation;

    expect(router.url).toBe('/login');
  });

  it('keeps the payments behind the login', async () => {
    const { harness, router, answerNoSession } = await setup();

    const navigation = harness.navigateByUrl('/admin/payments');
    await answerNoSession();
    await navigation;

    expect(router.url).toBe('/login');
  });

  describe('pages of the guests (H3, H4, T2)', () => {
    const answer = (path: string, body: object) =>
      vi.waitFor(() => {
        TestBed.inject(HttpTestingController)
          .expectOne((req) => req.url.endsWith(path))
          .flush(body);
      });

    it('opens the history and the payment of a guest with a contract', async () => {
      const { harness, router, signIn } = await setup();
      await signIn(false, 'GUEST', 'CONTRACT');

      await harness.navigateByUrl('/guest/payments');
      expect(router.url).toBe('/guest/payments');
      await answer('/bff/guest/payments', { content: [], nextCursor: null, creditBalance: 0 });

      await harness.navigateByUrl('/guest/payments/new');
      expect(router.url).toBe('/guest/payments/new');
      await answer('/bff/guest/account-status', []);
    });

    it('shows «Sin acceso» to a guest with a contract who opens T2', async () => {
      const { harness, signIn, address, heading } = await setup();
      await signIn(false, 'GUEST', 'CONTRACT');

      await harness.navigateByUrl('/temporary-guest/payment');

      expect(address()).toBe('/temporary-guest/payment');
      expect(heading()).toBe('Esta página no es para tu cuenta');
      TestBed.inject(HttpTestingController).expectNone((req) => req.url.includes('/bff/'));
    });

    it('opens T2 for a temporary guest and keeps it away from H3 and H4', async () => {
      const { harness, router, signIn, address, heading } = await setup();
      await signIn(false, 'GUEST', 'TEMPORARY');

      await harness.navigateByUrl('/temporary-guest/payment');
      expect(router.url).toBe('/temporary-guest/payment');
      await answer('/bff/temporary-guest/payment-status', { status: 'PAID' });

      await harness.navigateByUrl('/guest/payments/new');
      expect(address()).toBe('/guest/payments/new');
      expect(heading()).toBe('Esta página no es para tu cuenta');
    });

    it('shows the page of my-account inside the home of dashboard, at /home', async () => {
      const { harness, router, signIn, text } = await setup();
      await signIn(false, 'GUEST', 'TEMPORARY');

      await harness.navigateByUrl('/home');
      await answer('/bff/temporary-guest/payment-status', {
        stayId: 's1',
        startDate: '2026-10-20',
        endDate: '2026-10-31',
        status: 'UNPAID',
        agreedAmount: 400,
        paymentId: null,
        rejectionReason: null,
        surplus: null,
      });

      expect(router.url).toBe('/home');
      await vi.waitFor(() => {
        harness.detectChanges();
        expect(text()).toContain('Estado de pago');
        expect(text()).toContain('Subir voucher');
      });
    });

    it('shows «Sin acceso» to the administrator who opens a guest page', async () => {
      const { harness, signIn, address, heading, action } = await setup();
      await signIn();

      await harness.navigateByUrl('/guest/payments');
      expect(address()).toBe('/guest/payments');
      expect(heading()).toBe('Esta página no es para tu cuenta');
      expect(action()?.textContent.trim()).toBe('Ir al inicio');

      await harness.navigateByUrl('/temporary-guest/payment/pay_1');
      expect(address()).toBe('/temporary-guest/payment/pay_1');
      expect(heading()).toBe('Esta página no es para tu cuenta');
    });

    it('keeps sending someone without a session from a guest page to the login', async () => {
      const { harness, router, answerNoSession } = await setup();

      const navigation = harness.navigateByUrl('/guest/payments');
      await answerNoSession();
      await navigation;

      expect(router.url).toBe('/login');
    });
  });
});
