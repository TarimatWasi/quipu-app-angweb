// Seeded stays, payments, refunds and credits, relative to today so the demo always has something
// to review, something overdue and something coming.
import { ADMIN_REVIEWER, GUEST_IDS } from './demo-users';
import { addDays, addMonths, dueDay, instantOn, today } from './mock-dates';
import { ID_KIND, mockId } from './mock-db';
import type { AdminProof, CreditRecord, PaymentRecord, RefundRecord, StayRecord } from './mock-db';
import { CONTRACT_IDS, ENVIRONMENT_IDS } from './seed-people';

export const STAY_IDS = {
  anaPast: mockId(ID_KIND.stay, 1),
  anaCurrent: mockId(ID_KIND.stay, 2),
  jorgeOverdue: mockId(ID_KIND.stay, 3),
  jorgeNext: mockId(ID_KIND.stay, 4),
  pedroOld: mockId(ID_KIND.stay, 5),
  owingUnpaid: mockId(ID_KIND.stay, 6),
} as const;

function stay(
  id: string,
  guestId: string,
  environmentId: string | null,
  [from, to]: readonly [number, number],
  agreedAmount: number,
): StayRecord {
  const day = today();
  return {
    id,
    guestId,
    environmentId,
    startDate: addDays(day, from),
    endDate: addDays(day, to),
    agreedAmount,
    version: 1,
  };
}

export function seedStays(): StayRecord[] {
  return [
    stay(STAY_IDS.anaPast, GUEST_IDS.ana, ENVIRONMENT_IDS.cabinC1, [-40, -33], 420),
    stay(STAY_IDS.anaCurrent, GUEST_IDS.ana, ENVIRONMENT_IDS.cabinC1, [-3, 4], 480),
    stay(STAY_IDS.jorgeOverdue, GUEST_IDS.jorge, ENVIRONMENT_IDS.cabinC2, [-20, -15], 300),
    stay(STAY_IDS.jorgeNext, GUEST_IDS.jorge, ENVIRONMENT_IDS.cabinC2, [10, 17], 350),
    stay(STAY_IDS.pedroOld, GUEST_IDS.pedro, null, [-120, -110], 250),
    // CU-28: an inactive guest who left without paying its last stay, so it cannot be reactivated.
    stay(STAY_IDS.owingUnpaid, GUEST_IDS.owing, null, [-75, -68], 650),
  ];
}

interface SeedProof {
  readonly kind: AdminProof['kind'];
  readonly amount: number;
  readonly method?: string;
  readonly file?: string;
}

export interface SeedPayment {
  readonly n: number;
  readonly guestId: string;
  readonly target: { readonly contractId: string; readonly period: string } | { stayId: string };
  readonly status: PaymentRecord['status'];
  readonly sentOn: string;
  readonly proofs: readonly SeedProof[];
  readonly reason?: string;
}

function proof(seed: SeedPayment, item: SeedProof, index: number): AdminProof {
  const pdf = item.file?.endsWith('.pdf') ?? false;
  return {
    id: mockId(ID_KIND.proof, seed.n * 10 + index),
    kind: item.kind,
    method: item.method ?? null,
    declaredAmount: item.amount,
    verifiedAmount: seed.status === 'APPROVED' ? item.amount : null,
    uploadedBy: 'GUEST',
    addedAt: instantOn(seed.sentOn, 9 + index),
    receivedOn: null,
    file:
      item.file === undefined
        ? null
        : {
            name: item.file,
            contentType: pdf ? 'application/pdf' : 'image/jpeg',
            sizeBytes: 245_760,
          },
    fileUrl: null,
  };
}

export function seedPayment(seed: SeedPayment): PaymentRecord {
  const resolvedAt = instantOn(addDays(seed.sentOn, 1), 16);
  const resolved = seed.status !== 'PENDING';
  const decision = seed.status === 'REJECTED' ? 'REJECTED' : 'APPROVED';
  return {
    id: mockId(ID_KIND.payment, seed.n),
    guestId: seed.guestId,
    contractId: 'contractId' in seed.target ? seed.target.contractId : null,
    stayId: 'stayId' in seed.target ? seed.target.stayId : null,
    period: 'period' in seed.target ? seed.target.period : null,
    status: seed.status,
    proofs: seed.proofs.map((item, index) => proof(seed, item, index)),
    reviews: resolved ? [{ decision, reason: seed.reason ?? null, at: resolvedAt }] : [],
    rejectionReason: seed.reason ?? null,
    reviewedAt: resolved ? resolvedAt : null,
    reviewedBy: resolved ? ADMIN_REVIEWER : null,
    surplus: null,
    submittedAt: instantOn(seed.sentOn, 9),
    createdAt: instantOn(seed.sentOn, 9),
    creditApplied: 0,
  };
}

const yape = (amount: number, file = 'voucher-yape.jpg'): SeedProof => ({
  kind: 'VOUCHER',
  amount,
  method: 'Yape',
  file,
});

function monthly(
  n: number,
  guestId: string,
  contract: { readonly id: string; readonly day: number; readonly amount: number },
  monthsAgo: number,
): SeedPayment {
  return monthlyFor(n, guestId, contract, addMonths(today(), -monthsAgo));
}

/** The approved payment of a month (yyyy-mm), sent two days before it was due. */
export function monthlyFor(
  n: number,
  guestId: string,
  contract: { readonly id: string; readonly day: number; readonly amount: number },
  period: string,
): SeedPayment {
  return {
    n,
    guestId,
    target: { contractId: contract.id, period },
    status: 'APPROVED',
    sentOn: addDays(dueDay(period, contract.day), -2),
    proofs: [yape(contract.amount)],
  };
}

function contractPayments(): SeedPayment[] {
  const luis = { id: CONTRACT_IDS.luis, day: 5, amount: 750 };
  const maria = { id: CONTRACT_IDS.maria, day: 10, amount: 680 };
  return [
    ...[4, 3, 2].map((ago, index) => monthly(1 + index, GUEST_IDS.luis, luis, ago)),
    {
      ...monthly(4, GUEST_IDS.luis, luis, 1),
      status: 'REJECTED',
      proofs: [yape(750, 'captura-borrosa.jpg')],
      reason: 'El voucher no se lee; vuelve a subirlo con mejor luz.',
    },
    {
      ...monthly(5, GUEST_IDS.luis, luis, 0),
      status: 'PENDING',
      proofs: [yape(500), { kind: 'CASH', amount: 250 }],
    },
    ...[6, 5, 4, 3, 2].map((ago, index) => monthly(6 + index, GUEST_IDS.maria, maria, ago)),
    {
      ...monthly(11, GUEST_IDS.maria, maria, 1),
      status: 'PENDING',
      proofs: [
        { kind: 'VOUCHER', amount: 680, method: 'Transferencia BCP', file: 'transferencia.pdf' },
      ],
    },
  ];
}

function stayPayments(): SeedPayment[] {
  const day = today();
  const forStay = (stayId: string) => ({ stayId });
  return [
    {
      n: 12,
      guestId: GUEST_IDS.ana,
      target: forStay(STAY_IDS.anaPast),
      status: 'APPROVED',
      sentOn: addDays(day, -36),
      proofs: [yape(420)],
    },
    {
      n: 13,
      guestId: GUEST_IDS.ana,
      target: forStay(STAY_IDS.anaCurrent),
      status: 'PENDING',
      sentOn: addDays(day, -1),
      proofs: [{ kind: 'VOUCHER', amount: 480, method: 'Plin', file: 'voucher-plin.png' }],
    },
    {
      n: 14,
      guestId: GUEST_IDS.pedro,
      target: forStay(STAY_IDS.pedroOld),
      status: 'APPROVED',
      sentOn: addDays(day, -112),
      proofs: [{ kind: 'CASH', amount: 250 }],
    },
  ];
}

/** A3.2: Carmen sent this month two days ago (under review); Julia paid every month. */
function detailPayments(): SeedPayment[] {
  const carmen = { id: CONTRACT_IDS.reviewing, day: 5, amount: 820 };
  const julia = { id: CONTRACT_IDS.upToDate, day: 1, amount: 800 };
  return [
    ...[2, 1].map((ago, index) => monthly(15 + index, GUEST_IDS.reviewing, carmen, ago)),
    {
      ...monthly(17, GUEST_IDS.reviewing, carmen, 0),
      status: 'PENDING',
      sentOn: addDays(today(), -2),
    },
    ...[3, 2, 1, 0].map((ago, index) => monthly(18 + index, GUEST_IDS.upToDate, julia, ago)),
  ];
}

export function seedPayments(): PaymentRecord[] {
  return [...contractPayments(), ...stayPayments(), ...detailPayments()].map(seedPayment);
}

/** A refund of the surplus of an old payment of Luis (RN-39), so H1 and H4 show one. */
export function seedRefunds(): RefundRecord[] {
  return [
    {
      id: mockId(ID_KIND.refund, 1),
      guestId: GUEST_IDS.luis,
      date: addDays(today(), -25),
      method: 'Yape',
      amount: 120,
      fromPaymentId: mockId(ID_KIND.payment, 2),
      fromPeriod: addMonths(today(), -3),
    },
  ];
}

export function seedCredits(refunds: readonly RefundRecord[]): Map<string, CreditRecord> {
  const credits = new Map<string, CreditRecord>();
  for (const refund of refunds) {
    credits.set(refund.guestId, {
      balance: 0,
      lastRefund: { amount: refund.amount, date: refund.date, method: refund.method },
    });
  }
  return credits;
}
