import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { toBffError } from './bff-error';
import { serviceBusyInterceptor } from './service-busy.interceptor';

const BFF = environment.bffBaseUrl;
const GUESTS = `${BFF}/bff/admin/guests`;
const BUSY = { code: 'SERVICE_BUSY', message: 'Servicio ocupado' };

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(withInterceptors([serviceBusyInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  return {
    http: TestBed.inject(HttpClient),
    controller: TestBed.inject(HttpTestingController),
  };
}

const busy = (retryAfter: string | null = '5') => ({
  status: 503,
  statusText: 'Service Unavailable',
  headers: retryAfter === null ? {} : ({ 'Retry-After': retryAfter } as Record<string, string>),
});

describe('serviceBusyInterceptor (contract v0.29.0)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    vi.useRealTimers();
  });

  it('waits Retry-After and sends a read once more', async () => {
    const { http, controller } = setup();
    const answer = firstValueFrom(http.get(GUESTS));
    controller.expectOne(GUESTS).flush(BUSY, busy('3'));
    await vi.advanceTimersByTimeAsync(2999);
    expect(controller.match(GUESTS)).toHaveLength(0);
    await vi.advanceTimersByTimeAsync(1);
    controller.expectOne(GUESTS).flush([{ id: 'g1' }]);
    await expect(answer).resolves.toEqual([{ id: 'g1' }]);
  });

  it('lets the second SERVICE_BUSY reach the page, worded by the catalog', async () => {
    const { http, controller } = setup();
    const answer = firstValueFrom(http.get(GUESTS)).catch((error: unknown) => error);
    controller.expectOne(GUESTS).flush(BUSY, busy(null));
    await vi.advanceTimersByTimeAsync(5000);
    controller.expectOne(GUESTS).flush(BUSY, busy());
    expect(toBffError(await answer)).toEqual({
      code: 'SERVICE_BUSY',
      message: 'El servicio está ocupado. Inténtalo de nuevo en unos segundos.',
    });
  });

  it('does not wait a Retry-After past ten seconds', async () => {
    const { http, controller } = setup();
    const answer = firstValueFrom(http.get(GUESTS)).catch((error: unknown) => error);
    controller.expectOne(GUESTS).flush(BUSY, busy('60'));
    expect(toBffError(await answer).code).toBe('SERVICE_BUSY');
  });

  it('never resends a write in silence', async () => {
    const { http, controller } = setup();
    const answer = firstValueFrom(http.post(GUESTS, {})).catch((error: unknown) => error);
    controller.expectOne(GUESTS).flush(BUSY, busy('1'));
    await vi.advanceTimersByTimeAsync(5000);
    expect(controller.match(GUESTS)).toHaveLength(0);
    expect(toBffError(await answer).code).toBe('SERVICE_BUSY');
  });

  it('leaves the other 503 (FILE_STORAGE_UNAVAILABLE) to the page', async () => {
    const { http, controller } = setup();
    const answer = firstValueFrom(http.get(GUESTS)).catch((error: unknown) => error);
    controller.expectOne(GUESTS).flush({ code: 'FILE_STORAGE_UNAVAILABLE', message: 'x' }, busy());
    await vi.advanceTimersByTimeAsync(5000);
    expect(controller.match(GUESTS)).toHaveLength(0);
    await expect(answer).resolves.toBeDefined();
  });
});
