import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { environment } from '../../../environments/environment';
import { AuthService, LOGIN_TIMING, LoginRequest } from './auth.service';

const LOGIN_URL = `${environment.bffBaseUrl}/bff/auth/login`;
const REQUEST: LoginRequest = {
  documentType: 'DNI',
  documentNumber: '12345678',
  password: 'secret-1',
};
const ADMIN = { role: 'ADMIN', name: 'admin@example.test', mustChangePassword: true };

function setup(timing?: { slowHintAfterMs: number; timeoutMs: number }) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([credentialsInterceptor])),
      provideHttpClientTesting(),
      ...(timing ? [{ provide: LOGIN_TIMING, useValue: timing }] : []),
    ],
  });
  return {
    service: TestBed.inject(AuthService),
    controller: TestBed.inject(HttpTestingController),
  };
}

describe('AuthService', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('starts without a session', () => {
    const { service } = setup();

    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('posts the credentials to the BFF with the session cookie and stores the session', async () => {
    const { service, controller } = setup();

    const result = firstValueFrom(service.login(REQUEST));
    const req = controller.expectOne(LOGIN_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(REQUEST);
    // Same-origin by default: the browser sends the cookie itself, no credentials flag needed.
    expect(LOGIN_URL).toBe('/bff/auth/login');
    expect(req.request.withCredentials).toBe(false);
    req.flush(ADMIN);

    await expect(result).resolves.toEqual(ADMIN);
    expect(service.session()).toEqual(ADMIN);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('keeps the mustChangePassword flag of the account', async () => {
    const { service, controller } = setup();

    const result = firstValueFrom(service.login(REQUEST));
    controller.expectOne(LOGIN_URL).flush({ ...ADMIN, mustChangePassword: false });
    await result;

    expect(service.session()?.mustChangePassword).toBe(false);
  });

  it('fails with the BFF error and keeps no session on a 401', async () => {
    const { service, controller } = setup();

    const result = firstValueFrom(service.login(REQUEST));
    controller
      .expectOne(LOGIN_URL)
      .flush(
        { code: 'AUTH_INVALID_CREDENTIALS', message: 'x' },
        { status: 401, statusText: 'Unauthorized' },
      );

    const failure = await result.catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(HttpErrorResponse);
    expect((failure as HttpErrorResponse).status).toBe(401);
    expect((failure as HttpErrorResponse).error).toEqual({
      code: 'AUTH_INVALID_CREDENTIALS',
      message: 'x',
    });
    expect(service.session()).toBeNull();
  });

  it('fails with the BFF error on a 403', async () => {
    const { service, controller } = setup();

    const result = firstValueFrom(service.login(REQUEST));
    controller
      .expectOne(LOGIN_URL)
      .flush(
        { code: 'AUTH_ACCOUNT_DISABLED', message: 'x' },
        { status: 403, statusText: 'Forbidden' },
      );

    const failure = (await result.catch((error: unknown) => error)) as HttpErrorResponse;
    expect(failure.status).toBe(403);
    expect((failure.error as { code: string }).code).toBe('AUTH_ACCOUNT_DISABLED');
    expect(service.session()).toBeNull();
  });

  it('keeps the previous session when a later login fails', async () => {
    const { service, controller } = setup();
    const first = firstValueFrom(service.login(REQUEST));
    controller.expectOne(LOGIN_URL).flush({ role: 'GUEST', name: 'a', mustChangePassword: false });
    await first;

    const second = firstValueFrom(service.login(REQUEST));
    controller.expectOne(LOGIN_URL).flush({}, { status: 500, statusText: 'Server Error' });
    await second.catch((error: unknown) => error);

    expect(service.session()?.role).toBe('GUEST');
  });

  it.each([
    ['an unknown role', { role: 'ROOT', name: 'a', mustChangePassword: false }],
    ['a missing role', { name: 'a', mustChangePassword: false }],
    ['a non-string name', { role: 'ADMIN', name: 7, mustChangePassword: false }],
    ['a non-boolean mustChangePassword', { role: 'ADMIN', name: 'a', mustChangePassword: 'yes' }],
    ['a body that is not an object', 'ok'],
    ['an empty body', null],
  ])('rejects a 200 with %s and keeps no session', async (_name, body) => {
    const { service, controller } = setup();

    const result = firstValueFrom(service.login(REQUEST));
    controller.expectOne(LOGIN_URL).flush(body);

    await expect(result).rejects.toThrow('Unexpected login response');
    expect(service.session()).toBeNull();
  });

  it('gives up with a TimeoutError when the server does not answer in time', async () => {
    const { service, controller } = setup({ slowHintAfterMs: 10, timeoutMs: 40 });

    const result = firstValueFrom(service.login(REQUEST));
    const req = controller.expectOne(LOGIN_URL);

    await expect(result).rejects.toBeInstanceOf(TimeoutError);
    expect(req.cancelled).toBe(true);
    expect(service.session()).toBeNull();
    controller.match(LOGIN_URL);
  });

  it('waits up to 90 seconds by default (Render free cold start) and hints after 8', () => {
    setup();

    expect(TestBed.inject(LOGIN_TIMING)).toEqual({ slowHintAfterMs: 8_000, timeoutMs: 90_000 });
  });

  it('clears the client session', async () => {
    const { service, controller } = setup();
    const login = firstValueFrom(service.login(REQUEST));
    controller.expectOne(LOGIN_URL).flush(ADMIN);
    await login;

    service.clear();

    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});

describe('AuthService.changePassword', () => {
  const CHANGE_URL = `${environment.bffBaseUrl}/bff/auth/change-password`;

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  async function signIn(service: AuthService, controller: HttpTestingController) {
    const login = firstValueFrom(service.login(REQUEST));
    controller.expectOne(LOGIN_URL).flush(ADMIN); // ADMIN must change its password
    await login;
  }

  it('posts the new password and clears the pending change of the session', async () => {
    const { service, controller } = setup();
    await signIn(service, controller);

    const done = firstValueFrom(service.changePassword('Nueva12345'));
    const req = controller.expectOne(CHANGE_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ newPassword: 'Nueva12345' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    await done;

    expect(service.session()).toEqual({ ...ADMIN, mustChangePassword: false });
  });

  it('keeps the session pending when the BFF rejects the password', async () => {
    const { service, controller } = setup();
    await signIn(service, controller);

    const done = firstValueFrom(service.changePassword('corta'));
    controller
      .expectOne(CHANGE_URL)
      .flush({ code: 'AUTH_WEAK_PASSWORD' }, { status: 400, statusText: 'Bad Request' });

    await expect(done).rejects.toBeInstanceOf(HttpErrorResponse);
    expect(service.session()?.mustChangePassword).toBe(true);
  });
});
