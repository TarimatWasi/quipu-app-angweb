import type { components } from '@core/api/bff.generated';
import { dueDay, monthsBetween, overlaps, today } from './mock-dates';
import type { Contract, Environment, MockDb, PaymentRecord, StayRecord } from './mock-db';
import { chargeStatus, ChargeStatus, paymentSummary } from './payment-views';

type Schemas = components['schemas'];

/** A month of a contract with its live payment, the credit discounted from it and its state. */
export interface ContractPeriod {
  readonly contract: Contract;
  readonly period: string;
  readonly dueDate: string;
  readonly payment: PaymentRecord | undefined;
  readonly creditApplied: number;
  readonly amountDue: number;
  readonly status: ChargeStatus;
}

function cents(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * The months a contract charged up to today (or up to its end), oldest first. The credit of the
 * guest is discounted month by month from the periods without a payment yet; a period it covers
 * whole is PAID without a payment, and what is left passes on to the next one (RN-38). A payment
 * keeps the credit it was sent with. A `pool` shared by several contracts discounts it only once.
 */
/** The credit of a guest still to discount, shared by the months of all its contracts. */
export interface CreditPool {
  available: number;
}

export function contractPeriods(
  db: MockDb,
  contract: Contract,
  pool: CreditPool = { available: db.credit(contract.guestId).balance },
): ContractPeriod[] {
  const current = today().slice(0, 7);
  const end = contract.endDate?.slice(0, 7) ?? current;
  const last = end < current ? end : current;
  let available = pool.available;
  return monthsBetween(contract.startDate.slice(0, 7), last).map((period) => {
    const dueDate = dueDay(period, contract.paymentDay);
    const payment = db.paymentFor({ contractId: contract.id, period });
    const creditApplied = payment?.creditApplied ?? Math.min(available, contract.monthlyAmount);
    if (payment === undefined) {
      available = cents(available - creditApplied);
      pool.available = available;
    }
    const amountDue = cents(contract.monthlyAmount - creditApplied);
    const coveredByCredit = payment === undefined && amountDue === 0;
    return {
      contract,
      period,
      dueDate,
      payment,
      creditApplied,
      amountDue,
      status: coveredByCredit ? 'PAID' : chargeStatus(payment, dueDate, contract.graceDays),
    };
  });
}

/**
 * Every month of every contract of a guest, current or past, oldest contract first (RF-06). The
 * credit of the guest is discounted once across all of them (RN-38): every screen that reads the
 * months, the payable periods or the credit left uses this one calculation.
 */
export function guestPeriods(db: MockDb, guestId: string): ContractPeriod[] {
  const pool: CreditPool = { available: db.credit(guestId).balance };
  return db.data.contracts
    .filter((contract) => contract.guestId === guestId)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .flatMap((contract) => contractPeriods(db, contract, pool));
}

/** The credit of a guest not yet discounted from any charged period (GuestCredit.balance). */
export function creditLeft(db: MockDb, guestId: string): number {
  const applied = guestPeriods(db, guestId)
    .filter((item) => item.payment === undefined)
    .reduce((sum, item) => sum + item.creditApplied, 0);
  return cents(db.credit(guestId).balance - applied);
}

/**
 * The payments the credit still to use was left over from, oldest first, with what is left of each
 * (GuestCredit.origins, TAR-284). The credit is taken oldest first, so what was already used comes
 * out of the oldest ones; what is left adds up to creditLeft.
 */
export function creditOrigins(db: MockDb, guestId: string): Schemas['GuestCredit']['origins'] {
  const sources = db.data.payments
    .filter((p) => p.guestId === guestId && p.period !== null && p.surplus?.outcome === 'CREDIT')
    .sort((a, b) => (a.period ?? '').localeCompare(b.period ?? ''));
  const left = creditLeft(db, guestId);
  let used = cents(sources.reduce((sum, p) => sum + (p.surplus?.amount ?? 0), 0) - left);
  const origins: Schemas['GuestCredit']['origins'] = [];
  for (const source of sources) {
    const amount = source.surplus?.amount ?? 0;
    const taken = Math.min(Math.max(used, 0), amount);
    used = cents(used - taken);
    if (amount - taken > 0) {
      origins.push({
        paymentId: source.id,
        period: source.period ?? '',
        amount: cents(amount - taken),
      });
    }
  }
  return left > 0 ? origins : [];
}

export function periodStatus({
  contract,
  period,
  dueDate,
  payment,
  creditApplied,
  amountDue,
  status,
}: ContractPeriod): Schemas['PeriodStatus'] {
  return {
    period,
    status,
    dueDate,
    amount: contract.monthlyAmount,
    creditApplied,
    amountDue,
    contractId: contract.id,
    paymentId: payment?.id ?? null,
    rejectionReason: payment?.status === 'REJECTED' ? payment.rejectionReason : null,
  };
}

export function stayPayment(db: MockDb, stay: StayRecord): PaymentRecord | undefined {
  return db.paymentFor({ stayId: stay.id });
}

export function stayView(db: MockDb, stay: StayRecord): Schemas['Stay'] {
  const payment = stayPayment(db, stay);
  return {
    id: stay.id,
    environmentId: stay.environmentId,
    environmentCode: db.environment(stay.environmentId)?.code ?? null,
    startDate: stay.startDate,
    endDate: stay.endDate,
    agreedAmount: stay.agreedAmount,
    paymentStatus: chargeStatus(payment, stay.endDate, 0),
    paymentId: payment?.id ?? null,
    version: stay.version,
  };
}

/** The stay in force today, else the next one, else the latest (T1, CU-22). */
export function currentStay(db: MockDb, guestId: string): StayRecord | undefined {
  const day = today();
  const stays = db.staysOf(guestId);
  const upcoming = stays.filter((stay) => stay.endDate >= day);
  return upcoming.at(-1) ?? stays[0];
}

type PayablePeriod = Schemas['PayablePeriod'];

function contractPayables(db: MockDb, guestId: string): PayablePeriod[] {
  return guestPeriods(db, guestId).flatMap(
    ({ contract, period, dueDate, payment, creditApplied, amountDue, status }) =>
      status === 'PAID'
        ? []
        : [
            {
              contractId: contract.id,
              period,
              stayId: null,
              stayStartDate: null,
              stayEndDate: null,
              status: payment?.status === 'REJECTED' ? 'REJECTED' : status,
              dueDate,
              expectedAmount: contract.monthlyAmount,
              creditApplied,
              amountDue,
              lastPeriod: contract.endDate?.slice(0, 7) === period,
              paymentId: payment?.id ?? null,
            },
          ],
  );
}

function stayPayables(db: MockDb, guestId: string): PayablePeriod[] {
  return db
    .staysOf(guestId)
    .reverse()
    .flatMap((stay): PayablePeriod[] => {
      const view = stayView(db, stay);
      const payment = stayPayment(db, stay);
      const status = view.paymentStatus;
      if (status === 'PAID') {
        return [];
      }
      return [
        {
          contractId: null,
          period: null,
          stayId: stay.id,
          stayStartDate: stay.startDate,
          stayEndDate: stay.endDate,
          status: payment?.status === 'REJECTED' ? 'REJECTED' : status,
          dueDate: stay.endDate,
          expectedAmount: stay.agreedAmount,
          creditApplied: 0,
          amountDue: stay.agreedAmount,
          lastPeriod: true,
          paymentId: view.paymentId,
        },
      ];
    });
}

/** What a guest owes or has under review, oldest first, for a direct payment (A5.1). */
export function payablePeriods(db: MockDb, guestId: string): PayablePeriod[] {
  return [...contractPayables(db, guestId), ...stayPayables(db, guestId)];
}

/** Who occupies an environment on `day`, from contracts and stays (RN-20). */
function occupantOn(db: MockDb, environment: Environment, day: string): Schemas['Occupant'] | null {
  const contract = db.data.contracts.find(
    (item) =>
      item.environmentId === environment.id &&
      item.status === 'ACTIVE' &&
      overlaps(item.startDate, item.endDate ?? '9999-12-31', day, day),
  );
  if (contract !== undefined) {
    return {
      kind: 'CONTRACT',
      guestId: contract.guestId,
      guestName: contract.guestName,
      contractId: contract.id,
      stayId: null,
      startDate: contract.startDate,
      endDate: contract.endDate ?? null,
    };
  }
  const stay = db.data.stays.find(
    (item) =>
      item.environmentId === environment.id && overlaps(item.startDate, item.endDate, day, day),
  );
  return stay === undefined
    ? null
    : {
        kind: 'STAY',
        guestId: stay.guestId,
        guestName: db.guest(stay.guestId)?.name ?? null,
        contractId: null,
        stayId: stay.id,
        startDate: stay.startDate,
        endDate: stay.endDate,
      };
}

/** The contract or the stay of an environment that starts after `day`, the nearest one (RN-20). */
function nextOccupantAfter(
  db: MockDb,
  environment: Environment,
  day: string,
): Schemas['Occupant'] | null {
  const next = [...db.data.contracts, ...db.data.stays]
    .filter((item) => item.environmentId === environment.id && item.startDate > day)
    .filter((item) => !('status' in item) || item.status === 'ACTIVE')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return next === undefined ? null : occupantOn(db, environment, next.startDate);
}

/** When it became free: the end of the last contract or stay, else when it was created. */
function freeSinceOf(db: MockDb, environment: Environment, day: string): string {
  const ends = [...db.data.contracts, ...db.data.stays]
    .filter((item) => item.environmentId === environment.id && item.startDate <= day)
    .map((item) => item.endDate ?? '')
    .filter((end) => end !== '' && end < day);
  return ends.sort((a, b) => a.localeCompare(b)).at(-1) ?? environment.freeSince ?? day;
}

/** The environment as the BFF answers it: who is in it today, who comes next, since when it is free. */
export function environmentView(db: MockDb, environment: Environment): Environment {
  const day = today();
  const occupant = occupantOn(db, environment, day);
  return {
    ...environment,
    occupant,
    nextOccupant: nextOccupantAfter(db, environment, day),
    freeSince: occupant === null ? freeSinceOf(db, environment, day) : null,
  };
}

/**
 * Whether an environment is taken from `from` to `to` by a contract in force or a stay, leaving
 * out the stay `ignoreStayId` (the one being corrected).
 */
export function isOccupied(
  db: MockDb,
  environmentId: string,
  range: { readonly from: string; readonly to: string; readonly ignoreStayId?: string },
): boolean {
  const byContract = db.data.contracts.some(
    (contract) =>
      contract.environmentId === environmentId &&
      contract.status === 'ACTIVE' &&
      overlaps(contract.startDate, contract.endDate ?? '9999-12-31', range.from, range.to),
  );
  const byStay = db.data.stays.some(
    (stay) =>
      stay.id !== range.ignoreStayId &&
      stay.environmentId === environmentId &&
      overlaps(stay.startDate, stay.endDate, range.from, range.to),
  );
  return byContract || byStay;
}

/** The payments of a guest as the guest 360 lists them, newest first. */
export function paymentHistory(db: MockDb, guestId: string): Schemas['PaymentSummary'][] {
  return db
    .paymentsOf(guestId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((payment) => paymentSummary(db, payment));
}
