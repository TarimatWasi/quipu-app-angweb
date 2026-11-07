import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { expenseOf } from '../model/finance.testing';
import { AdminFinanceService } from './admin-finance.service';

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: BFF_BASE_URL, useValue: '' },
    ],
  });
  return {
    service: TestBed.inject(AdminFinanceService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('AdminFinanceService (A6)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks the balance of a month', async () => {
    const { service, http } = setup();

    const done = firstValueFrom(service.summary('2026-10'));
    const req = http.expectOne((r) => r.url === '/bff/admin/finance');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('month')).toBe('2026-10');
    req.flush({ month: '2026-10' });

    await expect(done).resolves.toEqual({ month: '2026-10' });
  });

  it('asks a page of the expenses or of the refunds of a month with the cursor as the BFF gave it', async () => {
    const { service, http } = setup();

    const expenses = firstValueFrom(service.expenses('2026-10', 'c/2'));
    const first = http.expectOne((r) => r.url === '/bff/admin/expenses');
    expect(first.request.params.get('month')).toBe('2026-10');
    expect(first.request.params.get('limit')).toBe('20');
    expect(first.request.params.get('after')).toBe('c/2');
    first.flush({ content: [], nextCursor: null, totalCount: 0 });
    await expenses;

    const refunds = firstValueFrom(service.refunds('2026-10'));
    const second = http.expectOne((r) => r.url === '/bff/admin/refunds');
    expect(second.request.params.has('after')).toBe(false);
    second.flush({ content: [], nextCursor: null, totalCount: 0 });
    await refunds;
  });

  it('asks the fines of a month, without a page, and the credit that is pending', async () => {
    const { service, http } = setup();

    const fines = firstValueFrom(service.fines('2026-10'));
    const fine = http.expectOne((r) => r.url === '/bff/admin/fines');
    expect(fine.request.params.get('month')).toBe('2026-10');
    expect(fine.request.params.has('limit')).toBe(false);
    fine.flush([]);
    await fines;

    const credits = firstValueFrom(service.pendingCredits());
    const credit = http.expectOne((r) => r.url === '/bff/admin/credits');
    expect(credit.request.params.get('pending')).toBe('true');
    credit.flush([]);
    await credits;
  });

  it('asks every guest, active or not, for the fines', async () => {
    const { service, http } = setup();

    const done = firstValueFrom(service.guests());
    const req = http.expectOne((r) => r.url === '/bff/admin/guests');
    expect(req.request.params.get('status')).toBe('ALL');
    expect(req.request.params.get('limit')).toBe('100');
    req.flush({ content: [{ id: 'g1' }], nextCursor: null });

    await expect(done).resolves.toEqual([{ id: 'g1' }]);
  });

  it('creates and edits an expense; an edit carries the version that was loaded', async () => {
    const { service, http } = setup();
    const input = { category: 'UTILITIES', amount: 10, month: '2026-10' } as const;

    const created = firstValueFrom(service.createExpense(input));
    const post = http.expectOne('/bff/admin/expenses');
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual(input);
    post.flush(expenseOf());
    await created;

    const updated = firstValueFrom(service.updateExpense('x/1', input, 3));
    const patch = http.expectOne('/bff/admin/expenses/x%2F1');
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ ...input, version: 3 });
    patch.flush(expenseOf());
    await updated;
  });

  it('deletes an expense and a fine with the id escaped', async () => {
    const { service, http } = setup();

    const expense = firstValueFrom(service.deleteExpense('x/1'), { defaultValue: null });
    const first = http.expectOne('/bff/admin/expenses/x%2F1');
    expect(first.request.method).toBe('DELETE');
    first.flush(null, { status: 204, statusText: 'No Content' });
    await expense;

    const fine = firstValueFrom(service.deleteFine('f/1'), { defaultValue: null });
    const second = http.expectOne('/bff/admin/fines/f%2F1');
    expect(second.request.method).toBe('DELETE');
    second.flush(null, { status: 204, statusText: 'No Content' });
    await fine;
  });

  it('registers a fine and a refund', async () => {
    const { service, http } = setup();

    const fine = firstValueFrom(
      service.createFine({ guestId: 'g1', amount: 30, month: '2026-10' }),
    );
    http.expectOne('/bff/admin/fines').flush({ id: 'f1' });
    await fine;

    const refund = firstValueFrom(
      service.createRefund({ guestId: 'g1', amount: 20, date: '2026-10-29', method: 'Yape' }),
    );
    const req = http.expectOne('/bff/admin/refunds');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({
      guestId: 'g1',
      amount: 20,
      date: '2026-10-29',
      method: 'Yape',
    });
    req.flush({ id: 'r1' });
    await refund;
  });
});
