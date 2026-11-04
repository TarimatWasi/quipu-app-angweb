import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import {
  AdminEnvironmentsService,
  ENVIRONMENT_PICKER_PAGE_SIZE,
} from './admin-environments.service';

const BASE = 'https://bff.example.test';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: BASE },
    ],
  });
  return {
    service: TestBed.inject(AdminEnvironmentsService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('AdminEnvironmentsService (A3.5 environment picker)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks the active environments free for the whole stay, without a cursor', async () => {
    const { service, http } = setup();

    const page = firstValueFrom(service.listFree('2026-11-10', '2026-11-15'));
    const req = http.expectOne((r) => r.url === `${BASE}/bff/admin/environments`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['freeFrom', 'freeTo', 'limit', 'status']);
    expect(req.request.params.get('status')).toBe('ACTIVE');
    expect(req.request.params.get('freeFrom')).toBe('2026-11-10');
    expect(req.request.params.get('freeTo')).toBe('2026-11-15');
    expect(req.request.params.get('limit')).toBe(String(ENVIRONMENT_PICKER_PAGE_SIZE));
    const body = { content: [], nextCursor: null, freeCount: 0 };
    req.flush(body);

    expect(await page).toEqual(body);
  });

  it('passes the cursor of the previous page as it came', async () => {
    const { service, http } = setup();

    const page = firstValueFrom(service.listFree('2026-11-10', '2026-11-15', 'opaque+c/=='));
    const req = http.expectOne((r) => r.url === `${BASE}/bff/admin/environments`);
    expect(req.request.params.get('after')).toBe('opaque+c/==');
    req.flush({ content: [], nextCursor: null, freeCount: 0 });
    await page;
  });
});
