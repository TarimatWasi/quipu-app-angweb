import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { routes } from './app.routes';

async function setup() {
  TestBed.configureTestingModule({
    providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
  });
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  const signIn = async (mustChangePassword = false) => {
    const login = firstValueFrom(
      TestBed.inject(AuthService).login({
        documentType: 'DNI',
        documentNumber: '12345678',
        password: 'secret-1',
      }),
    );
    TestBed.inject(HttpTestingController)
      .expectOne((req) => req.url.endsWith('/bff/auth/login'))
      .flush({ role: 'ADMIN', name: 'admin@example.test', mustChangePassword });
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
  return { harness, router, signIn, text, answerNoSession };
}

describe('routes', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('opens the login page at the root', async () => {
    const { harness, router, text } = await setup();

    await harness.navigateByUrl('/');

    expect(router.url).toBe('/login');
    expect(text()).toContain('Iniciar sesión');
  });

  it('sends unknown paths to the login page', async () => {
    const { harness, router } = await setup();

    await harness.navigateByUrl('/does-not-exist');

    expect(router.url).toBe('/login');
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
    const { harness, router, text } = await setup();

    await harness.navigateByUrl('/forgot-password');
    expect(router.url).toBe('/forgot-password');
    expect(text()).toContain('Recuperar contraseña');

    await harness.navigateByUrl('/reset-password');
    expect(router.url).toBe('/reset-password');
    expect(text()).toContain('Este enlace no es válido');
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
    const { harness, text } = await setup();

    await harness.navigateByUrl('/login');
    expect(text()).toContain('¿Olvidaste tu contraseña?');
    expect(text()).not.toContain('Contraseña actualizada');

    await harness.navigateByUrl('/login?updated=1');
    expect(text()).toContain('Contraseña actualizada. Ya puedes iniciar sesión.');
  });
});
