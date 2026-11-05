import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import type { GuestPage } from '../model/guest-list';
import { GuestsListService } from './guests-list.service';

const BASE = 'https://bff.example.test';
const PAGE: GuestPage = {
  content: [],
  nextCursor: 'b3BhY28=',
  pendingActivationCount: 2,
  onboardingCount: 1,
};

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: BASE },
    ],
  });
  return {
    service: TestBed.inject(GuestsListService),
    backend: TestBed.inject(HttpTestingController),
  };
}

describe('GuestsListService (A3)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks the first page of the current guests, 20 at a time, without a type nor a cursor', async () => {
    const { service, backend } = setup();
    const answer = firstValueFrom(service.page({ status: 'CURRENT', type: null }));

    const request = backend.expectOne((req) => req.url === `${BASE}/bff/admin/guests`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys().sort()).toEqual(['limit', 'status']);
    expect(request.request.params.get('status')).toBe('CURRENT');
    expect(request.request.params.get('limit')).toBe('20');
    request.flush(PAGE);
    expect(await answer).toEqual(PAGE);
  });

  it('passes the type, the state and the cursor exactly as the BFF gave it', async () => {
    const { service, backend } = setup();
    const answer = firstValueFrom(
      service.page({ status: 'PENDING_ACTIVATION', type: 'TEMPORARY' }, 'a+b/c='),
    );

    const request = backend.expectOne((req) => req.url === `${BASE}/bff/admin/guests`);
    expect(request.request.params.get('status')).toBe('PENDING_ACTIVATION');
    expect(request.request.params.get('type')).toBe('TEMPORARY');
    expect(request.request.params.get('after')).toBe('a+b/c=');
    expect(request.request.urlWithParams).toContain('after=a%2Bb/c=');
    request.flush({ ...PAGE, nextCursor: null });
    expect((await answer).nextCursor).toBeNull();
  });
});
