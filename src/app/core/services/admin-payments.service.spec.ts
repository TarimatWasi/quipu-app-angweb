import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { AdminPaymentsService, PAYMENT_QUEUE_PAGE_SIZE } from './admin-payments.service';

const BASE = 'https://bff.example.test';
// Opaque ids: the service passes them through untouched, only escaping them for the path.
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
    service: TestBed.inject(AdminPaymentsService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('AdminPaymentsService (A5, A5.2)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks the first page of a view with its status and the page size, without a cursor', async () => {
    const { service, http } = setup();

    const page = firstValueFrom(service.list('PENDING'));
    const req = http.expectOne((r) => r.url === `${BASE}/bff/admin/payments`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['limit', 'status']);
    expect(req.request.params.get('status')).toBe('PENDING');
    expect(req.request.params.get('limit')).toBe(String(PAYMENT_QUEUE_PAGE_SIZE));
    req.flush({ content: [], nextCursor: null });

    expect(await page).toEqual({ content: [], nextCursor: null });
  });

  it('passes the cursor of the previous page as it came, for the next one', async () => {
    const { service, http } = setup();

    const page = firstValueFrom(service.list('REJECTED', 'opaque+cursor/=='));
    const req = http.expectOne((r) => r.url === `${BASE}/bff/admin/payments`);
    expect(req.request.params.get('status')).toBe('REJECTED');
    expect(req.request.params.get('after')).toBe('opaque+cursor/==');
    expect(req.request.urlWithParams).toContain('after=opaque%2Bcursor/==');
    req.flush({ content: [], nextCursor: null });
    await page;
  });

  it('asks only one row when it looks for the oldest pending payment', async () => {
    const { service, http } = setup();

    const next = firstValueFrom(service.oldestPendingId());
    const req = http.expectOne((r) => r.url === `${BASE}/bff/admin/payments`);
    expect(req.request.params.get('status')).toBe('PENDING');
    expect(req.request.params.get('limit')).toBe('1');
    req.flush({ content: [{ id: 'pay_old' }], nextCursor: 'c' });

    expect(await next).toBe('pay_old');
  });

  it('answers null when no payment is waiting', async () => {
    const { service, http } = setup();

    const next = firstValueFrom(service.oldestPendingId());
    http
      .expectOne((r) => r.url === `${BASE}/bff/admin/payments`)
      .flush({
        content: [],
        nextCursor: null,
      });

    expect(await next).toBeNull();
  });

  it('reads the detail of a payment by its opaque id', async () => {
    const { service, http } = setup();

    const detail = firstValueFrom(service.get(ID));
    const req = http.expectOne(`${BASE}/bff/admin/payments/${ESCAPED_ID}`);
    expect(req.request.method).toBe('GET');
    req.flush({ id: ID });

    expect(await detail).toEqual({ id: ID });
  });

  it('approves with the verified amount of every proof', async () => {
    const { service, http } = setup();

    const done = firstValueFrom(
      service.approve(ID, [
        { id: 'p1', verifiedAmount: 300 },
        { id: 'p2', verifiedAmount: 0 },
      ]),
    );
    const req = http.expectOne(`${BASE}/bff/admin/payments/${ESCAPED_ID}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      status: 'APPROVED',
      proofs: [
        { id: 'p1', verifiedAmount: 300 },
        { id: 'p2', verifiedAmount: 0 },
      ],
    });
    req.flush({});
    await done;
  });

  it('rejects with the reason and nothing else', async () => {
    const { service, http } = setup();

    const done = firstValueFrom(service.reject(ID, 'No se lee el voucher'));
    const req = http.expectOne(`${BASE}/bff/admin/payments/${ESCAPED_ID}`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'REJECTED', reason: 'No se lee el voucher' });
    req.flush({});
    await done;
  });

  it('sends the whole set of proofs as a JSON part and the new files as multipart', async () => {
    const { service, http } = setup();
    const file = new File(['%PDF'], 'voucher.pdf', { type: 'application/pdf' });

    const done = firstValueFrom(
      service.correctProofs(
        ID,
        [
          { id: 'p1', kind: 'VOUCHER', amount: 200, method: 'Yape' },
          { kind: 'VOUCHER', amount: 150, fileIndex: 0 },
        ],
        [file],
      ),
    );
    const req = http.expectOne(`${BASE}/bff/admin/payments/${ESCAPED_ID}/proofs`);
    expect(req.request.method).toBe('PUT');
    const body = req.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    const proofs = body.get('proofs') as Blob;
    expect(proofs.type).toBe('application/json');
    expect(JSON.parse(await proofs.text())).toEqual([
      { id: 'p1', kind: 'VOUCHER', amount: 200, method: 'Yape' },
      { kind: 'VOUCHER', amount: 150, fileIndex: 0 },
    ]);
    const files = body.getAll('files') as File[];
    expect(files).toHaveLength(1);
    expect(files[0]?.name).toBe('voucher.pdf');
    req.flush({});
    await done;
  });

  it('sends no file part when only cash is added', async () => {
    const { service, http } = setup();

    const done = firstValueFrom(service.correctProofs(ID, [{ kind: 'CASH', amount: 50 }], []));
    const req = http.expectOne(`${BASE}/bff/admin/payments/${ESCAPED_ID}/proofs`);
    expect((req.request.body as FormData).getAll('files')).toEqual([]);
    req.flush({});
    await done;
  });
});
