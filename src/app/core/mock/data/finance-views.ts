import type { components, operations } from '@core/api/bff.generated';
import { creditLeft } from './account-views';
import type { FineRecord, MockDb, PaymentRecord, RefundRecord } from './mock-db';

type Schemas = components['schemas'];
type FinanceSummary =
  operations['getFinanceSummary']['responses'][200]['content']['application/json'];

const cents = (amount: number): number => Math.round(amount * 100) / 100;
const sum = (amounts: readonly number[]): number => cents(amounts.reduce((a, b) => a + b, 0));

function nameOf(db: MockDb, guestId: string): string | null {
  return db.guest(guestId)?.name ?? null;
}

/** The environment of the guest now or the last one it had: of its contracts and stays. */
export function environmentCodeOf(db: MockDb, guestId: string): string | null {
  const own = [
    ...db.data.contracts
      .filter((contract) => contract.guestId === guestId)
      .map((contract) => ({ at: contract.startDate, code: contract.environmentCode })),
    ...db.staysOf(guestId).map((stay) => ({
      at: stay.startDate,
      code: db.environment(stay.environmentId)?.code ?? null,
    })),
  ].filter((item) => item.code !== null);
  return own.sort((a, b) => a.at.localeCompare(b.at)).at(-1)?.code ?? null;
}

export function fineView(db: MockDb, fine: FineRecord): Schemas['Fine'] {
  return {
    id: fine.id,
    guestId: fine.guestId,
    guestName: nameOf(db, fine.guestId),
    environmentCode: environmentCodeOf(db, fine.guestId),
    amount: fine.amount,
    month: fine.month,
    ...(fine.description === undefined ? {} : { description: fine.description }),
  };
}

export function refundView(db: MockDb, refund: RefundRecord): Schemas['Refund'] {
  return {
    id: refund.id,
    guestId: refund.guestId,
    guestName: nameOf(db, refund.guestId),
    environmentCode: environmentCodeOf(db, refund.guestId),
    amount: refund.amount,
    date: refund.date,
    method: refund.method,
    note: refund.note ?? null,
    createdAt: `${refund.date}T15:00:00.000Z`,
  };
}

/** The month of an approved payment: the one it pays, or the one its stay ends in (RN-11). */
function monthOf(db: MockDb, payment: PaymentRecord): string {
  if (payment.period !== null) return payment.period;
  return db.stay(payment.stayId)?.endDate.slice(0, 7) ?? payment.submittedAt.slice(0, 7);
}

function verified(payment: PaymentRecord): number {
  return sum(payment.proofs.map((proof) => proof.verifiedAmount ?? 0));
}

/** The balance of a month: what the approved payments verified plus the fines, less refunds and expenses. */
export function financeSummary(db: MockDb, month: string): FinanceSummary {
  const payments = db.data.payments.filter(
    (payment) => payment.status === 'APPROVED' && monthOf(db, payment) === month,
  );
  const fines = db.data.fines.filter((fine) => fine.month === month);
  const refunds = db.data.refunds.filter((refund) => refund.date.slice(0, 7) === month);
  const expenses = db.data.expenses.filter((expense) => expense.month === month);
  const incomeFromPayments = sum(payments.map(verified));
  const incomeFromFines = sum(fines.map((fine) => fine.amount));
  const refundsTotal = sum(refunds.map((refund) => refund.amount));
  const totalExpenses = sum(expenses.map((expense) => expense.amount));
  const totalIncome = cents(incomeFromPayments + incomeFromFines - refundsTotal);
  return {
    month,
    totalIncome,
    incomeFromPayments,
    paymentsCount: payments.length,
    incomeFromFines,
    finesCount: fines.length,
    refundsTotal,
    refundsCount: refunds.length,
    totalExpenses,
    expensesCount: expenses.length,
    net: cents(totalIncome - totalExpenses),
  };
}

/** The payment the credit of a guest was left over from: its latest approved one with a surplus. */
function originOf(db: MockDb, guestId: string): PaymentRecord | undefined {
  return db
    .paymentsOf(guestId)
    .filter((payment) => payment.status === 'APPROVED' && payment.surplus !== null)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
}

/** Credit with no month left to be used in: the guest has no contract in force (RN-38, A6, A1). */
export function pendingCredits(db: MockDb): Schemas['PendingCredit'][] {
  return db.data.guests
    .filter(
      (guest) =>
        !db.data.contracts.some((item) => item.guestId === guest.id && item.status === 'ACTIVE'),
    )
    .flatMap((guest) => {
      const amount = creditLeft(db, guest.id);
      const source = originOf(db, guest.id);
      if (amount <= 0 || source === undefined) return [];
      const stay = db.stay(source.stayId);
      const ended = db.contractOf(guest.id);
      return [
        {
          guestId: guest.id,
          guestName: guest.name,
          guestType: guest.type,
          environmentCode: environmentCodeOf(db, guest.id),
          amount,
          origin: {
            paymentId: source.id,
            period: source.period,
            stayStartDate: stay?.startDate ?? null,
            stayEndDate: stay?.endDate ?? null,
            contractEndedOn:
              ended !== undefined && ended.status !== 'ACTIVE'
                ? (ended.terminatedAt ?? ended.endDate ?? null)
                : null,
          },
        },
      ];
    })
    .sort((a, b) => a.origin.paymentId.localeCompare(b.origin.paymentId));
}
