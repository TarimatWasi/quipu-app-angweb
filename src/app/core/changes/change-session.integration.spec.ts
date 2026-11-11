import {
  HttpClient,
  HttpXsrfTokenExtractor,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '@core/auth/auth.service';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { sessionRefreshInterceptor } from '@core/http/session-refresh.interceptor';
import { ChangeResourcesService } from './change-resources.service';
import {
  CHANGE_EVENT_SOURCE_FACTORY,
  CHANGES_ENABLED,
  ChangeStreamService,
} from './change-stream.service';

const admin = { role: 'ADMIN', name: 'Admin', mustChangePassword: false };
const unauthorized = { status: 401, statusText: 'Unauthorized' };
class Source extends EventTarget {
  onerror: EventSource['onerror'] = null;
  readonly close = vi.fn();
  expire(): void {
    this.dispatchEvent(new MessageEvent('closing', { data: '{"reason":"access-token-expired"}' }));
  }
}
async function setup() {
  const sources: Source[] = [];
  const factory = vi.fn(() => {
    const source = new Source();
    sources.push(source);
    return source;
  });
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([sessionRefreshInterceptor])),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: '' },
      { provide: HttpXsrfTokenExtractor, useValue: { getToken: () => 'csrf' } },
      { provide: Router, useValue: { url: '/home', navigate: vi.fn().mockResolvedValue(true) } },
      { provide: ChangeResourcesService, useValue: { ready: vi.fn(), changed: vi.fn() } },
      { provide: CHANGES_ENABLED, useValue: true },
      { provide: CHANGE_EVENT_SOURCE_FACTORY, useValue: factory },
    ],
  });
  const controller = TestBed.inject(HttpTestingController);
  const auth = TestBed.inject(AuthService);
  const restored = firstValueFrom(auth.restore());
  controller.expectOne('/bff/auth/me').flush(admin);
  await restored;
  const service = TestBed.inject(ChangeStreamService);
  service.start();
  return { sources, factory, controller, auth, service, http: TestBed.inject(HttpClient) };
}

describe('stream recovery through the shared refresh (TAR-373)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  });
  afterEach(() => {
    TestBed.inject(ChangeStreamService).stop();
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('shares one refresh with an ordinary GET before reopening the stream', async () => {
    const { sources, factory, controller, http, auth } = await setup();
    sources[0]?.expire();
    const read = firstValueFrom(http.get('/bff/admin/guests'));
    controller.expectOne('/bff/auth/me').flush(null, unauthorized);
    controller.expectOne('/bff/admin/guests').flush(null, unauthorized);
    const refresh = controller.expectOne('/bff/auth/refresh');
    expect(refresh.request.headers.get('X-XSRF-TOKEN')).toBe('csrf');
    refresh.flush(null, { status: 204, statusText: 'No Content' });
    controller.expectOne('/bff/auth/me').flush(admin);
    controller.expectOne('/bff/admin/guests').flush([]);
    await read;
    await vi.advanceTimersByTimeAsync(1000);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(auth.session()?.role).toBe('ADMIN');
    expect(sources[0]?.close).toHaveBeenCalledOnce();
  });

  it.each([401, 503])('ends only a definitively rejected refresh, status %s', async (status) => {
    const { sources, factory, controller, auth } = await setup();
    sources[0]?.expire();
    controller.expectOne('/bff/auth/me').flush(null, unauthorized);
    controller.expectOne('/bff/auth/refresh').flush(null, { status, statusText: 'Failure' });
    await vi.advanceTimersByTimeAsync(30_000);
    expect(auth.session() === null).toBe(status === 401);
    expect(factory).toHaveBeenCalledTimes(status === 401 ? 1 : 2);
  });
});
