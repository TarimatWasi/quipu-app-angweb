import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/services/auth.service';
import { environment } from '../../../environments/environment';
import { credentialsInterceptor } from './credentials.interceptor';
import { sessionExpiredInterceptor } from './session-expired.interceptor';

const BFF = environment.bffBaseUrl;

@Component({ selector: 'app-login-stub', template: '' })
class LoginStubComponent {}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', component: LoginStubComponent }]),
      provideHttpClient(withInterceptors([credentialsInterceptor, sessionExpiredInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const auth = TestBed.inject(AuthService);
  const controller = TestBed.inject(HttpTestingController);
  const signIn = async () => {
    const login = firstValueFrom(
      auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' }),
    );
    controller
      .expectOne(`${BFF}/bff/auth/login`)
      .flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });
    await login;
  };
  return {
    auth,
    controller,
    http: TestBed.inject(HttpClient),
    router: TestBed.inject(Router),
    signIn,
  };
}

describe('sessionExpiredInterceptor', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('forgets the session and goes to /login when the BFF answers 401', async () => {
    const { auth, controller, http, router, signIn } = setup();
    await signIn();

    const call = firstValueFrom(http.get(`${BFF}/bff/contracts`));
    controller
      .expectOne(`${BFF}/bff/contracts`)
      .flush({ code: 'AUTH_INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' });

    await expect(call).rejects.toMatchObject({ status: 401 });
    expect(auth.session()).toBeNull();
    await vi.waitFor(() => {
      expect(router.url).toBe('/login');
    });
  });

  it('does not treat a 401 from the login call itself as an expired session', async () => {
    const { auth, controller, http, router, signIn } = setup();
    await signIn();

    const call = firstValueFrom(http.post(`${BFF}/bff/auth/login`, {}));
    controller
      .expectOne(`${BFF}/bff/auth/login`)
      .flush({ code: 'AUTH_INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' });

    await expect(call).rejects.toMatchObject({ status: 401 });
    expect(auth.session()).not.toBeNull();
    expect(router.url).toBe('/');
  });

  it('ignores a 401 from another origin', async () => {
    const { auth, controller, http, router, signIn } = setup();
    await signIn();

    const call = firstValueFrom(http.get('https://example.org/data'));
    controller
      .expectOne('https://example.org/data')
      .flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(call).rejects.toMatchObject({ status: 401 });
    expect(auth.session()).not.toBeNull();
    expect(router.url).toBe('/');
  });

  it.each([403, 500])('keeps the session on a %i from the BFF', async (status) => {
    const { auth, controller, http, router, signIn } = setup();
    await signIn();

    const call = firstValueFrom(http.get(`${BFF}/bff/contracts`));
    controller.expectOne(`${BFF}/bff/contracts`).flush({}, { status, statusText: 'Error' });

    await expect(call).rejects.toMatchObject({ status });
    expect(auth.session()).not.toBeNull();
    expect(router.url).toBe('/');
  });

  it('lets successful responses through untouched', async () => {
    const { controller, http } = setup();

    const call = firstValueFrom(http.get(`${BFF}/bff/contracts`));
    controller.expectOne(`${BFF}/bff/contracts`).flush({ items: [] });

    await expect(call).resolves.toEqual({ items: [] });
  });
});
