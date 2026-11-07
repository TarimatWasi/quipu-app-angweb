import type { operations } from '@core/api/bff.generated';
import { creditLeft, guestPeriods, stayPayment } from './account-views';
import { addDays, nowInstant, today } from './mock-dates';
import type { MockDb } from './mock-db';
import { chargeStatus, queueItem } from './payment-views';

export type Dashboard =
  operations['getAdminDashboard']['responses'][200]['content']['application/json'];
type Charge = Dashboard['charges'][number];

/** Contracts that end in this many days or fewer are «por vencer» (RN-07). */
const EXPIRING_DAYS = 30;
/** The review queue of the home brings at most this many vouchers (A5). */
const QUEUE_LIMIT = 20;

function cents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function nameOf(db: MockDb, guestId: string): string | null {
  return db.guest(guestId)?.name ?? null;
}

/**
 * «Cobros del mes»: the period of the current month of every active contract and every stay in
 * force today, each with its state (RN-06, RN-10). A rejected payment keeps its period UNPAID or
 * OVERDUE and says so (`paymentRejected`, RN-05).
 */
function contractCharges(db: MockDb): Charge[] {
  const month = today().slice(0, 7);
  const rows: Charge[] = [];
  for (const contract of db.data.contracts.filter((item) => item.status === 'ACTIVE')) {
    const guest = db.guest(contract.guestId);
    const period = guestPeriods(db, contract.guestId).find(
      (item) => item.contract.id === contract.id && item.period === month,
    );
    if (guest === undefined || period === undefined) continue;
    rows.push({
      guestId: guest.id,
      guestName: guest.name,
      documentType: guest.documentType,
      documentNumber: guest.documentNumber,
      guestType: 'CONTRACT',
      environmentCode: contract.environmentCode,
      contractId: contract.id,
      stayId: null,
      period: period.period,
      stayStartDate: null,
      stayEndDate: null,
      amount: period.amountDue,
      dueDate: period.dueDate,
      status: period.status,
      paymentId: period.payment?.id ?? null,
      paymentRejected: period.payment?.status === 'REJECTED',
    });
  }
  return rows;
}

function stayCharges(db: MockDb): Charge[] {
  const day = today();
  const rows: Charge[] = [];
  for (const stay of db.data.stays.filter((item) => item.startDate <= day && day <= item.endDate)) {
    const guest = db.guest(stay.guestId);
    if (guest === undefined) continue;
    const payment = stayPayment(db, stay);
    rows.push({
      guestId: guest.id,
      guestName: guest.name,
      documentType: guest.documentType,
      documentNumber: guest.documentNumber,
      guestType: 'TEMPORARY',
      environmentCode: db.environment(stay.environmentId)?.code ?? null,
      contractId: null,
      stayId: stay.id,
      period: null,
      stayStartDate: stay.startDate,
      stayEndDate: stay.endDate,
      amount: stay.agreedAmount,
      dueDate: stay.endDate,
      status: chargeStatus(payment, stay.endDate, 0),
      paymentId: payment?.id ?? null,
      paymentRejected: payment?.status === 'REJECTED',
    });
  }
  return rows;
}

function charges(db: MockDb): Charge[] {
  return [...contractCharges(db), ...stayCharges(db)];
}

function countOf(rows: readonly Charge[], status: Charge['status']): number {
  return rows.filter((row) => row.status === status).length;
}

function overdueOf(rows: readonly Charge[]): Dashboard['overdue'] {
  const late = rows
    .filter((row) => row.status === 'OVERDUE')
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return {
    count: late.length,
    total: cents(late.reduce((sum, row) => sum + row.amount, 0)),
    first: late.slice(0, 3).map((row) => ({
      guestId: row.guestId,
      guestName: row.guestName,
      environmentCode: row.environmentCode,
      period: row.period,
      stayStartDate: row.stayStartDate,
      stayEndDate: row.stayEndDate,
      dueDate: row.dueDate,
      amount: row.amount,
    })),
  };
}

function rejectedOf(db: MockDb): Dashboard['rejected'] {
  const rejected = db.data.payments
    .filter((payment) => payment.status === 'REJECTED')
    .sort((a, b) => (a.reviewedAt ?? '').localeCompare(b.reviewedAt ?? ''));
  const oldest = rejected[0];
  const item = oldest === undefined ? null : queueItem(db, oldest);
  return {
    count: rejected.length,
    oldest:
      oldest === undefined || item === null
        ? null
        : {
            paymentId: oldest.id,
            guestName: item.guestName,
            period: item.period,
            stayStartDate: item.stayStartDate,
            stayEndDate: item.stayEndDate,
            rejectedAt: oldest.reviewedAt ?? oldest.submittedAt,
          },
  };
}

/** Guests whose credit is left over and who have no contract month left to use it in (RN-38). */
function refundsOf(db: MockDb): Dashboard['refunds'] {
  const owed = db.data.guests
    .filter(
      (guest) => !db.data.contracts.some((c) => c.guestId === guest.id && c.status === 'ACTIVE'),
    )
    .map((guest) => creditLeft(db, guest.id))
    .filter((amount) => amount > 0);
  return { count: owed.length, total: cents(owed.reduce((sum, amount) => sum + amount, 0)) };
}

function expiringOf(db: MockDb): Dashboard['expiringContracts'] {
  const day = today();
  const limit = addDays(day, EXPIRING_DAYS);
  const ending = db.data.contracts
    .filter(
      (contract) =>
        contract.status === 'ACTIVE' &&
        contract.endDate != null &&
        contract.endDate >= day &&
        contract.endDate <= limit,
    )
    .sort((a, b) => (a.endDate ?? '').localeCompare(b.endDate ?? ''));
  const first = ending[0];
  return {
    count: ending.length,
    first:
      first?.endDate == null
        ? null
        : {
            contractId: first.id,
            guestName: nameOf(db, first.guestId),
            environmentCode: first.environmentCode,
            endDate: first.endDate,
          },
  };
}

/** Pending activation: an expired access first, otherwise the one that ends first (RN-32, RN-36). */
function notActivatedOf(db: MockDb): Dashboard['guestsNotActivated'] {
  const now = nowInstant();
  const pending = db.data.guests
    .filter((guest) => guest.status === 'PENDING_ACTIVATION')
    .sort((a, b) => (a.accessExpiresAt ?? '').localeCompare(b.accessExpiresAt ?? ''));
  const expired = pending.filter(
    (guest) => guest.accessExpiresAt !== null && guest.accessExpiresAt <= now,
  );
  const first = expired[0] ?? pending[0];
  return {
    count: pending.length,
    expired: expired.length,
    first:
      first === undefined
        ? null
        : {
            guestId: first.id,
            documentType: first.documentType,
            documentNumber: first.documentNumber,
            accessExpiresAt: first.accessExpiresAt,
          },
  };
}

/** The whole of `GET /admin/dashboard` (A1, CU-04) from what the simulated BFF keeps. */
export function adminDashboard(db: MockDb): Dashboard {
  const rows = charges(db);
  const pending = db.data.payments
    .filter((payment) => payment.status === 'PENDING')
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  return {
    paymentsUpToDate: countOf(rows, 'PAID'),
    paymentsUnderReview: countOf(rows, 'UNDER_REVIEW'),
    paymentsPending: countOf(rows, 'UNPAID'),
    paymentsOverdue: countOf(rows, 'OVERDUE'),
    pendingVouchers: pending.slice(0, QUEUE_LIMIT).map((payment) => queueItem(db, payment)),
    pendingVouchersTotal: pending.length,
    charges: rows,
    overdue: overdueOf(rows),
    rejected: rejectedOf(db),
    refunds: refundsOf(db),
    expiringContracts: expiringOf(db),
    guestsNotActivated: notActivatedOf(db),
  };
}
