import type { components } from '@core/api/bff.generated';
import { financeSummary, fineView, pendingCredits, refundView } from '../data/finance-views';
import { today } from '../data/mock-dates';
import { ID_KIND } from '../data/mock-db';
import type { ExpenseRecord, FineRecord, MockDb, RefundRecord } from '../data/mock-db';
import {
  invalid,
  noContent,
  notFound,
  ok,
  paginate,
  raise,
  raiseConcurrentModification,
} from '../mock-reply';
import type { MockRequest, MockRoute } from '../mock-types';

type Schemas = components['schemas'];

const CATEGORIES = new Set<unknown>([
  'UTILITIES',
  'MAINTENANCE',
  'CLEANING_SUPPLIES',
  'TAXES_FEES',
]);
const MONTH = /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_NOTE = 500;
const MAX_METHOD = 50;

function bodyOf(req: MockRequest): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null
    ? (req.body as Record<string, unknown>)
    : {};
}

/** The `month` of a list or of the balance: required, yyyy-mm (VALIDATION_ERROR on `month`). */
function monthOf(req: MockRequest): string {
  const month = req.query.get('month');
  return month !== null && MONTH.test(month) ? month : invalid('month');
}

function monthField(body: Record<string, unknown>): string {
  const month = body['month'];
  return typeof month === 'string' && MONTH.test(month) ? month : invalid('month');
}

/** In soles, greater than 0, at most two decimals. */
function amountOf(body: Record<string, unknown>, expense: boolean): number {
  const amount = body['amount'];
  const valid =
    typeof amount === 'number' && amount > 0 && Math.round(amount * 100) / 100 === amount;
  if (valid) return amount;
  return expense
    ? raise(400, 'EXPENSE_INVALID_AMOUNT', 'El monto debe ser mayor a 0', 'amount')
    : invalid('amount');
}

/** Optional text: blank means none. */
function optionalText(
  body: Record<string, unknown>,
  name: string,
  max: number,
): string | undefined {
  const value = body[name];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || value.length > max) return invalid(name);
  return value.trim() === '' ? undefined : value.trim();
}

function expenseInput(body: Record<string, unknown>): Omit<ExpenseRecord, 'id' | 'version'> {
  const category = body['category'];
  if (!CATEGORIES.has(category)) invalid('category');
  const description = optionalText(body, 'description', MAX_NOTE);
  return {
    category: category as ExpenseRecord['category'],
    amount: amountOf(body, true),
    month: monthField(body),
    ...(description === undefined ? {} : { description }),
  };
}

function expenseOf(db: MockDb, req: MockRequest): ExpenseRecord {
  return db.data.expenses.find((item) => item.id === req.params['id']) ?? notFound();
}

function expensePage(db: MockDb, req: MockRequest): Schemas['PagedExpenses'] {
  const month = monthOf(req);
  const all = db.data.expenses.filter((expense) => expense.month === month);
  const page = paginate(all, req.query);
  return { ...page, totalCount: all.length };
}

function createExpense(db: MockDb, body: Record<string, unknown>): ExpenseRecord {
  const expense: ExpenseRecord = {
    id: db.newId(ID_KIND.expense),
    version: 1,
    ...expenseInput(body),
  };
  db.data.expenses.push(expense);
  return expense;
}

function updateExpense(expense: ExpenseRecord, body: Record<string, unknown>): void {
  const version = body['version'];
  if (typeof version !== 'number') invalid('version');
  if (version !== expense.version) raiseConcurrentModification();
  const next = expenseInput(body);
  expense.category = next.category;
  expense.amount = next.amount;
  expense.month = next.month;
  if (next.description === undefined) delete expense.description;
  else expense.description = next.description;
  expense.version += 1;
}

function createFine(db: MockDb, body: Record<string, unknown>): FineRecord {
  const guestId = body['guestId'];
  if (typeof guestId !== 'string') invalid('guestId');
  if (db.guest(guestId) === undefined) notFound();
  const description = optionalText(body, 'description', MAX_NOTE);
  const fine: FineRecord = {
    id: db.newId(ID_KIND.fine),
    guestId,
    amount: amountOf(body, false),
    month: monthField(body),
    ...(description === undefined ? {} : { description }),
  };
  db.data.fines.push(fine);
  return fine;
}

function fineOf(db: MockDb, req: MockRequest): FineRecord {
  return db.data.fines.find((item) => item.id === req.params['id']) ?? notFound();
}

function remove<T>(list: T[], item: T): void {
  list.splice(list.indexOf(item), 1);
}

function refundPage(db: MockDb, req: MockRequest): Schemas['PagedRefunds'] {
  const month = monthOf(req);
  const all = db.data.refunds
    .filter((refund) => refund.date.slice(0, 7) === month)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((refund) => refundView(db, refund));
  return { ...paginate(all, req.query), totalCount: all.length };
}

/** A refund of the credit that has no month left (RN-38): partial is fine, the date is not future (RN-39). */
function createRefund(db: MockDb, body: Record<string, unknown>): RefundRecord {
  const guestId = body['guestId'];
  if (typeof guestId !== 'string') invalid('guestId');
  if (db.guest(guestId) === undefined) notFound();
  const credit = pendingCredits(db).find((item) => item.guestId === guestId);
  if (credit === undefined) invalid('guestId');
  const amount = body['amount'];
  const exact = typeof amount === 'number' && Math.round(amount * 100) / 100 === amount;
  if (!exact || amount <= 0 || amount > credit.amount) invalid('amount');
  const date = body['date'];
  if (typeof date !== 'string' || !DAY.test(date) || date > today()) invalid('date');
  const method = body['method'];
  if (typeof method !== 'string' || method.trim() === '' || method.length > MAX_METHOD) {
    invalid('method');
  }
  const note = optionalText(body, 'note', MAX_NOTE);
  const refund: RefundRecord = {
    id: db.newId(ID_KIND.refund),
    guestId,
    date,
    method: method.trim(),
    amount,
    fromPaymentId: credit.origin.paymentId,
    fromPeriod: credit.origin.period,
    ...(note === undefined ? {} : { note }),
  };
  db.data.refunds.push(refund);
  const own = db.credit(guestId);
  own.balance = Math.round((own.balance - amount) * 100) / 100;
  own.lastRefund = { amount, date, method: refund.method };
  return refund;
}

/** The finance of the administrator (A6, A6.1 to A6.5). */
export const ADMIN_FINANCE_ROUTES: readonly MockRoute[] = [
  {
    key: 'GET /bff/admin/finance',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(financeSummary(ctx.db, monthOf(req)));
    },
  },
  {
    key: 'GET /bff/admin/expenses',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(expensePage(ctx.db, req));
    },
  },
  {
    key: 'POST /bff/admin/expenses',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(createExpense(ctx.db, bodyOf(req)), 201);
    },
  },
  {
    key: 'PATCH /bff/admin/expenses/{id}',
    versioned: true,
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const expense = expenseOf(ctx.db, req);
      updateExpense(expense, bodyOf(req));
      return ok(expense);
    },
  },
  {
    key: 'DELETE /bff/admin/expenses/{id}',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      remove(ctx.db.data.expenses, expenseOf(ctx.db, req));
      return noContent();
    },
  },
  {
    key: 'GET /bff/admin/fines',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const month = monthOf(req);
      return ok(
        ctx.db.data.fines
          .filter((fine) => fine.month === month)
          .map((fine) => fineView(ctx.db, fine)),
      );
    },
  },
  {
    key: 'POST /bff/admin/fines',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(fineView(ctx.db, createFine(ctx.db, bodyOf(req))), 201);
    },
  },
  {
    key: 'DELETE /bff/admin/fines/{id}',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      remove(ctx.db.data.fines, fineOf(ctx.db, req));
      return noContent();
    },
  },
  {
    key: 'GET /bff/admin/refunds',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(refundPage(ctx.db, req));
    },
  },
  {
    key: 'POST /bff/admin/refunds',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(refundView(ctx.db, createRefund(ctx.db, bodyOf(req))), 201);
    },
  },
  {
    key: 'GET /bff/admin/credits',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      if (req.query.get('pending') !== 'true') invalid('pending');
      return ok(pendingCredits(ctx.db));
    },
  },
];
