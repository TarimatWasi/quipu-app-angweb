import type { components } from '@core/api/bff.generated';
import { addDays, addMonths, today } from '../data/mock-dates';
import { ID_KIND, mockId } from '../data/mock-db';
import { GUEST_IDS } from '../data/demo-users';
import { STAY_IDS } from '../data/seed-payments';
import {
  catalogOf,
  proofsForm,
  resetMockSettings,
  setUpMockBff,
  SOME_TEXT,
  voucherFile,
} from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];

async function signedIn(key: 'contract-guest' | 'temporary-guest'): Promise<MockHarness> {
  const mock = setUpMockBff();
  await mock.signIn(key);
  return mock;
}

const lastMonth = () => addMonths(today(), -1);

describe('guest with a contract in the simulated BFF', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('answers the account status month by month, the rejected one with its reason', async () => {
    const mock = await signedIn('contract-guest');
    const periods = await mock.get<Schemas['PeriodStatus'][]>('/bff/guest/account-status');
    expect(periods.map((period) => period.period)).toEqual(
      [4, 3, 2, 1, 0].map((ago) => addMonths(today(), -ago)),
    );
    expect(periods.slice(0, 3).every((period) => period.status === 'PAID')).toBe(true);
    const rejected = periods[3];
    expect(['UNPAID', 'OVERDUE']).toContain(rejected?.status);
    expect(rejected?.rejectionReason).toBe('El voucher no se lee; vuelve a subirlo con mejor luz.');
    expect(periods[4]?.status).toBe('UNDER_REVIEW');
  });

  it('answers the credit with the last refund, and the history with payments and refunds', async () => {
    const mock = await signedIn('contract-guest');
    const credit = await mock.get<Schemas['GuestCredit']>('/bff/guest/credit');
    expect(credit.balance).toBe(0);
    expect(credit.toRefund).toBe(false);
    expect(credit.lastRefund).toEqual({ amount: 120, method: 'Yape', date: addDays(today(), -25) });
    const history = await mock.get<Schemas['PagedGuestHistory']>('/bff/guest/payments', {
      limit: 100,
    });
    expect(history.content.filter((item) => item.kind === 'REFUND')).toHaveLength(1);
    expect(history.content.filter((item) => item.kind === 'PAYMENT')).toHaveLength(5);
    const sent = history.content.map(
      (item) => item.payment?.submittedAt ?? `${item.refund?.date ?? ''}T23:59:59Z`,
    );
    expect(sent).toEqual([...sent].sort((a, b) => b.localeCompare(a)));
  });

  it('corrects a rejected payment, which goes back to review and to the queue', async () => {
    const mock = await signedIn('contract-guest');
    const periods = await mock.get<Schemas['PeriodStatus'][]>('/bff/guest/account-status');
    const id = periods.find((period) => period.period === lastMonth())?.paymentId ?? '';
    const before = await mock.get<Schemas['GuestPayment']>(`/bff/guest/payments/${id}`);
    expect(before.status).toBe('REJECTED');
    const body = proofsForm(
      [{ kind: 'VOUCHER', amount: 750, method: 'Yape', fileIndex: 0 }],
      [voucherFile()],
    );
    const summary = await mock.send<Schemas['PaymentSummary']>(
      'PUT',
      `/bff/guest/payments/${id}`,
      body,
    );
    expect(summary.status).toBe('PENDING');
    const after = await mock.get<Schemas['PeriodStatus'][]>('/bff/guest/account-status');
    expect(after.find((period) => period.period === lastMonth())?.status).toBe('UNDER_REVIEW');
    const again = await mock.fail(mock.send('PUT', `/bff/guest/payments/${id}`, body));
    expect(catalogOf(again)).toEqual({ code: 'PAYMENT_NOT_CORRECTABLE', message: SOME_TEXT });
    await mock.signIn('admin');
    const queue = await mock.get<Schemas['PagedPaymentQueue']>('/bff/admin/payments', {
      status: 'PENDING',
    });
    expect(queue.content.map((item) => item.id)).toContain(id);
  });

  it('refuses a second payment for a month that already has one', async () => {
    const mock = await signedIn('contract-guest');
    const body = proofsForm([{ kind: 'CASH', amount: 750 }], [], { period: lastMonth() });
    const error = await mock.fail(mock.send('POST', '/bff/guest/payments', body));
    expect(error.status).toBe(409);
    expect(catalogOf(error)).toEqual({ code: 'VOUCHER_ALREADY_EXISTS', message: SOME_TEXT });
    const future = proofsForm([{ kind: 'CASH', amount: 750 }], [], {
      period: addMonths(today(), 2),
    });
    expect((await mock.fail(mock.send('POST', '/bff/guest/payments', future))).error).toEqual(
      expect.objectContaining({ code: 'VALIDATION_ERROR', field: 'period' }),
    );
  });

  it('sends the payment of a free month, which shows as under review', async () => {
    const mock = setUpMockBff();
    await mock.signIn('temporary-password');
    await mock.send('POST', '/bff/auth/change-password', { newPassword: 'nueva-clave-1' });
    const period = today().slice(0, 7);
    const body = proofsForm(
      [{ kind: 'VOUCHER', amount: 680, fileIndex: 0 }],
      [voucherFile('pago.pdf', 'application/pdf')],
      { period },
    );
    const summary = await mock.send<Schemas['PaymentSummary']>('POST', '/bff/guest/payments', body);
    expect(summary).toEqual(
      expect.objectContaining({ status: 'PENDING', period, amount: 680, voucherCount: 1 }),
    );
    const periods = await mock.get<Schemas['PeriodStatus'][]>('/bff/guest/account-status');
    expect(periods.find((item) => item.period === period)).toEqual(
      expect.objectContaining({ status: 'UNDER_REVIEW', paymentId: summary.id }),
    );
  });

  it('never shows the payment of another guest (RN-09)', async () => {
    const mock = await signedIn('contract-guest');
    const someoneElse = mockId(ID_KIND.payment, 13);
    expect((await mock.fail(mock.get(`/bff/guest/payments/${someoneElse}`))).status).toBe(404);
  });
});

describe('temporary guest in the simulated BFF', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('answers the stay in force with its payment under review', async () => {
    const mock = await signedIn('temporary-guest');
    const status = await mock.get<Schemas['StayPaymentStatus']>(
      '/bff/temporary-guest/payment-status',
    );
    expect(status).toEqual(
      expect.objectContaining({
        stayId: STAY_IDS.anaCurrent,
        status: 'UNDER_REVIEW',
        agreedAmount: 480,
      }),
    );
    const payment = await mock.get<Schemas['GuestPayment']>(
      `/bff/temporary-guest/payments/${status.paymentId ?? ''}`,
    );
    expect(payment.stayId).toBe(STAY_IDS.anaCurrent);
    expect(payment.proofs[0]).not.toHaveProperty('fileUrl');
    const twice = await mock.fail(
      mock.send(
        'POST',
        '/bff/temporary-guest/payments',
        proofsForm([{ kind: 'CASH', amount: 480 }]),
      ),
    );
    expect(catalogOf(twice)).toEqual({ code: 'VOUCHER_ALREADY_EXISTS', message: SOME_TEXT });
  });

  it('corrects a payment rejected by the administration', async () => {
    const mock = await signedIn('temporary-guest');
    const status = await mock.get<Schemas['StayPaymentStatus']>(
      '/bff/temporary-guest/payment-status',
    );
    const id = status.paymentId ?? '';
    const pending = await mock.fail(
      mock.send(
        'PUT',
        `/bff/temporary-guest/payments/${id}`,
        proofsForm([{ kind: 'CASH', amount: 480 }]),
      ),
    );
    expect(catalogOf(pending)).toEqual({ code: 'PAYMENT_NOT_CORRECTABLE', message: SOME_TEXT });
    await mock.signIn('admin');
    await mock.send('PATCH', `/bff/admin/payments/${id}`, {
      status: 'REJECTED',
      reason: 'Falta el número de operación',
    });
    await mock.signIn('temporary-guest');
    const rejected = await mock.get<Schemas['StayPaymentStatus']>(
      '/bff/temporary-guest/payment-status',
    );
    expect(rejected.rejectionReason).toBe('Falta el número de operación');
    await mock.send(
      'PUT',
      `/bff/temporary-guest/payments/${id}`,
      proofsForm([{ kind: 'CASH', amount: 480 }]),
    );
    const again = await mock.get<Schemas['StayPaymentStatus']>(
      '/bff/temporary-guest/payment-status',
    );
    expect(again).toEqual(
      expect.objectContaining({ status: 'UNDER_REVIEW', rejectionReason: null }),
    );
  });
});

describe('credit of the guest in the simulated BFF (RN-38)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  /** Approves the pending payment of María for last month with `extra` soles over what is due. */
  async function approveMariaWithSurplus(extra: number): Promise<MockHarness> {
    const mock = setUpMockBff();
    await mock.signIn('admin');
    const queue = await mock.get<Schemas['PagedPaymentQueue']>('/bff/admin/payments', {
      status: 'PENDING',
    });
    const item = queue.content.find((row) => row.documentNumber === '70000003');
    const detail = await mock.get<Schemas['Payment']>(`/bff/admin/payments/${item?.id ?? ''}`);
    await mock.send('PATCH', `/bff/admin/payments/${detail.id}`, {
      status: 'APPROVED',
      proofs: detail.proofs.map((proof) => ({
        id: proof.id,
        verifiedAmount: proof.declaredAmount + extra,
      })),
    });
    await mock.signIn('temporary-password');
    await mock.send('POST', '/bff/auth/change-password', { newPassword: 'nueva-clave-1' });
    return mock;
  }

  const currentPeriod = () => today().slice(0, 7);

  it('discounts the credit from the next period and the payment keeps it', async () => {
    const mock = await approveMariaWithSurplus(30);
    const periods = await mock.get<Schemas['PeriodStatus'][]>('/bff/guest/account-status');
    expect(periods.find((item) => item.period === currentPeriod())).toEqual(
      expect.objectContaining({ status: 'UNPAID', amount: 680, creditApplied: 30, amountDue: 650 }),
    );
    const credit = await mock.get<Schemas['GuestCredit']>('/bff/guest/credit');
    expect(credit.balance).toBe(0);
    expect(credit.origins).toEqual([]);
    const body = proofsForm([{ kind: 'CASH', amount: 650 }], [], { period: currentPeriod() });
    const summary = await mock.send<Schemas['PaymentSummary']>('POST', '/bff/guest/payments', body);
    await mock.signIn('admin');
    const detail = await mock.get<Schemas['Payment']>(`/bff/admin/payments/${summary.id}`);
    expect(detail).toEqual(expect.objectContaining({ creditApplied: 30, amountDue: 650 }));
    expect(mock.bff.db.credit(detail.guestId).balance).toBe(0);
  });

  it('marks a period the credit covers whole as paid, without a payment', async () => {
    const mock = await approveMariaWithSurplus(700);
    const periods = await mock.get<Schemas['PeriodStatus'][]>('/bff/guest/account-status');
    expect(periods.find((item) => item.period === currentPeriod())).toEqual(
      expect.objectContaining({
        status: 'PAID',
        creditApplied: 680,
        amountDue: 0,
        paymentId: null,
      }),
    );
    const credit = await mock.get<Schemas['GuestCredit']>('/bff/guest/credit');
    expect(credit.balance).toBe(20);
    const source = mock.bff.db.data.payments.find((p) => p.surplus?.outcome === 'CREDIT');
    expect(source?.period).toBe(lastMonth());
    expect(credit.origins).toEqual([{ paymentId: source?.id, period: lastMonth(), amount: 20 }]);
    const body = proofsForm([{ kind: 'CASH', amount: 680 }], [], { period: currentPeriod() });
    const error = await mock.fail(mock.send('POST', '/bff/guest/payments', body));
    expect(catalogOf(error)).toEqual({
      code: 'PAYMENT_ALREADY_EXISTS_FOR_PERIOD',
      message: SOME_TEXT,
    });
  });
});

describe('origins of the credit in the simulated BFF (TAR-284)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  const sum = (origins: Schemas['GuestCredit']['origins']) =>
    Math.round(origins.reduce((total, origin) => total + origin.amount, 0) * 100) / 100;

  it('lists what is left of each payment that left credit, oldest taken first', async () => {
    const mock = await signedIn('contract-guest');
    const { db } = mock.bff;
    const approved = db.data.payments
      .filter((p) => p.guestId === GUEST_IDS.luis && p.status === 'APPROVED' && p.period !== null)
      .sort((a, b) => (a.period ?? '').localeCompare(b.period ?? ''));
    const [oldest, newer, newest] = approved;
    if (!oldest || !newer || !newest) throw new Error('the seed needs three approved months');
    // Kept newest first, so the ledger has to order them by period itself.
    db.data.payments.reverse();
    newest.surplus = { amount: 25, outcome: 'CREDIT' };
    newer.surplus = { amount: 50, outcome: 'CREDIT' };
    oldest.surplus = { amount: 40, outcome: 'CREDIT' };
    // 20 of the 115 were already sent with a payment: they come out of the oldest one.
    db.credit(GUEST_IDS.luis).balance = 95;

    const credit = await mock.get<Schemas['GuestCredit']>('/bff/guest/credit');
    expect(credit.balance).toBe(95);
    expect(credit.origins).toEqual([
      { paymentId: oldest.id, period: oldest.period, amount: 20 },
      { paymentId: newer.id, period: newer.period, amount: 50 },
      { paymentId: newest.id, period: newest.period, amount: 25 },
    ]);
    expect(sum(credit.origins)).toBe(credit.balance);
  });

  it('drops a payment whose credit was used whole', async () => {
    const mock = await signedIn('contract-guest');
    const { db } = mock.bff;
    const approved = db.data.payments
      .filter((p) => p.guestId === GUEST_IDS.luis && p.status === 'APPROVED' && p.period !== null)
      .sort((a, b) => (a.period ?? '').localeCompare(b.period ?? ''));
    const [oldest, newer] = approved;
    if (!oldest || !newer) throw new Error('the seed needs two approved months');
    oldest.surplus = { amount: 40, outcome: 'CREDIT' };
    newer.surplus = { amount: 50, outcome: 'CREDIT' };
    db.credit(GUEST_IDS.luis).balance = 35.5;

    const credit = await mock.get<Schemas['GuestCredit']>('/bff/guest/credit');
    expect(credit.origins).toEqual([{ paymentId: newer.id, period: newer.period, amount: 35.5 }]);
    expect(sum(credit.origins)).toBe(credit.balance);
  });

  it('answers no origins in the empty scenario', async () => {
    const mock = setUpMockBff('empty');
    await mock.signIn('contract-guest');
    const credit = await mock.get<Schemas['GuestCredit']>('/bff/guest/credit');
    expect(credit).toEqual(expect.objectContaining({ balance: 0, origins: [] }));
  });
});
