import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { AdminGuestsService, GUEST_PICKER_PAGE_SIZE } from './admin-guests.service';

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
    service: TestBed.inject(AdminGuestsService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('AdminGuestsService (A5.1 guest picker)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks the first page of every guest, inactive ones included, without a cursor', async () => {
    const { service, http } = setup();

    const page = firstValueFrom(service.list());
    const req = http.expectOne((r) => r.url === `${BASE}/bff/admin/guests`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['limit', 'status']);
    expect(req.request.params.get('status')).toBe('ALL');
    expect(req.request.params.get('limit')).toBe(String(GUEST_PICKER_PAGE_SIZE));
    const body = { content: [], nextCursor: null, pendingActivationCount: 0, onboardingCount: 0 };
    req.flush(body);

    expect(await page).toEqual(body);
  });

  it('passes the cursor of the previous page as it came', async () => {
    const { service, http } = setup();

    const page = firstValueFrom(service.list('opaque+cursor/=='));
    const req = http.expectOne((r) => r.url === `${BASE}/bff/admin/guests`);
    expect(req.request.params.get('after')).toBe('opaque+cursor/==');
    req.flush({ content: [], nextCursor: null, pendingActivationCount: 0, onboardingCount: 0 });
    await page;
  });

  it('reads one guest by its opaque id, escaped only for the path', async () => {
    const { service, http } = setup();

    const guest = firstValueFrom(service.get('g/1?x'));
    const req = http.expectOne(`${BASE}/bff/admin/guests/g%2F1%3Fx`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'g/1?x' });

    expect(await guest).toEqual({ id: 'g/1?x' });
  });
});
