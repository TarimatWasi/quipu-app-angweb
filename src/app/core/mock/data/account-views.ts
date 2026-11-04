import type { components } from '@core/api/bff.generated';
import { dueDay, monthsBetween, overlaps, today } from './mock-dates';
import type { Contract, Environment, MockDb, PaymentRecord, StayRecord } from './mock-db';
import { chargeStatus, ChargeStatus, paymentSummary } from './payment-views';

type Schemas = components['schemas'];

/** A month of a contract with its live payment and its state (H1, A5.1). */
export interface ContractPeriod {
  readonly contract: Contract;
  readonly period: string;
  readonly dueDate: string;
  readonly payment: PaymentRecord | undefined;
  readonly status: ChargeStatus;
}

/** The months a contract charged up to today (or up to its end), oldest first. */
export function contractPeriods(db: MockDb, contract: Contract): ContractPeriod[] {
  const current = today().slice(0, 7);
  const end = contract.endDate?.slice(0, 7) ?? current;
  const last = end < current ? end : current;
  return monthsBetween(contract.startDate.slice(0, 7), last).map((period) => {
    const dueDate = dueDay(period, contract.paymentDay);
    const payment = db.paymentFor({ contractId: contract.id, period });
    return {
      contract,
      period,
      dueDate,
      payment,
      status: chargeStatus(payment, dueDate, contract.graceDays),
    };
  });
}

export function periodStatus({
  contract,
  period,
  dueDate,
  payment,
  status,
}: ContractPeriod): Schemas['PeriodStatus'] {
  return {
    period,
    status,
    dueDate,
    amount: contract.monthlyAmount,
    creditApplied: payment?.creditApplied ?? 0,
    amountDue: contract.monthlyAmount - (payment?.creditApplied ?? 0),
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
  const contract = db.contractOf(guestId);
  if (contract === undefined) {
    return [];
  }
  return contractPeriods(db, contract).flatMap(({ period, dueDate, payment, status }) =>
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
            creditApplied: 0,
            amountDue: contract.monthlyAmount,
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

export function environmentView(db: MockDb, environment: Environment): Environment {
  return { ...environment, occupant: occupantOn(db, environment, today()) };
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
