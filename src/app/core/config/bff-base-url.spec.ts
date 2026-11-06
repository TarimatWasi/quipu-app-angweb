import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { sessionExpiredInterceptor } from '@core/interceptors/session-expired.interceptor';
import { AuthService } from '@core/auth/auth.service';
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

  it('rejects a runtime absolute base before sending credentials or a bootstrap request', async () => {
    const { auth, controller } = setup(ABSOLUTE);
    const login = firstValueFrom(
      auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' }),
    );
    await expect(login).rejects.toThrow('CSRF requires same-origin');
    controller.expectNone(() => true);
    expect(auth.session()).toBeNull();
  });

  it('a foreign service error carries no credentials and does not clear the BFF session', async () => {
    const { auth, controller, http } = setup('');
    const login = firstValueFrom(
      auth.login({ documentType: 'DNI', documentNumber: '12345678', password: 'secret-1' }),
    );
    controller.expectOne('/bff/auth/login').flush(ADMIN);
    await login;
    const call = firstValueFrom(http.get('https://foreign.example/bff/contracts'));
    const request = controller.expectOne('https://foreign.example/bff/contracts');
    expect(request.request.withCredentials).toBe(false);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });
    await expect(call).rejects.toMatchObject({ status: 401 });
    expect(auth.session()).toEqual(ADMIN);
    controller.verify();
  });

  it('a 401 from the login call itself is not an expired session, for the same-origin BFF', async () => {
    for (const base of ['']) {
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
