import type { Expense, Fine, PendingCredit, Refund, Summary } from './finance';

export function summaryOf(fields: Partial<Summary> = {}): Summary {
  return {
    month: '2026-10',
    totalIncome: 6_960,
    incomeFromPayments: 6_900,
    paymentsCount: 12,
    incomeFromFines: 60,
    finesCount: 2,
    refundsTotal: 0,
    refundsCount: 0,
    totalExpenses: 1_165.5,
    expensesCount: 5,
    net: 5_794.5,
    ...fields,
  };
}

export function expenseOf(fields: Partial<Expense> = {}): Expense {
  return {
    id: 'x1',
    version: 1,
    category: 'MAINTENANCE',
    amount: 320,
    month: '2026-10',
    description: 'Gasfitero, baño del segundo piso',
    ...fields,
  };
}

export function fineOf(fields: Partial<Fine> = {}): Fine {
  return {
    id: 'f1',
    guestId: 'g1',
    guestName: 'Ana Quispe',
    environmentCode: '201',
    amount: 30,
    month: '2026-10',
    description: 'Ruido después de las 23:00',
    ...fields,
  };
}

export function refundOf(fields: Partial<Refund> = {}): Refund {
  return {
    id: 'r1',
    guestId: 'g2',
    guestName: 'Elena Mayta',
    environmentCode: 'C2',
    amount: 30,
    date: '2026-10-09',
    method: 'Yape',
    note: 'Sobró de la estadía 1 – 8 oct',
    createdAt: '2026-10-09T15:00:00.000Z',
    ...fields,
  };
}

export function creditOf(fields: Partial<PendingCredit> = {}): PendingCredit {
  return {
    guestId: 'g3',
    guestName: 'Diego Huanca',
    guestType: 'CONTRACT',
    environmentCode: '204',
    amount: 50,
    origin: {
      paymentId: 'p1',
      period: '2026-10',
      stayStartDate: null,
      stayEndDate: null,
      contractEndedOn: '2026-10-15',
    },
    ...fields,
  };
}
