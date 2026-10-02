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
  return { harness, router, signIn, text };
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
    const { harness, router } = await setup();

    await harness.navigateByUrl('/home');

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
    const { harness, router } = await setup();

    await harness.navigateByUrl('/change-password');

    expect(router.url).toBe('/login');
  });
});
