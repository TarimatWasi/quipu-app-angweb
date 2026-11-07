import type { components, operations } from '@core/api/bff.generated';
import { GUEST_IDS } from '../data/demo-users';
import { addDays, addMonths, today } from '../data/mock-dates';
import { CASE_GUEST_IDS } from '../data/seed-contract-cases';
import { EXPENSE_IDS, FINE_IDS } from '../data/seed-finance';
import { catalogOf, resetMockSettings, setUpMockBff, SOME_TEXT } from '../mock-bff.testing';
import type { MockHarness } from '../mock-bff.testing';

type Schemas = components['schemas'];
type Summary = operations['getFinanceSummary']['responses'][200]['content']['application/json'];

const MONTH = today().slice(0, 7);
const LAST = addMonths(today(), -1);

async function admin(scenario: 'normal' | 'conflict' = 'normal'): Promise<MockHarness> {
  const mock = setUpMockBff(scenario);
  await mock.signIn('admin');
  return mock;
}

const summary = (mock: MockHarness, month = MONTH) =>
  mock.get<Summary>('/bff/admin/finance', { month });
const expenses = (mock: MockHarness, month = MONTH, query: Record<string, string | number> = {}) =>
  mock.get<Schemas['PagedExpenses']>('/bff/admin/expenses', { month, ...query });
const credits = (mock: MockHarness) =>
  mock.get<Schemas['PendingCredit'][]>('/bff/admin/credits', { pending: 'true' });

describe('the finance of the administrator in the simulated BFF (A6)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('gives the balance of a month: payments and fines less refunds, and less the expenses', async () => {
    const mock = await admin();

    const month = await summary(mock);

    expect(month.incomeFromPayments).toBeGreaterThan(0);
    expect(month.finesCount).toBe(2);
    expect(month.incomeFromFines).toBe(60);
    expect(month.expensesCount).toBe(5);
    expect(month.totalExpenses).toBe(1165.5);
    expect(month.totalIncome).toBeCloseTo(
      month.incomeFromPayments + month.incomeFromFines - month.refundsTotal,
      2,
    );
    expect(month.net).toBeCloseTo(month.totalIncome - month.totalExpenses, 2);
    const empty = await summary(mock, '2020-01');
    expect(empty).toEqual(expect.objectContaining({ totalIncome: 0, totalExpenses: 0, net: 0 }));
  });

  it('refuses a month that is missing or badly written', async () => {
    const mock = await admin();
    for (const month of ['2026-13', '0000-01', 'octubre']) {
      const error = await mock.fail(mock.get('/bff/admin/finance', { month }));
      expect(catalogOf(error)).toEqual({
        code: 'VALIDATION_ERROR',
        message: SOME_TEXT,
        field: 'month',
      });
    }
    expect((await mock.fail(mock.get('/bff/admin/expenses'))).status).toBe(400);
  });

  it('lists the expenses of a month with how many there are, page by page', async () => {
    const mock = await admin();

    const first = await expenses(mock, MONTH, { limit: 2 });

    expect(first.content).toHaveLength(2);
    expect(first.totalCount).toBe(5);
    expect(first.nextCursor).not.toBeNull();
    expect((await expenses(mock, LAST)).totalCount).toBe(3);
  });

  it('creates an expense, which counts in the balance, and refuses an amount that is not valid', async () => {
    const mock = await admin();
    const before = await summary(mock);

    const created = await mock.send<Schemas['Expense']>('POST', '/bff/admin/expenses', {
      category: 'MAINTENANCE',
      amount: 85,
      month: MONTH,
      description: ' Cambio de chapa ',
    });

    expect(created).toEqual(
      expect.objectContaining({
        category: 'MAINTENANCE',
        amount: 85,
        version: 1,
        description: 'Cambio de chapa',
      }),
    );
    expect((await summary(mock)).totalExpenses).toBe(before.totalExpenses + 85);
    for (const amount of [0, -5, 10.555]) {
      const error = await mock.fail(
        mock.send('POST', '/bff/admin/expenses', { category: 'UTILITIES', amount, month: MONTH }),
      );
      expect(catalogOf(error)).toEqual({
        code: 'EXPENSE_INVALID_AMOUNT',
        message: SOME_TEXT,
        field: 'amount',
      });
    }
    const category = await mock.fail(
      mock.send('POST', '/bff/admin/expenses', { category: 'OTRA', amount: 5, month: MONTH }),
    );
    expect(catalogOf(category)).toEqual(expect.objectContaining({ field: 'category' }));
  });

  it('edits an expense with its version and answers 409 to a stale one', async () => {
    const mock = await admin();
    const url = `/bff/admin/expenses/${EXPENSE_IDS.water}`;

    const updated = await mock.send<Schemas['Expense']>('PATCH', url, {
      version: 1,
      category: 'UTILITIES',
      amount: 200,
      month: MONTH,
    });

    expect(updated).toEqual(expect.objectContaining({ amount: 200, version: 2 }));
    expect(updated.description).toBeUndefined();
    const stale = await mock.fail(
      mock.send('PATCH', url, { version: 1, category: 'UTILITIES', amount: 210, month: MONTH }),
    );
    expect(stale.status).toBe(409);
    expect(stale.error).toEqual(expect.objectContaining({ code: 'CONCURRENT_MODIFICATION' }));
    expect(
      (await mock.fail(mock.send('PATCH', url, { category: 'UTILITIES', amount: 1, month: MONTH })))
        .status,
    ).toBe(400);
  });

  it('answers 409 to the edit of an expense in «Conflicto 409»', async () => {
    const mock = await admin('conflict');

    const error = await mock.fail(
      mock.send('PATCH', `/bff/admin/expenses/${EXPENSE_IDS.light}`, {
        version: 1,
        category: 'UTILITIES',
        amount: 1,
        month: MONTH,
      }),
    );

    expect(error.status).toBe(409);
  });

  it('deletes an expense and answers 404 to the next try', async () => {
    const mock = await admin();
    const url = `/bff/admin/expenses/${EXPENSE_IDS.internet}`;

    await mock.send('DELETE', url, null);

    expect((await expenses(mock)).totalCount).toBe(4);
    expect((await mock.fail(mock.send('DELETE', url, null))).status).toBe(404);
  });

  it('lists the fines with who they went to and charges one to a guest that is inactive', async () => {
    const mock = await admin();
    const fines = await mock.get<Schemas['Fine'][]>('/bff/admin/fines', { month: MONTH });
    expect(fines.map((fine) => fine.id)).toEqual([FINE_IDS.noise, FINE_IDS.key]);
    expect(fines[0]).toEqual(
      expect.objectContaining({
        guestName: 'Luis Alberto Huamán Ccori',
        environmentCode: '201',
        description: 'Ruido después de las 23:00',
      }),
    );
    expect(fines[1]?.description).toBeUndefined();

    const created = await mock.send<Schemas['Fine']>('POST', '/bff/admin/fines', {
      guestId: GUEST_IDS.pedro,
      amount: 45.5,
      month: MONTH,
    });

    expect(created).toEqual(expect.objectContaining({ amount: 45.5, guestId: GUEST_IDS.pedro }));
    expect((await summary(mock)).incomeFromFines).toBe(105.5);
  });

  it('refuses a fine of a guest that does not exist or with an amount that is not valid, and deletes one', async () => {
    const mock = await admin();
    const gone = await mock.fail(
      mock.send('POST', '/bff/admin/fines', { guestId: 'nadie', amount: 10, month: MONTH }),
    );
    expect(gone.status).toBe(404);
    const amount = await mock.fail(
      mock.send('POST', '/bff/admin/fines', { guestId: GUEST_IDS.luis, amount: 0, month: MONTH }),
    );
    expect(catalogOf(amount)).toEqual(expect.objectContaining({ field: 'amount' }));

    await mock.send('DELETE', `/bff/admin/fines/${FINE_IDS.key}`, null);

    expect((await summary(mock)).finesCount).toBe(1);
    expect(
      (await mock.fail(mock.send('DELETE', `/bff/admin/fines/${FINE_IDS.key}`, null))).status,
    ).toBe(404);
  });

  it('lists the credit that has no month left, the oldest first, with where it came from', async () => {
    const mock = await admin();

    const pending = await credits(mock);

    expect(pending.map((credit) => credit.guestId).sort()).toEqual(
      [CASE_GUEST_IDS.expired, GUEST_IDS.ana].sort(),
    );
    const contract = pending.find((credit) => credit.guestId === CASE_GUEST_IDS.expired);
    expect(contract).toEqual(
      expect.objectContaining({ amount: 50, guestType: 'CONTRACT', environmentCode: '207' }),
    );
    expect(contract?.origin.contractEndedOn).not.toBeNull();
    const stay = pending.find((credit) => credit.guestId === GUEST_IDS.ana);
    expect(stay).toEqual(expect.objectContaining({ amount: 35, guestType: 'TEMPORARY' }));
    expect(stay?.origin.stayStartDate).not.toBeNull();
    expect((await mock.fail(mock.get('/bff/admin/credits'))).status).toBe(400);
  });

  it('registers a partial refund: the rest stays pending and the balance of its month goes down', async () => {
    const mock = await admin();
    const before = await summary(mock);

    const refund = await mock.send<Schemas['Refund']>('POST', '/bff/admin/refunds', {
      guestId: CASE_GUEST_IDS.expired,
      amount: 20,
      date: today(),
      method: ' Yape ',
      note: 'Operación 123',
    });

    expect(refund).toEqual(
      expect.objectContaining({ amount: 20, method: 'Yape', note: 'Operación 123' }),
    );
    const left = (await credits(mock)).find((credit) => credit.guestId === CASE_GUEST_IDS.expired);
    expect(left?.amount).toBe(30);
    const after = await summary(mock);
    expect(after.refundsTotal).toBe(before.refundsTotal + 20);
    expect(after.totalIncome).toBeCloseTo(before.totalIncome - 20, 2);
    const page = await mock.get<Schemas['PagedRefunds']>('/bff/admin/refunds', { month: MONTH });
    expect(page.content[0]?.id).toBe(refund.id);
    expect(page.totalCount).toBe(1 + (before.refundsCount - 0));
  });

  it('closes the credit when all of it is refunded, with the date in the month it counts in', async () => {
    const mock = await admin();
    const date = addDays(today(), -35);

    await mock.send('POST', '/bff/admin/refunds', {
      guestId: GUEST_IDS.ana,
      amount: 35,
      date,
      method: 'Efectivo',
    });

    expect((await credits(mock)).map((credit) => credit.guestId)).toEqual([CASE_GUEST_IDS.expired]);
    expect((await summary(mock, date.slice(0, 7))).refundsTotal).toBeGreaterThanOrEqual(35);
  });

  it('refuses a refund of more than the credit, in the future, without a method or without credit', async () => {
    const mock = await admin();
    const send = (fields: Record<string, unknown>) =>
      mock.fail(
        mock.send('POST', '/bff/admin/refunds', {
          guestId: CASE_GUEST_IDS.expired,
          amount: 10,
          date: today(),
          method: 'Yape',
          ...fields,
        }),
      );

    for (const [fields, field] of [
      [{ amount: 80 }, 'amount'],
      [{ amount: 0 }, 'amount'],
      [{ date: addDays(today(), 1) }, 'date'],
      [{ method: '  ' }, 'method'],
      [{ guestId: GUEST_IDS.luis }, 'guestId'],
    ] as const) {
      expect(catalogOf(await send(fields))).toEqual({
        code: 'VALIDATION_ERROR',
        message: SOME_TEXT,
        field,
      });
    }
    expect((await send({ guestId: 'nadie' })).status).toBe(404);
  });
});
