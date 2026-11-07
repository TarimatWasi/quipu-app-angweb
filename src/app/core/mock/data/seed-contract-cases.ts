// Seeded contracts in every state of A4, so the list, the detail and A4.1 can be walked without
// loading them by hand: with no end date, about to end, expired, finalized with a debt and about to
// begin. Every name, document and phone is made up. Dates are relative to today.
import { addDays, addMonths, instantOn, monthsBetween, today } from './mock-dates';
import { ID_KIND, mockId } from './mock-db';
import type { Contract, Environment, GuestRecord, PaymentRecord } from './mock-db';
import { monthlyFor, seedPayment } from './seed-payments';
import { environment, guest } from './seed-people';

export const CASE_ENVIRONMENT_IDS = {
  room103: mockId(ID_KIND.environment, 10),
  room104: mockId(ID_KIND.environment, 11),
  room105: mockId(ID_KIND.environment, 12),
  room207: mockId(ID_KIND.environment, 13),
  room208: mockId(ID_KIND.environment, 14),
  cabinC4: mockId(ID_KIND.environment, 15),
} as const;

export const CASE_GUEST_IDS = {
  openEnded: mockId(ID_KIND.guest, 14),
  expiring: mockId(ID_KIND.guest, 15),
  expired: mockId(ID_KIND.guest, 16),
  terminated: mockId(ID_KIND.guest, 17),
  upcoming: mockId(ID_KIND.guest, 18),
} as const;

export const CASE_CONTRACT_IDS = {
  openEnded: mockId(ID_KIND.contract, 5),
  expiring: mockId(ID_KIND.contract, 6),
  expired: mockId(ID_KIND.contract, 7),
  terminated: mockId(ID_KIND.contract, 8),
  upcoming: mockId(ID_KIND.contract, 9),
} as const;

export function seedCaseEnvironments(): Environment[] {
  return [
    environment(CASE_ENVIRONMENT_IDS.room103, '103', 'ROOM'),
    environment(CASE_ENVIRONMENT_IDS.room104, '104', 'ROOM'),
    environment(CASE_ENVIRONMENT_IDS.room105, '105', 'ROOM'),
    environment(CASE_ENVIRONMENT_IDS.room207, '207', 'ROOM'),
    environment(CASE_ENVIRONMENT_IDS.room208, '208', 'ROOM'),
    environment(CASE_ENVIRONMENT_IDS.cabinC4, 'C4', 'CABIN'),
  ];
}

export function seedCaseGuests(): GuestRecord[] {
  const contractGuest = (id: string, number: string, name: string, phone: string): GuestRecord =>
    guest({
      id,
      documentType: 'DNI',
      documentNumber: number,
      name,
      type: 'CONTRACT',
      phone,
      contactEmail: `${number}@example.com`,
    });
  return [
    contractGuest(CASE_GUEST_IDS.openEnded, '70000021', 'Sofía Gutiérrez Mamani', '976 543 210'),
    contractGuest(CASE_GUEST_IDS.expiring, '70000022', 'Rocío Apaza Flores', '965 432 109'),
    contractGuest(CASE_GUEST_IDS.expired, '70000023', 'Marco Huanca Ticona', '954 321 098'),
    contractGuest(CASE_GUEST_IDS.terminated, '70000024', 'Felipe Huanca Ticona', '943 210 987'),
    contractGuest(CASE_GUEST_IDS.upcoming, '70000025', 'Iván Ticona Vilca', '932 109 876'),
  ];
}

interface CaseContract {
  readonly id: string;
  readonly guestId: string;
  readonly environmentId: string;
  readonly monthlyAmount: number;
  readonly paymentDay: number;
  readonly graceDays: number;
  /** The first day of the month that many months from now: negative goes back. */
  readonly startMonths: number;
  readonly endDate: string | null;
  readonly status: Contract['status'];
  readonly terminatedAt?: string;
}

function monthStart(months: number): string {
  return `${addMonths(today(), months)}-01`;
}

function caseContractOf(
  item: CaseContract,
  guests: readonly GuestRecord[],
  environments: readonly Environment[],
): Contract | null {
  const owner = guests.find((candidate) => candidate.id === item.guestId);
  const place = environments.find((candidate) => candidate.id === item.environmentId);
  if (!owner || !place) return null;
  const startDate = monthStart(item.startMonths);
  return {
    id: item.id,
    environmentId: place.id,
    guestId: owner.id,
    guestName: owner.name,
    documentType: owner.documentType,
    documentNumber: owner.documentNumber,
    environmentCode: place.code,
    environmentType: place.type,
    monthlyAmount: item.monthlyAmount,
    paymentDay: item.paymentDay,
    graceDays: item.graceDays,
    startDate,
    endDate: item.endDate,
    status: item.status,
    expiringSoon: false,
    terminatedAt: item.terminatedAt ?? null,
    file: {
      name: `contrato-${place.code}.pdf`,
      sizeBytes: 182_400,
      uploadedAt: instantOn(startDate, 9),
    },
    fileUrl: null,
  };
}

/** The ones in force: with no end date, about to end and about to begin. */
function inForceCases(): readonly CaseContract[] {
  const day = today();
  return [
    {
      // No end date: it stays until it is finalized (RN-07).
      id: CASE_CONTRACT_IDS.openEnded,
      guestId: CASE_GUEST_IDS.openEnded,
      environmentId: CASE_ENVIRONMENT_IDS.room103,
      monthlyAmount: 700,
      paymentDay: 10,
      graceDays: 5,
      startMonths: -8,
      endDate: null,
      status: 'ACTIVE',
    },
    {
      // Ends in 25 days: «Próximo a vencer», the panel of A4 and the notice of A1.
      id: CASE_CONTRACT_IDS.expiring,
      guestId: CASE_GUEST_IDS.expiring,
      environmentId: CASE_ENVIRONMENT_IDS.room104,
      monthlyAmount: 820,
      paymentDay: 20,
      graceDays: 3,
      startMonths: -11,
      endDate: addDays(day, 25),
      status: 'ACTIVE',
    },
    {
      // Begins next month: it is Vigente and already occupies the environment (RN-07).
      id: CASE_CONTRACT_IDS.upcoming,
      guestId: CASE_GUEST_IDS.upcoming,
      environmentId: CASE_ENVIRONMENT_IDS.room105,
      monthlyAmount: 680,
      paymentDay: 15,
      graceDays: 3,
      startMonths: 1,
      endDate: addDays(monthStart(13), -1),
      status: 'ACTIVE',
    },
  ];
}

/** The ones that ended: expired by their date and finalized by the administrator. */
function endedCases(): readonly CaseContract[] {
  const day = today();
  return [
    {
      // Its end passed 40 days ago and it freed the environment by itself (RN-07).
      id: CASE_CONTRACT_IDS.expired,
      guestId: CASE_GUEST_IDS.expired,
      environmentId: CASE_ENVIRONMENT_IDS.room207,
      monthlyAmount: 620,
      paymentDay: 5,
      graceDays: 3,
      startMonths: -14,
      endDate: addDays(day, -40),
      status: 'EXPIRED',
    },
    {
      // Finalized 20 days ago while the last two months were still owed (D-31).
      id: CASE_CONTRACT_IDS.terminated,
      guestId: CASE_GUEST_IDS.terminated,
      environmentId: CASE_ENVIRONMENT_IDS.room208,
      monthlyAmount: 650,
      paymentDay: 10,
      graceDays: 3,
      startMonths: -6,
      endDate: addDays(day, 160),
      status: 'TERMINATED',
      terminatedAt: addDays(day, -20),
    },
  ];
}

function caseContracts(): readonly CaseContract[] {
  return [...inForceCases(), ...endedCases()];
}

export function seedCaseContracts(
  guests: readonly GuestRecord[],
  environments: readonly Environment[],
): Contract[] {
  return caseContracts()
    .map((item) => caseContractOf(item, guests, environments))
    .filter((contract) => contract !== null);
}

/** The months each of these contracts charged up to today or to its end, paid, but the owed ones. */
export function seedCasePayments(): PaymentRecord[] {
  const day = today();
  const current = day.slice(0, 7);
  let n = 40;
  const paid = (
    item: CaseContract,
    guestId: string,
    stopMonth: string,
    unpaidFrom: string | null,
  ): PaymentRecord[] =>
    monthsBetween(monthStart(item.startMonths).slice(0, 7), stopMonth)
      .filter((period) => unpaidFrom === null || period < unpaidFrom)
      .map((period) =>
        seedPayment(
          monthlyFor(
            n++,
            guestId,
            { id: item.id, day: item.paymentDay, amount: item.monthlyAmount },
            period,
          ),
        ),
      );
  const byId = (id: string) => caseContracts().find((item) => item.id === id);
  const openEnded = byId(CASE_CONTRACT_IDS.openEnded);
  const expiring = byId(CASE_CONTRACT_IDS.expiring);
  const expired = byId(CASE_CONTRACT_IDS.expired);
  const terminated = byId(CASE_CONTRACT_IDS.terminated);
  if (!openEnded || !expiring || !expired || !terminated) return [];
  const endMonth = (item: CaseContract) => item.endDate?.slice(0, 7) ?? current;
  return [
    ...paid(openEnded, CASE_GUEST_IDS.openEnded, current, null),
    ...paid(expiring, CASE_GUEST_IDS.expiring, current, null),
    ...paid(expired, CASE_GUEST_IDS.expired, endMonth(expired), null),
    // Finalized this month or the last: the months before its last two were paid.
    ...paid(
      terminated,
      CASE_GUEST_IDS.terminated,
      (terminated.terminatedAt ?? current).slice(0, 7),
      addMonths(terminated.terminatedAt ?? day, -1),
    ),
  ];
}
