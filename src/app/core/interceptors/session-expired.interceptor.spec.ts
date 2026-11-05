import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { environment } from '../../../environments/environment';
import { credentialsInterceptor } from './credentials.interceptor';
import { sessionExpiredInterceptor } from './session-expired.interceptor';

const BFF = environment.bffBaseUrl;

@Component({ selector: 'app-login-stub', template: '' })
class LoginStubComponent {}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'login', component: LoginStubComponent },
        { path: 'contracts', component: LoginStubComponent },
      ]),
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

  /** Answers the next call to /bff/contracts with a 401, as the BFF does once the cookie expired. */
  const expireOn = async (
    controller: HttpTestingController,
    call: Promise<unknown>,
  ): Promise<void> => {
    controller
      .expectOne(`${BFF}/bff/contracts`)
      .flush({ code: 'AUTH_INVALID_CREDENTIALS' }, { status: 401, statusText: 'Unauthorized' });
    await expect(call).rejects.toMatchObject({ status: 401 });
  };

  it('with a session in the tab: forgets it and goes to /login saying it expired and where the person was', async () => {
    const { auth, controller, http, router, signIn } = setup();
    await signIn();
    await router.navigateByUrl('/contracts?page=2');

    const call = firstValueFrom(http.get(`${BFF}/bff/contracts`));
    await expireOn(controller, call);

    expect(auth.session()).toBeNull();
    await vi.waitFor(() => {
      expect(router.url.split('?')[0]).toBe('/login');
    });
    const { queryParams } = router.parseUrl(router.url);
    expect(queryParams).toEqual({ expired: '1', returnUrl: '/contracts?page=2' });
  });

  it('keeps the notice and the way back when several calls answer 401 at once', async () => {
    const { auth, controller, http, router, signIn } = setup();
    await signIn();
    await router.navigateByUrl('/contracts?page=2');

    const first = firstValueFrom(http.get(`${BFF}/bff/contracts`));
    const second = firstValueFrom(http.get(`${BFF}/bff/contracts`, { params: { page: '2' } }));
    for (const request of controller.match((req) => req.url === `${BFF}/bff/contracts`)) {
      request.flush({}, { status: 401, statusText: 'Unauthorized' });
    }
    await expect(first).rejects.toMatchObject({ status: 401 });
    await expect(second).rejects.toMatchObject({ status: 401 });

    expect(auth.session()).toBeNull();
    await vi.waitFor(() => {
      expect(router.url.split('?')[0]).toBe('/login');
    });
    expect(router.parseUrl(router.url).queryParams).toEqual({
      expired: '1',
      returnUrl: '/contracts?page=2',
    });
  });

  it('without a session in the tab: goes to the plain /login, with no notice', async () => {
    const { auth, controller, http, router } = setup();
    await router.navigateByUrl('/contracts');

    const call = firstValueFrom(http.get(`${BFF}/bff/contracts`));
    await expireOn(controller, call);

    expect(auth.session()).toBeNull();
    await vi.waitFor(() => {
      expect(router.url).toBe('/login');
    });
  });

  it('stays where it is when the person is already on /login', async () => {
    const { auth, controller, http, router, signIn } = setup();
    await router.navigateByUrl('/login?updated=1');
    await signIn();
    const navigate = vi.spyOn(router, 'navigate');
    const navigateByUrl = vi.spyOn(router, 'navigateByUrl');

    const call = firstValueFrom(http.get(`${BFF}/bff/contracts`));
    await expireOn(controller, call);

    expect(auth.session()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(router.url).toBe('/login?updated=1');
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

  it('does not treat a 401 from /me as an expired session: the restoration decides (TAR-74)', async () => {
    const { auth, controller, http, router, signIn } = setup();
    await signIn();

    const call = firstValueFrom(http.get(`${BFF}/bff/auth/me`));
    controller
      .expectOne(`${BFF}/bff/auth/me`)
      .flush({ code: 'AUTH_NO_SESSION' }, { status: 401, statusText: 'Unauthorized' });

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

  it('same-origin: a 401 from a relative path outside /bff does not end the session', async () => {
    const { auth, controller, http, signIn } = setup();
    await signIn();

    const call = firstValueFrom(http.get('/other/resource'));
    controller.expectOne('/other/resource').flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(call).rejects.toMatchObject({ status: 401 });
    expect(auth.session()).not.toBeNull();
  });

  it('the match is case-insensitive and accepts /bff exactly and with a query', async () => {
    for (const url of ['/BFF/contracts', '/bff', '/bff?page=2', '/Bff/Contracts?x=1']) {
      TestBed.resetTestingModule();
      const { auth, controller, http, signIn } = setup();
      await signIn();

      const call = firstValueFrom(http.get(url));
      controller.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
      await expect(call).rejects.toMatchObject({ status: 401 });
      expect(auth.session(), url).toBeNull();
      controller.verify();
    }
  });

  it('does not match paths that only start with the letters bff', async () => {
    for (const url of ['/bffx/contracts', '/bff-admin', '/x/bff/contracts']) {
      TestBed.resetTestingModule();
      const { auth, controller, http, signIn } = setup();
      await signIn();

      const call = firstValueFrom(http.get(url));
      controller.expectOne(url).flush({}, { status: 401, statusText: 'Unauthorized' });
      await expect(call).rejects.toMatchObject({ status: 401 });
      expect(auth.session(), url).not.toBeNull();
      controller.verify();
    }
  });
});
