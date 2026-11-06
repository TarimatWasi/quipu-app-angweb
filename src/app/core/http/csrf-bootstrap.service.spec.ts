import {
  HttpClient,
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { csrfErrorInterceptor } from '@core/interceptors/csrf-error.interceptor';
import { sessionExpiredInterceptor } from '@core/interceptors/session-expired.interceptor';
import { CsrfBootstrapService } from './csrf-bootstrap.service';
import { CSRF_INVALID_TEXT, CSRF_PREPARATION_TEXT } from './csrf-failure';

function setCookie(value: string | null): void {
  document.cookie =
    value === null ? 'XSRF-TOKEN=; Path=/; Max-Age=0' : `XSRF-TOKEN=${value}; Path=/; SameSite=Lax`;
}

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(
        withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
        withInterceptors([sessionExpiredInterceptor, csrfErrorInterceptor]),
      ),
      provideHttpClientTesting(),
    ],
  });
  return {
    csrf: TestBed.inject(CsrfBootstrapService),
    http: TestBed.inject(HttpClient),
    backend: TestBed.inject(HttpTestingController),
    auth: TestBed.inject(AuthService),
  };
}

describe('CSRF preparation and native HttpClient XSRF (TAR-300)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('shares one cold bootstrap before concurrent JSON and multipart writes, leaving Content-Type to HttpClient', async () => {
    setCookie(null);
    const { csrf, http, backend } = setup();
    const file = new FormData();
    file.append('file', new Blob(['test'], { type: 'image/jpeg' }), 'voucher.jpg');
    const first = firstValueFrom(csrf.protect(() => http.post('/bff/one', { value: 1 })));
    const second = firstValueFrom(csrf.protect(() => http.put('/bff/two', file)));
    expect(csrf.pending()).toBe(true);
    backend.expectNone('/bff/one');
    backend.expectNone('/bff/two');
    const bootstrap = backend.expectOne('/bff/auth/csrf');
    expect(bootstrap.request.method).toBe('GET');
    expect(bootstrap.request.cache).toBe('no-store');
    expect(bootstrap.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    setCookie('first-test-token');
    bootstrap.flush(null, { status: 204, statusText: 'No Content' });
    const json = backend.expectOne('/bff/one');
    const multipart = backend.expectOne('/bff/two');
    expect(json.request.headers.get('X-XSRF-TOKEN')).toBe('first-test-token');
    expect(multipart.request.headers.get('X-XSRF-TOKEN')).toBe('first-test-token');
    expect(multipart.request.headers.has('Content-Type')).toBe(false);
    expect(multipart.request.body).toBe(file);
    json.flush({ saved: true });
    multipart.flush({ saved: true });
    await Promise.all([first, second]);
    expect(csrf.pending()).toBe(false);
  });

  it('fails closed on bootstrap failure, releases the shared request and permits an explicit new attempt', async () => {
    setCookie(null);
    const { csrf, http, backend } = setup();
    const mutation = vi.fn(() => http.post('/bff/payment', { amount: 10 }));
    const first = firstValueFrom(csrf.protect(mutation));
    const second = firstValueFrom(csrf.ensureReady());
    backend.expectOne('/bff/auth/csrf').flush({}, { status: 503, statusText: 'Unavailable' });
    await expect(first).rejects.toMatchObject({ status: 503 });
    await expect(second).rejects.toMatchObject({ status: 503 });
    expect(mutation).not.toHaveBeenCalled();
    expect(csrf.error()).toBe(CSRF_PREPARATION_TEXT);
    expect(csrf.pending()).toBe(false);
    const retry = firstValueFrom(csrf.protect(mutation));
    const bootstrap = backend.expectOne('/bff/auth/csrf');
    setCookie('retry-test-token');
    bootstrap.flush(null, { status: 204, statusText: 'No Content' });
    backend.expectOne('/bff/payment').flush({ saved: true });
    await retry;
    expect(mutation).toHaveBeenCalledOnce();
    expect(csrf.error()).toBeNull();
  });

  it('does not mistake a 204 without a readable cookie for readiness', async () => {
    setCookie(null);
    const { csrf, http, backend } = setup();
    const call = firstValueFrom(csrf.protect(() => http.post('/bff/payment', {})));
    backend.expectOne('/bff/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    await expect(call).rejects.toThrow('usable cookie');
    backend.expectNone('/bff/payment');
    expect(csrf.error()).toBe(CSRF_PREPARATION_TEXT);
  });

  it('reads rotation from the native extractor and prepares again when the cookie disappears', async () => {
    const { csrf, http, backend } = setup();
    setCookie('rotated-test-token');
    const first = firstValueFrom(csrf.protect(() => http.patch('/bff/payment', {})));
    const patch = backend.expectOne('/bff/payment');
    expect(patch.request.headers.get('X-XSRF-TOKEN')).toBe('rotated-test-token');
    patch.flush(null);
    await first;
    setCookie(null);
    const second = firstValueFrom(csrf.protect(() => http.delete('/bff/other')));
    const bootstrap = backend.expectOne('/bff/auth/csrf');
    setCookie('after-logout-test-token');
    bootstrap.flush(null, { status: 204, statusText: 'No Content' });
    const deletion = backend.expectOne('/bff/other');
    expect(deletion.request.headers.get('X-XSRF-TOKEN')).toBe('after-logout-test-token');
    deletion.flush(null);
    await second;
  });

  it('keeps the session on a CSRF 403, never replays the write, and refreshes only for a new action', async () => {
    const { csrf, http, backend, auth } = setup();
    const restoration = firstValueFrom(auth.restore());
    const session = { role: 'ADMIN', name: 'Admin', mustChangePassword: false };
    backend.expectOne('/bff/auth/me').flush(session);
    await restoration;
    const save = firstValueFrom(csrf.protect(() => http.post('/bff/payment', { amount: 10 })));
    backend
      .expectOne('/bff/payment')
      .flush({ code: 'AUTH_CSRF_INVALID' }, { status: 403, statusText: 'Forbidden' });
    await expect(save).rejects.toMatchObject({ status: 403 });
    expect(csrf.error()).toBe(CSRF_INVALID_TEXT);
    expect(auth.session()).toEqual(session);
    backend.expectNone('/bff/auth/csrf');
    backend.expectNone('/bff/payment');
    const retry = firstValueFrom(csrf.protect(() => http.post('/bff/payment', { amount: 10 })));
    backend.expectOne('/bff/auth/csrf').flush(null, { status: 204, statusText: 'No Content' });
    backend.expectOne('/bff/payment').flush({ saved: true });
    await retry;
    expect(auth.session()).toEqual(session);
  });

  it('does not add native XSRF headers to GET, HEAD or foreign destinations', async () => {
    const { http, backend } = setup();
    for (const [method, url] of [
      ['GET', '/bff/read'],
      ['HEAD', '/bff/read'],
      ['POST', 'https://foreign.example/bff/write'],
      ['POST', '//foreign.example/bff/write'],
    ] as const) {
      const call = firstValueFrom(http.request(method, url));
      const request = backend.expectOne(url);
      expect(request.request.headers.has('X-XSRF-TOKEN')).toBe(false);
      expect(request.request.withCredentials).toBe(false);
      request.flush(null);
      await call;
    }
  });

  it('propagates a CSRF failure from logout without forgetting a live session', async () => {
    const { auth, backend } = setup();
    const restoration = firstValueFrom(auth.restore());
    const session = { role: 'ADMIN', name: 'Admin', mustChangePassword: false };
    backend.expectOne('/bff/auth/me').flush(session);
    await restoration;
    const logout = firstValueFrom(auth.logout());
    backend
      .expectOne('/bff/auth/logout')
      .flush({ code: 'AUTH_CSRF_INVALID' }, { status: 403, statusText: 'Forbidden' });
    await expect(logout).rejects.toMatchObject({ status: 403 });
    expect(auth.session()).toEqual(session);
    backend.expectNone('/bff/auth/csrf');
  });

  it('ignores foreign CSRF-shaped errors and ordinary permission failures', async () => {
    const { csrf, http, backend } = setup();
    for (const [url, code] of [
      ['https://foreign.example/bff/write', 'AUTH_CSRF_INVALID'],
      ['/bff/write', 'AUTH_FORBIDDEN'],
    ] as const) {
      const call = firstValueFrom(http.post(url, {}));
      backend.expectOne(url).flush({ code }, { status: 403, statusText: 'Forbidden' });
      await expect(call).rejects.toMatchObject({ status: 403 });
      expect(csrf.error()).toBeNull();
    }
  });
});
