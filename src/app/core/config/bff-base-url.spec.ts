import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { sessionExpiredInterceptor } from '@core/interceptors/session-expired.interceptor';
import { AuthService } from '@core/services/auth.service';
import { BFF_BASE_URL } from './bff-base-url';

const ABSOLUTE = 'https://api.example.org';
const ADMIN = { role: 'ADMIN', name: 'a', mustChangePassword: false };

@Component({ selector: 'app-login-stub', template: '' })
class LoginStubComponent {}

function setup(base: string) {
  TestBed.configureTestingModule({
    providers: [
      { provide: BFF_BASE_URL, useValue: base },
      provideRouter([{ path: 'login', component: LoginStubComponent }]),
      provideHttpClient(withInterceptors([credentialsInterceptor, sessionExpiredInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return {
    auth: TestBed.inject(AuthService),
    controller: TestBed.inject(HttpTestingController),
    http: TestBed.inject(HttpClient),
    router: TestBed.inject(Router),
  };
}

describe('BFF_BASE_URL is the single source of the BFF address', () => {
  it('defaults to same-origin (empty) from the generated environment', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(BFF_BASE_URL)).toBe('');
  });

  it('AuthService, the credentials interceptor and the session interceptor all follow an override', async () => {
    const { auth, controller, http, router } = setup(ABSOLUTE);

    // AuthService builds the login URL from the token, and the credentials interceptor flags it.
    const login = firstValueFrom(
      auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' }),
    );
    const loginReq = controller.expectOne(`${ABSOLUTE}/bff/auth/login`);
    expect(loginReq.request.withCredentials).toBe(true);
    loginReq.flush(ADMIN);
    await login;

    // The session interceptor treats a 401 from that BFF as an expired session...
    const call = firstValueFrom(http.get(`${ABSOLUTE}/bff/contracts`));
    controller
      .expectOne(`${ABSOLUTE}/bff/contracts`)
      .flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(call).rejects.toMatchObject({ status: 401 });
    expect(auth.session()).toBeNull();
    await vi.waitFor(() => {
      expect(router.url).toBe('/login');
    });
    controller.verify();
  });

  it('with an absolute base, a relative /bff path is not the BFF and a 401 there is ignored', async () => {
    const { auth, controller, http } = setup(ABSOLUTE);
    const login = firstValueFrom(
      auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' }),
    );
    controller.expectOne(`${ABSOLUTE}/bff/auth/login`).flush(ADMIN);
    await login;

    const call = firstValueFrom(http.get('/bff/contracts'));
    controller.expectOne('/bff/contracts').flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(call).rejects.toMatchObject({ status: 401 });
    expect(auth.session()).not.toBeNull();
    controller.verify();
  });

  it('a 401 from the login call itself is not an expired session, for any base', async () => {
    for (const base of ['', ABSOLUTE]) {
      TestBed.resetTestingModule();
      const { auth, controller } = setup(base);
      const login = firstValueFrom(
        auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'bad' }),
      );
      controller
        .expectOne(`${base}/bff/auth/login`)
        .flush({ code: 'AUTH_INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' });
      await expect(login).rejects.toMatchObject({ status: 401 });
      controller.verify();
    }
  });
});
