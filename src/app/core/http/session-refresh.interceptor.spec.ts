import {
  HttpClient,
  HttpErrorResponse,
  HttpXsrfTokenExtractor,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { sessionRefreshInterceptor } from './session-refresh.interceptor';

const BFF = environment.bffBaseUrl;
const REFRESH = `${BFF}/bff/auth/refresh`;
const GUESTS = `${BFF}/bff/admin/guests`;

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([sessionRefreshInterceptor])),
      provideHttpClientTesting(),
      { provide: HttpXsrfTokenExtractor, useValue: { getToken: () => 'csrf-1' } },
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
  };
}

const unauthorized = { status: 401, statusText: 'Unauthorized' };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('sessionRefreshInterceptor (TAR-360)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('renews the session on a 401 and sends the request again once', async () => {
    const { http, controller } = setup();
    const answer = firstValueFrom(http.get(GUESTS));

    controller.expectOne(GUESTS).flush(null, unauthorized);
    await settle();
    const refresh = controller.expectOne(REFRESH);
    expect(refresh.request.method).toBe('POST');
    expect(refresh.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-1');
    expect(controller.match(GUESTS)).toHaveLength(0);
    refresh.flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    controller.expectOne(GUESTS).flush([{ id: 'g1' }]);

    await expect(answer).resolves.toEqual([{ id: 'g1' }]);
  });

  it('asks for one refresh when several requests answer 401 together', async () => {
    const { http, controller } = setup();
    const first = firstValueFrom(http.get(GUESTS));
    const second = firstValueFrom(http.get(`${BFF}/bff/admin/contracts`));

    controller.expectOne(GUESTS).flush(null, unauthorized);
    controller.expectOne(`${BFF}/bff/admin/contracts`).flush(null, unauthorized);
    await settle();
    controller.expectOne(REFRESH).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    controller.expectOne(GUESTS).flush('guests');
    controller.expectOne(`${BFF}/bff/admin/contracts`).flush('contracts');

    await expect(first).resolves.toBe('guests');
    await expect(second).resolves.toBe('contracts');
  });

  it('lets the first 401 go on when the session cannot be renewed', async () => {
    const { http, controller } = setup();
    const answer = firstValueFrom(http.get(GUESTS));

    controller.expectOne(GUESTS).flush({ code: 'AUTH_NO_SESSION' }, unauthorized);
    await settle();
    controller.expectOne(REFRESH).flush({ code: 'AUTH_NO_SESSION' }, unauthorized);

    const error: unknown = await answer.catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).url).toBe(GUESTS);
    expect((error as HttpErrorResponse).status).toBe(401);
  });

  it('does not renew twice: a request that answers 401 after the refresh ends the session', async () => {
    const { http, controller } = setup();
    const answer = firstValueFrom(http.get(GUESTS));

    controller.expectOne(GUESTS).flush(null, unauthorized);
    await settle();
    controller.expectOne(REFRESH).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    controller.expectOne(GUESTS).flush(null, unauthorized);

    await expect(answer).rejects.toBeInstanceOf(HttpErrorResponse);
    controller.expectNone(REFRESH);
  });

  it('never renews for the login, the CSRF token, the refresh itself or a call outside the BFF', async () => {
    const { http, controller } = setup();
    for (const url of [
      `${BFF}/bff/auth/login`,
      `${BFF}/bff/auth/csrf`,
      'https://elsewhere.test/x',
    ]) {
      const answer = firstValueFrom(http.get(url)).catch((caught: unknown) => caught);
      controller.expectOne(url).flush(null, unauthorized);
      await expect(answer).resolves.toBeInstanceOf(HttpErrorResponse);
    }
    await settle();
    controller.expectNone(REFRESH);
  });

  it('renews /me too, so reloading after 15 minutes keeps the session', async () => {
    const { http, controller } = setup();
    const me = `${BFF}/bff/auth/me`;
    const answer = firstValueFrom(http.get(me));

    controller.expectOne(me).flush(null, unauthorized);
    await settle();
    controller.expectOne(REFRESH).flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    controller.expectOne(me).flush({ role: 'ADMIN' });

    await expect(answer).resolves.toEqual({ role: 'ADMIN' });
  });
});
