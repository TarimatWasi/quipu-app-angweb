import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { GuestPaymentsService } from './guest-payments.service';
import type { GuestPaymentsPage } from './guest-payments.service';

const BASE = 'https://bff.example.test';
const PAGE: GuestPaymentsPage = { content: [], nextCursor: 'b3BhY28=' };

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: BASE },
    ],
  });
  return {
    service: TestBed.inject(GuestPaymentsService),
    backend: TestBed.inject(HttpTestingController),
  };
}

describe('GuestPaymentsService (A3.2 «Historial de pagos»)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks the first page of the payments of a guest, 20 at a time, without a cursor', async () => {
    const { service, backend } = setup();
    const answer = firstValueFrom(service.page('g/1'));

    const request = backend.expectOne(
      (req) => req.url === `${BASE}/bff/admin/guests/g%2F1/payments`,
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual(['limit']);
    expect(request.request.params.get('limit')).toBe('20');
    request.flush(PAGE);
    expect(await answer).toEqual(PAGE);
  });

  it('passes the cursor exactly as the BFF gave it', async () => {
    const { service, backend } = setup();
    const answer = firstValueFrom(service.page('g1', 'b3BhY28='));

    const request = backend.expectOne((req) => req.url === `${BASE}/bff/admin/guests/g1/payments`);
    expect(request.request.params.get('after')).toBe('b3BhY28=');
    request.flush({ content: [], nextCursor: null });
    expect(await answer).toEqual({ content: [], nextCursor: null });
  });
});
