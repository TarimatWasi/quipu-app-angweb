import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { GUEST_HISTORY_PAGE_SIZE, GuestPaymentsService } from './guest-payments.service';
import { TemporaryGuestPaymentsService } from './temporary-guest-payments.service';

const BASE = 'https://bff.example.test';
// Opaque ids: the services pass them through untouched, only escaping them for the path.
const ID = 'pay_9f/x?y';
const ESCAPED_ID = 'pay_9f%2Fx%3Fy';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: BASE },
    ],
  });
  return {
    guest: TestBed.inject(GuestPaymentsService),
    temporary: TestBed.inject(TemporaryGuestPaymentsService),
    http: TestBed.inject(HttpTestingController),
  };
}

async function partsOf(body: unknown) {
  expect(body).toBeInstanceOf(FormData);
  const form = body as FormData;
  const proofs = form.get('proofs') as Blob;
  expect(proofs.type).toBe('application/json');
  return {
    keys: [...new Set([...form.keys()])].sort(),
    form,
    proofs: JSON.parse(await proofs.text()) as unknown,
    files: (form.getAll('files') as File[]).map((file) => file.name),
  };
}

const voucher = () => new File(['%PDF'], 'voucher.pdf', { type: 'application/pdf' });
const photo = () => new File(['png'], 'foto.png', { type: 'image/png' });

describe('GuestPaymentsService (H1, H3, H4)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('reads the own account status, without any guest id', async () => {
    const { guest, http } = setup();

    const status = firstValueFrom(guest.accountStatus());
    const req = http.expectOne(`${BASE}/bff/guest/account-status`);
    expect(req.request.method).toBe('GET');
    req.flush([]);

    expect(await status).toEqual([]);
  });

  it('reads the own credit, without any guest id nor query', async () => {
    const { guest, http } = setup();
    const body = {
      balance: 150,
      toRefund: false,
      origins: [{ paymentId: 'pay_1', period: '2026-10', amount: 150 }],
      lastRefund: { amount: 120, date: '2026-11-03', method: 'Yape' },
    };

    const credit = firstValueFrom(guest.credit());
    const req = http.expectOne(`${BASE}/bff/guest/credit`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual([]);
    req.flush(body);

    expect(await credit).toEqual(body);
  });

  it('asks the first page of the history with the page size and no cursor', async () => {
    const { guest, http } = setup();

    const page = firstValueFrom(guest.history());
    const req = http.expectOne((r) => r.url === `${BASE}/bff/guest/payments`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys()).toEqual(['limit']);
    expect(req.request.params.get('limit')).toBe(String(GUEST_HISTORY_PAGE_SIZE));
    req.flush({ content: [], nextCursor: null, creditBalance: 0 });

    expect(await page).toEqual({ content: [], nextCursor: null, creditBalance: 0 });
  });

  it('passes the cursor of the previous page as it came', async () => {
    const { guest, http } = setup();

    const page = firstValueFrom(guest.history('opaque+cursor/=='));
    const req = http.expectOne((r) => r.url === `${BASE}/bff/guest/payments`);
    expect(req.request.params.get('after')).toBe('opaque+cursor/==');
    expect(req.request.urlWithParams).toContain('after=opaque%2Bcursor/==');
    req.flush({ content: [], nextCursor: null, creditBalance: 0 });
    await page;
  });

  it('reads one own payment by its escaped id', async () => {
    const { guest, http } = setup();

    const payment = firstValueFrom(guest.get(ID));
    const req = http.expectOne(`${BASE}/bff/guest/payments/${ESCAPED_ID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: ID });

    expect(await payment).toEqual({ id: ID });
  });

  it('sends a month as GuestPaymentUpload: period, proofs as JSON and the files in order', async () => {
    const { guest, http } = setup();

    const done = firstValueFrom(
      guest.upload(
        '2026-09',
        [
          { kind: 'VOUCHER', amount: 200, method: 'Yape', fileIndex: 0 },
          { kind: 'CASH', amount: 100 },
          { kind: 'VOUCHER', amount: 50, fileIndex: 1 },
        ],
        [voucher(), photo()],
      ),
    );
    const req = http.expectOne(`${BASE}/bff/guest/payments`);
    expect(req.request.method).toBe('POST');
    const parts = await partsOf(req.request.body);
    expect(parts.keys).toEqual(['files', 'period', 'proofs']);
    expect(parts.form.get('period')).toBe('2026-09');
    expect(parts.proofs).toEqual([
      { kind: 'VOUCHER', amount: 200, method: 'Yape', fileIndex: 0 },
      { kind: 'CASH', amount: 100 },
      { kind: 'VOUCHER', amount: 50, fileIndex: 1 },
    ]);
    expect(parts.files).toEqual(['voucher.pdf', 'foto.png']);
    req.flush({ id: 'pay_new', status: 'PENDING' }, { status: 201, statusText: 'Created' });

    expect(await done).toEqual({ id: 'pay_new', status: 'PENDING' });
  });

  it('sends a correction as ProofsCorrection with PUT: only the proofs and the new files', async () => {
    const { guest, http } = setup();

    const done = firstValueFrom(
      guest.correct(
        ID,
        [
          { id: 'p1', kind: 'VOUCHER', amount: 300, fileIndex: 0 },
          { kind: 'CASH', amount: 50 },
        ],
        [voucher()],
      ),
    );
    const req = http.expectOne(`${BASE}/bff/guest/payments/${ESCAPED_ID}`);
    expect(req.request.method).toBe('PUT');
    const parts = await partsOf(req.request.body);
    expect(parts.keys).toEqual(['files', 'proofs']);
    expect(parts.proofs).toEqual([
      { id: 'p1', kind: 'VOUCHER', amount: 300, fileIndex: 0 },
      { kind: 'CASH', amount: 50 },
    ]);
    expect(parts.files).toEqual(['voucher.pdf']);
    req.flush({ id: ID, status: 'PENDING' });
    await done;
  });
});

describe('TemporaryGuestPaymentsService (T1, T2)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('reads the payment status of the stay', async () => {
    const { temporary, http } = setup();

    const status = firstValueFrom(temporary.paymentStatus());
    const req = http.expectOne(`${BASE}/bff/temporary-guest/payment-status`);
    expect(req.request.method).toBe('GET');
    req.flush({ stayId: 's1' });

    expect(await status).toEqual({ stayId: 's1' });
  });

  it('sends the stay payment as StayPaymentUpload: no period and no stay, only proofs and files', async () => {
    const { temporary, http } = setup();

    const done = firstValueFrom(
      temporary.upload(
        [
          { kind: 'CASH', amount: 100 },
          { kind: 'VOUCHER', amount: 300, fileIndex: 0 },
        ],
        [voucher()],
      ),
    );
    const req = http.expectOne(`${BASE}/bff/temporary-guest/payments`);
    expect(req.request.method).toBe('POST');
    const parts = await partsOf(req.request.body);
    expect(parts.keys).toEqual(['files', 'proofs']);
    expect(parts.proofs).toEqual([
      { kind: 'CASH', amount: 100 },
      { kind: 'VOUCHER', amount: 300, fileIndex: 0 },
    ]);
    expect(parts.files).toEqual(['voucher.pdf']);
    req.flush({ id: 'pay_new' }, { status: 201, statusText: 'Created' });
    await done;
  });

  it('sends only cash without a files part', async () => {
    const { temporary, http } = setup();

    const done = firstValueFrom(temporary.upload([{ kind: 'CASH', amount: 400 }], []));
    const req = http.expectOne(`${BASE}/bff/temporary-guest/payments`);
    const parts = await partsOf(req.request.body);
    expect(parts.keys).toEqual(['proofs']);
    req.flush({ id: 'pay_new' }, { status: 201, statusText: 'Created' });
    await done;
  });

  it('reads and corrects the own stay payment by its escaped id', async () => {
    const { temporary, http } = setup();

    const payment = firstValueFrom(temporary.get(ID));
    const get = http.expectOne(`${BASE}/bff/temporary-guest/payments/${ESCAPED_ID}`);
    expect(get.request.method).toBe('GET');
    get.flush({ id: ID });
    await payment;

    const done = firstValueFrom(
      temporary.correct(ID, [{ id: 'p1', kind: 'CASH', amount: 400 }], []),
    );
    const put = http.expectOne(`${BASE}/bff/temporary-guest/payments/${ESCAPED_ID}`);
    expect(put.request.method).toBe('PUT');
    const parts = await partsOf(put.request.body);
    expect(parts.keys).toEqual(['proofs']);
    expect(parts.proofs).toEqual([{ id: 'p1', kind: 'CASH', amount: 400 }]);
    put.flush({ id: ID });
    await done;
  });
});
