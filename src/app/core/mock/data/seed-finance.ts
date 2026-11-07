// Seeded expenses, fines and the credit left over by two guests, relative to today so the finance
// of the current month and of the last one always has something to show. Every name is made up.
import { GUEST_IDS } from './demo-users';
import { addMonths, today } from './mock-dates';
import { ID_KIND, mockId } from './mock-db';
import type { CreditRecord, ExpenseRecord, FineRecord, PaymentRecord } from './mock-db';
import { CASE_GUEST_IDS } from './seed-contract-cases';

export const EXPENSE_IDS = {
  light: mockId(ID_KIND.expense, 1),
  water: mockId(ID_KIND.expense, 2),
  internet: mockId(ID_KIND.expense, 3),
} as const;

export const FINE_IDS = {
  noise: mockId(ID_KIND.fine, 1),
  key: mockId(ID_KIND.fine, 2),
} as const;

const expense = (
  n: number,
  month: string,
  category: ExpenseRecord['category'],
  amount: number,
  description?: string,
): ExpenseRecord => ({
  id: mockId(ID_KIND.expense, n),
  version: 1,
  category,
  amount,
  month,
  ...(description === undefined ? {} : { description }),
});

export function seedExpenses(): ExpenseRecord[] {
  const current = today().slice(0, 7);
  const last = addMonths(today(), -1);
  return [
    expense(1, current, 'UTILITIES', 420, 'Luz, recibo del mes'),
    expense(2, current, 'UTILITIES', 180.5, 'Agua, recibo del mes'),
    expense(3, current, 'UTILITIES', 150, 'Internet'),
    expense(4, current, 'MAINTENANCE', 320, 'Gasfitero, baño del segundo piso'),
    expense(5, current, 'CLEANING_SUPPLIES', 95, 'Detergente y papel higiénico'),
    expense(6, last, 'UTILITIES', 398.4, 'Luz, recibo del mes pasado'),
    expense(7, last, 'UTILITIES', 172),
    expense(8, last, 'TAXES_FEES', 210, 'Arbitrios'),
  ];
}

export function seedFines(): FineRecord[] {
  const current = today().slice(0, 7);
  return [
    {
      id: FINE_IDS.noise,
      guestId: GUEST_IDS.luis,
      amount: 30,
      month: current,
      description: 'Ruido después de las 23:00',
    },
    { id: FINE_IDS.key, guestId: GUEST_IDS.reviewing, amount: 30, month: current },
  ];
}

/**
 * Leaves credit to refund to two guests (RN-38): the one of an expired contract, who has no month
 * left to use it in, and a temporary guest, whose stay paid more than it cost.
 */
export function seedPendingCredits(
  payments: readonly PaymentRecord[],
  credits: Map<string, CreditRecord>,
): void {
  const last = (guestId: string) =>
    payments
      .filter((payment) => payment.guestId === guestId && payment.status === 'APPROVED')
      .sort((a, b) => (a.period ?? a.submittedAt).localeCompare(b.period ?? b.submittedAt))
      .at(-1);
  const leftOver = (guestId: string, amount: number, outcome: 'CREDIT' | 'REFUND_PENDING') => {
    const source = last(guestId);
    if (source === undefined) return;
    source.surplus = { amount, outcome };
    credits.set(guestId, { balance: amount, lastRefund: null });
  };
  leftOver(CASE_GUEST_IDS.expired, 50, 'CREDIT');
  leftOver(GUEST_IDS.ana, 35, 'REFUND_PENDING');
}
