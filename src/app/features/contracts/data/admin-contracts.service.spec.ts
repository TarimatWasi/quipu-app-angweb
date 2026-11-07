import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { contractOf } from '../model/contract.testing';
import type { NewContract } from '../model/contract-form';
import { AdminContractsService, contractBody } from './admin-contracts.service';
import { ContractOptionsService } from './contract-options.service';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: '' },
    ],
  });
  return {
    contracts: TestBed.inject(AdminContractsService),
    options: TestBed.inject(ContractOptionsService),
    http: TestBed.inject(HttpTestingController),
  };
}

const NEW: NewContract = {
  file: new File(['pdf'], 'contrato.pdf', { type: 'application/pdf' }),
  environmentId: 'e1',
  guestId: 'g1',
  monthlyAmount: 650.5,
  paymentDay: 5,
  graceDays: 3,
  startDate: '2026-11-01',
  endDate: '2027-10-31',
};

describe('AdminContractsService (A4)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks a page of the contracts of a state with the cursor as the BFF gave it', async () => {
    const { contracts, http } = setup();

    const done = firstValueFrom(contracts.list('EXPIRED', 'c/2'));
    const req = http.expectOne((r) => r.url === '/bff/admin/contracts');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('status')).toBe('EXPIRED');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('after')).toBe('c/2');
    req.flush({ content: [], nextCursor: null });

    await expect(done).resolves.toEqual({ content: [], nextCursor: null });
  });

  it('leaves the cursor out of the first page', async () => {
    const { contracts, http } = setup();

    const done = firstValueFrom(contracts.list('ACTIVE'));
    const req = http.expectOne((r) => r.url === '/bff/admin/contracts');
    expect(req.request.params.has('after')).toBe(false);
    req.flush({ content: [], nextCursor: null });
    await done;
  });

  it('asks for the contracts about to end, the most the BFF gives in a page', async () => {
    const { contracts, http } = setup();

    const done = firstValueFrom(contracts.expiringSoon());
    const req = http.expectOne((r) => r.url === '/bff/admin/contracts');
    expect(req.request.params.get('expiringSoon')).toBe('true');
    expect(req.request.params.get('limit')).toBe('100');
    expect(req.request.params.has('status')).toBe(false);
    req.flush({ content: [], nextCursor: null });
    await done;
  });

  it('reads one contract with its id escaped', async () => {
    const { contracts, http } = setup();

    const done = firstValueFrom(contracts.get('c/1?x'));
    const req = http.expectOne('/bff/admin/contracts/c%2F1%3Fx');
    expect(req.request.method).toBe('GET');
    req.flush(contractOf());

    await expect(done).resolves.toEqual(contractOf());
  });

  it('loads a contract with a multipart POST: the PDF and the fields as text', async () => {
    const { contracts, http } = setup();

    const done = firstValueFrom(contracts.create(NEW));
    const req = http.expectOne('/bff/admin/contracts');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect([...body.keys()].sort()).toEqual([
      'endDate',
      'environmentId',
      'file',
      'graceDays',
      'guestId',
      'monthlyAmount',
      'paymentDay',
      'startDate',
    ]);
    expect((body.get('file') as File).name).toBe('contrato.pdf');
    expect(body.get('monthlyAmount')).toBe('650.5');
    req.flush(contractOf());

    await expect(done).resolves.toEqual(contractOf());
  });

  it('finalizes with a POST without a body', async () => {
    const { contracts, http } = setup();

    const done = firstValueFrom(contracts.terminate('c/1'), { defaultValue: null });
    const req = http.expectOne('/bff/admin/contracts/c%2F1/terminate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    req.flush(null, { status: 204, statusText: 'No Content' });

    await expect(done).resolves.toBeNull();
  });
});

describe('the form of a new contract', () => {
  it('leaves the end date out of the form when the contract has none', () => {
    const body = contractBody({ ...NEW, endDate: null });

    expect(body.has('endDate')).toBe(false);
    expect(body.get('startDate')).toBe('2026-11-01');
  });
});

describe('ContractOptionsService (A4.1)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks the active guests of contract type that have no contract in force', async () => {
    const { options, http } = setup();

    const done = firstValueFrom(options.guests());
    const req = http.expectOne((r) => r.url === '/bff/admin/guests');
    expect(req.request.params.get('type')).toBe('CONTRACT');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    expect(req.request.params.get('withoutContract')).toBe('true');
    expect(req.request.params.get('limit')).toBe('100');
    req.flush({ content: [{ id: 'g1' }], nextCursor: null });

    await expect(done).resolves.toEqual([{ id: 'g1' }]);
  });

  it('reads the guest it comes from with its id escaped', async () => {
    const { options, http } = setup();

    const done = firstValueFrom(options.guest('g/1'));
    http.expectOne('/bff/admin/guests/g%2F1').flush({ id: 'g/1' });

    await expect(done).resolves.toEqual({ id: 'g/1' });
  });

  it('asks the active environments', async () => {
    const { options, http } = setup();

    const done = firstValueFrom(options.environments());
    const req = http.expectOne((r) => r.url === '/bff/admin/environments');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush({ content: [{ id: 'e1' }], nextCursor: null, freeCount: 1 });

    await expect(done).resolves.toEqual([{ id: 'e1' }]);
  });
});
