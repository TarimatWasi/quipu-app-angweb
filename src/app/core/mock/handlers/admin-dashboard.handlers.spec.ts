import type { components } from '@core/api/bff.generated';
import type { Dashboard } from '../data/dashboard-views';
import { resetMockSettings, setUpMockBff } from '../mock-bff.testing';

type Schemas = components['schemas'];

afterEach(() => {
  resetMockSettings();
});

async function dashboard(scenario: 'normal' | 'empty' = 'normal') {
  const mock = setUpMockBff(scenario);
  await mock.signIn('admin');
  return { mock, answer: await mock.get<Dashboard>('/bff/admin/dashboard') };
}

describe('the home of the administrator in the simulated BFF (A1)', () => {
  it('counts the charges of the month by state, one per active contract and stay in force', async () => {
    const { answer } = await dashboard();

    const byState = (status: Schemas['PeriodStatus']['status']) =>
      answer.charges.filter((charge) => charge.status === status).length;
    expect(answer.charges.length).toBeGreaterThan(0);
    expect(answer.paymentsUpToDate).toBe(byState('PAID'));
    expect(answer.paymentsUnderReview).toBe(byState('UNDER_REVIEW'));
    expect(answer.paymentsPending).toBe(byState('UNPAID'));
    expect(answer.paymentsOverdue).toBe(byState('OVERDUE'));
    expect(new Set(answer.charges.map((charge) => charge.contractId ?? charge.stayId)).size).toBe(
      answer.charges.length,
    );
  });

  it('gives a charge the payment to open and says when it was rejected and not corrected', async () => {
    const { answer } = await dashboard();

    for (const charge of answer.charges) {
      if (charge.status === 'UNDER_REVIEW') expect(charge.paymentId).not.toBeNull();
      if (charge.paymentRejected) {
        expect(['UNPAID', 'OVERDUE']).toContain(charge.status);
        expect(charge.paymentId).not.toBeNull();
      }
    }
  });

  it('adds up what is overdue, oldest first, with at most three of them', async () => {
    const { answer } = await dashboard();

    const late = answer.charges
      .filter((charge) => charge.status === 'OVERDUE')
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    expect(answer.overdue.count).toBe(late.length);
    expect(answer.overdue.total).toBeCloseTo(
      late.reduce((sum, charge) => sum + charge.amount, 0),
      2,
    );
    expect(answer.overdue.first.map((ref) => ref.guestId)).toEqual(
      late.slice(0, 3).map((charge) => charge.guestId),
    );
  });

  it('keeps the vouchers to review as the queue of A5 reads them', async () => {
    const { mock, answer } = await dashboard();

    const queue = await mock.get<Schemas['PagedPaymentQueue']>('/bff/admin/payments', {
      status: 'PENDING',
    });
    expect(answer.pendingVouchersTotal).toBe(queue.content.length);
    expect(answer.pendingVouchers.map((item) => item.id)).toEqual(
      queue.content.map((item) => item.id),
    );
  });

  it('says who has not activated, an expired access first, and the contracts about to end', async () => {
    const { answer } = await dashboard();

    expect(answer.guestsNotActivated.count).toBeGreaterThan(0);
    if (answer.guestsNotActivated.expired > 0) {
      const first = answer.guestsNotActivated.first;
      expect(Date.parse(first?.accessExpiresAt ?? '')).toBeLessThanOrEqual(Date.now());
    }
    const { count, first } = answer.expiringContracts;
    expect(first === null).toBe(count === 0);
    if (first !== null) {
      const days = (Date.parse(first.endDate) - Date.now()) / 86_400_000;
      expect(days).toBeLessThanOrEqual(31);
    }
  });

  it('answers a residence without contracts nor payments with nothing: the first use', async () => {
    const { answer } = await dashboard('empty');

    expect(answer.charges).toEqual([]);
    expect(answer.pendingVouchersTotal).toBe(0);
    expect(answer.overdue).toEqual({ count: 0, total: 0, first: [] });
    expect(answer.rejected).toEqual({ count: 0, oldest: null });
    expect(answer.expiringContracts).toEqual({ count: 0, first: null });
  });

  it('is for the administration only', async () => {
    const mock = setUpMockBff();
    await mock.signIn('contract-guest');

    expect((await mock.fail(mock.get('/bff/admin/dashboard'))).status).toBe(403);
  });
});
