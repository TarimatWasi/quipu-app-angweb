import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { AdminGuestsService, GUEST_PICKER_PAGE_SIZE, STAY_PAGE_SIZE } from './admin-guests.service';

// TAR-300: the browser calls the same-origin proxy.
const BASE = '';

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

describe('AdminGuestsService (A3.2 and A3.5 stays and document)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  const stay = (id: string, version = 1) => ({
    id,
    environmentId: 'env-1',
    environmentCode: 'H1',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    agreedAmount: 400,
    paymentStatus: 'UNPAID',
    paymentId: null,
    version,
  });

  it('asks one page of the stays with the page size and no cursor', async () => {
    const { service, http } = setup();

    const page = firstValueFrom(service.stays('g/1'));
    const req = http.expectOne((r) => r.url === `${BASE}/bff/admin/guests/g%2F1/stays`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual(['limit']);
    expect(req.request.params.get('limit')).toBe(String(STAY_PAGE_SIZE));
    const body = { content: [stay('s1')], nextCursor: 'c+1' };
    req.flush(body);

    expect(await page).toEqual(body);
  });

  it('passes the cursor of the stays as it came', async () => {
    const { service, http } = setup();

    const page = firstValueFrom(service.stays('g1', 'opaque+cursor/=='));
    const req = http.expectOne((r) => r.url === `${BASE}/bff/admin/guests/g1/stays`);
    expect(req.request.params.get('after')).toBe('opaque+cursor/==');
    req.flush({ content: [], nextCursor: null });
    await page;
  });

  it('finds one stay walking the pages until it appears, with the largest page', async () => {
    const { service, http } = setup();

    const found = firstValueFrom(service.findStay('g1', 's3'));
    const first = http.expectOne((r) => r.url === `${BASE}/bff/admin/guests/g1/stays`);
    expect(first.request.params.get('limit')).toBe('100');
    expect(first.request.params.has('after')).toBe(false);
    first.flush({ content: [stay('s1'), stay('s2')], nextCursor: 'next/1' });
    const second = http.expectOne((r) => r.url === `${BASE}/bff/admin/guests/g1/stays`);
    expect(second.request.params.get('after')).toBe('next/1');
    second.flush({ content: [stay('s3', 7)], nextCursor: 'never-asked' });

    expect(await found).toEqual(stay('s3', 7));
  });

  it('answers null when no page has the stay', async () => {
    const { service, http } = setup();

    const found = firstValueFrom(service.findStay('g1', 'missing'));
    http
      .expectOne((r) => r.url === `${BASE}/bff/admin/guests/g1/stays`)
      .flush({ content: [stay('s1')], nextCursor: null });

    expect(await found).toBeNull();
  });

  it('registers a stay with exactly the fields of StayInput', async () => {
    const { service, http } = setup();
    const input = {
      environmentId: 'env/1',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      agreedAmount: 400.5,
    };

    const created = firstValueFrom(service.createStay('g/1', input));
    const req = http.expectOne(`${BASE}/bff/admin/guests/g%2F1/stays`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush(stay('s9'), { status: 201, statusText: 'Created' });

    expect(await created).toEqual(stay('s9'));
  });

  it('corrects a stay sending the changes and the version loaded, nothing else', async () => {
    const { service, http } = setup();

    const updated = firstValueFrom(
      service.updateStay('g/1', 's/2', { version: 4, agreedAmount: 450 }),
    );
    const req = http.expectOne(`${BASE}/bff/admin/guests/g%2F1/stays/s%2F2`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toStrictEqual({ version: 4, agreedAmount: 450 });
    req.flush(stay('s/2', 5));

    expect(await updated).toEqual(stay('s/2', 5));
  });

  it('corrects the document of a pending guest with the version loaded', async () => {
    const { service, http } = setup();

    const updated = firstValueFrom(
      service.updateGuest('g/1', { version: 3, documentNumber: '87654321' }),
    );
    const req = http.expectOne(`${BASE}/bff/admin/guests/g%2F1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toStrictEqual({ version: 3, documentNumber: '87654321' });
    req.flush({ id: 'g/1' });

    expect(await updated).toEqual({ id: 'g/1' });
  });

  it('registers a guest with exactly the fields of GuestInput and answers the created guest', async () => {
    const { service, http } = setup();
    const input = {
      documentType: 'DNI' as const,
      documentNumber: '70412233',
      type: 'CONTRACT' as const,
      phone: '+51 987 654 321',
      accessMode: 'LINK' as const,
    };

    const created = firstValueFrom(service.create(input));
    const req = http.expectOne(`${BASE}/bff/admin/guests`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toStrictEqual(input);
    const body = { alreadyRegistered: false, guest: { id: 'g1' }, access: { mode: 'LINK' } };
    req.flush(body, { status: 201, statusText: 'Created' });

    expect(await created).toEqual(body);
  });

  it('answers the existing guest when the document was already registered', async () => {
    const { service, http } = setup();

    const answer = firstValueFrom(
      service.create({
        documentType: 'CE',
        documentNumber: 'X-1',
        type: 'TEMPORARY',
        accessMode: 'TEMPORARY_PASSWORD',
      }),
    );
    const body = { alreadyRegistered: true, guest: { id: 'g2', status: 'ACTIVE' } };
    http.expectOne(`${BASE}/bff/admin/guests`).flush(body);

    expect(await answer).toEqual(body);
  });

  it('reactivates a guest by its opaque id, without a body', async () => {
    const { service, http } = setup();

    const reactivated = firstValueFrom(service.reactivate('g/1?x'));
    const req = http.expectOne(`${BASE}/bff/admin/guests/g%2F1%3Fx/reactivate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush({ id: 'g/1?x', status: 'ACTIVE' });

    expect(await reactivated).toEqual({ id: 'g/1?x', status: 'ACTIVE' });
  });

  it('deactivates a guest by its opaque id, without a body', async () => {
    const { service, http } = setup();

    const done = firstValueFrom(service.deactivate('g/1?x'), { defaultValue: undefined });
    const req = http.expectOne(`${BASE}/bff/admin/guests/g%2F1%3Fx/deactivate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(await done).toBeNull();
  });

  it('generates a new access with only the access mode', async () => {
    const { service, http } = setup();
    const grant = {
      mode: 'TEMPORARY_PASSWORD',
      temporaryPassword: 'K7-q2x9m',
      expiresAt: '2026-11-05T16:05:00Z',
      emailSent: false,
      shareMessage: 'Entra con K7-q2x9m',
    };

    const answer = firstValueFrom(service.generateAccess('g/1?x', 'TEMPORARY_PASSWORD'));
    const req = http.expectOne(`${BASE}/bff/admin/guests/g%2F1%3Fx/access`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ accessMode: 'TEMPORARY_PASSWORD' });
    req.flush(grant);

    expect(await answer).toEqual(grant);
  });

  it('puts the account email with only the email', async () => {
    const { service, http } = setup();

    const done = firstValueFrom(service.setAccountEmail('g/1?x', 'ana@example.com'), {
      defaultValue: undefined,
    });
    const req = http.expectOne(`${BASE}/bff/admin/guests/g%2F1%3Fx/account-email`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ email: 'ana@example.com' });
    req.flush(null, { status: 204, statusText: 'No Content' });

    expect(await done).toBeNull();
  });

  it('reads the state of every month of the guest', async () => {
    const { service, http } = setup();
    const months = [{ period: '2026-10', status: 'PAID' }];

    const answer = firstValueFrom(service.accountStatus('g/1?x'));
    const req = http.expectOne(`${BASE}/bff/admin/guests/g%2F1%3Fx/account-status`);
    expect(req.request.method).toBe('GET');
    req.flush(months);

    expect(await answer).toEqual(months);
  });

  it('reads every stay walking the pages with the largest size', async () => {
    const { service, http } = setup();

    const all = firstValueFrom(service.allStays('g1'));
    const first = http.expectOne((r) => r.url === `${BASE}/bff/admin/guests/g1/stays`);
    expect(first.request.params.get('limit')).toBe('100');
    expect(first.request.params.has('after')).toBe(false);
    first.flush({ content: [{ id: 's1' }], nextCursor: 'c2' });
    const second = http.expectOne((r) => r.url === `${BASE}/bff/admin/guests/g1/stays`);
    expect(second.request.params.get('after')).toBe('c2');
    second.flush({ content: [{ id: 's2' }], nextCursor: null });

    expect(await all).toEqual([{ id: 's1' }, { id: 's2' }]);
  });
});
