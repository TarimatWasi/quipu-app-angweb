import type { components } from '@core/api/bff.generated';
import { addDays, today } from './mock-dates';
import type { MockDb, PaymentRecord, StayRecord } from './mock-db';

type Schemas = components['schemas'];
export type ChargeStatus = Schemas['PeriodStatus']['status'];

/**
 * The detail of a payment hands each voucher with a signed URL (15 minutes, R2). The simulated BFF
 * has no storage: every voucher points to a sample of the mock build (src/mock-assets), an image
 * or a PDF by the type of its file, so A5.2 can show it and approve.
 */
function withSampleFile(proof: Schemas['AdminProof']): Schemas['AdminProof'] {
  if (proof.kind !== 'VOUCHER' || proof.fileUrl !== null) return proof;
  const pdf = proof.file?.contentType === 'application/pdf';
  return {
    ...proof,
    fileUrl: pdf ? '/mock-assets/voucher-muestra.pdf' : '/mock-assets/voucher-transferencia.svg',
  };
}

/** What a payment pays for: its contract month or its stay, with the amounts of the contract. */
export interface PaymentTarget {
  readonly expectedAmount: number;
  readonly environmentCode: string | null;
  readonly lastPeriod: boolean;
  readonly stay: StayRecord | undefined;
}

export function targetOf(db: MockDb, payment: PaymentRecord): PaymentTarget {
  const stay = db.stay(payment.stayId);
  if (stay !== undefined) {
    return {
      expectedAmount: stay.agreedAmount,
      environmentCode: db.environment(stay.environmentId)?.code ?? null,
      lastPeriod: true,
      stay,
    };
  }
  const contract = db.contract(payment.contractId);
  return {
    expectedAmount: contract?.monthlyAmount ?? 0,
    environmentCode: contract?.environmentCode ?? null,
    lastPeriod: contract?.endDate?.slice(0, 7) === payment.period,
    stay: undefined,
  };
}

/** PAID, UNDER_REVIEW, OVERDUE once `due` plus the grace days passed, else UNPAID (RN-10). */
export function chargeStatus(
  payment: PaymentRecord | undefined,
  due: string,
  graceDays: number,
): ChargeStatus {
  if (payment?.status === 'APPROVED') {
    return 'PAID';
  }
  if (payment?.status === 'PENDING') {
    return 'UNDER_REVIEW';
  }
  return addDays(due, graceDays) < today() ? 'OVERDUE' : 'UNPAID';
}

function sum(values: readonly number[]): number {
  return Math.round(values.reduce((total, value) => total + value, 0) * 100) / 100;
}

export function declaredAmount(payment: PaymentRecord): number {
  return sum(payment.proofs.map((proof) => proof.declaredAmount));
}

export function verifiedAmount(payment: PaymentRecord): number | null {
  return payment.status === 'APPROVED'
    ? sum(payment.proofs.map((proof) => proof.verifiedAmount ?? 0))
    : null;
}

/** The contract month or the stay of a payment, in the exclusive shape the contract declares. */
function paidFor(
  payment: PaymentRecord,
):
  | { contractId: string; period: string; stayId: null }
  | { stayId: string; contractId: null; period: null } {
  return payment.stayId === null
    ? { contractId: payment.contractId ?? '', period: payment.period ?? '', stayId: null }
    : { stayId: payment.stayId, contractId: null, period: null };
}

function guestName(db: MockDb, payment: PaymentRecord): string | null {
  return db.guest(payment.guestId)?.name ?? null;
}

/** The administrator's detail of a payment (getPayment, A5.2). */
export function paymentDetail(db: MockDb, payment: PaymentRecord): Schemas['Payment'] {
  const target = targetOf(db, payment);
  const guest = db.guest(payment.guestId);
  return {
    id: payment.id,
    guestId: payment.guestId,
    guestName: guestName(db, payment),
    documentNumber: guest?.documentNumber ?? '',
    guestType: guest?.type ?? 'CONTRACT',
    environmentCode: target.environmentCode,
    ...paidFor(payment),
    stayStartDate: target.stay?.startDate ?? null,
    stayEndDate: target.stay?.endDate ?? null,
    expectedAmount: target.expectedAmount,
    creditApplied: payment.creditApplied,
    amountDue: target.expectedAmount - payment.creditApplied,
    lastPeriod: target.lastPeriod,
    amount: declaredAmount(payment),
    verifiedAmount: verifiedAmount(payment),
    status: payment.status,
    rejectionReason: payment.rejectionReason,
    surplus: payment.surplus,
    reviewedAt: payment.reviewedAt,
    reviewedBy: payment.reviewedBy,
    submittedAt: payment.submittedAt,
    createdAt: payment.createdAt,
    proofs: payment.proofs.map(withSampleFile),
    reviews: payment.reviews,
  };
}

/** A row of the review queue (A5): no amounts. */
export function queueItem(db: MockDb, payment: PaymentRecord): Schemas['PaymentQueueItem'] {
  const detail = paymentDetail(db, payment);
  const vouchers = payment.proofs.filter((proof) => proof.kind === 'VOUCHER').length;
  const kind =
    payment.stayId === null
      ? {
          guestType: 'CONTRACT' as const,
          environmentCode: detail.environmentCode ?? '',
          period: payment.period ?? '',
        }
      : { guestType: 'TEMPORARY' as const, environmentCode: detail.environmentCode, period: null };
  return {
    id: detail.id,
    guestId: detail.guestId,
    guestName: detail.guestName,
    documentNumber: detail.documentNumber,
    ...kind,
    stayStartDate: detail.stayStartDate,
    stayEndDate: detail.stayEndDate,
    status: detail.status,
    proofCount: payment.proofs.length,
    voucherCount: vouchers,
    hasCash: vouchers < payment.proofs.length,
    reviewedBy: payment.reviewedBy,
    submittedAt: payment.submittedAt,
    createdAt: payment.createdAt,
  };
}

/** A payment without the URLs of its proofs, as lists and uploads answer it. */
export function paymentSummary(db: MockDb, payment: PaymentRecord): Schemas['PaymentSummary'] {
  const item = queueItem(db, payment);
  return {
    id: payment.id,
    guestId: payment.guestId,
    ...paidFor(payment),
    amount: declaredAmount(payment),
    verifiedAmount: verifiedAmount(payment),
    status: payment.status,
    rejectionReason: payment.rejectionReason,
    proofCount: item.proofCount,
    voucherCount: item.voucherCount,
    hasCash: item.hasCash,
    reviewedAt: payment.reviewedAt,
    submittedAt: payment.submittedAt,
    createdAt: payment.createdAt,
  };
}

function toGuestProof(proof: Schemas['AdminProof']): Schemas['GuestProof'] {
  return {
    id: proof.id,
    kind: proof.kind,
    method: proof.method ?? null,
    declaredAmount: proof.declaredAmount,
    verifiedAmount: proof.verifiedAmount,
    uploadedBy: proof.uploadedBy,
    addedAt: proof.addedAt,
    receivedOn: proof.receivedOn ?? null,
    file: proof.file ?? null,
  };
}

/** The payment as its own guest sees it (H3, T2): no voucher URLs and no reviewer. */
export function guestPayment(db: MockDb, payment: PaymentRecord): Schemas['GuestPayment'] {
  const detail = paymentDetail(db, payment);
  return {
    id: detail.id,
    contractId: detail.contractId,
    stayId: detail.stayId,
    period: detail.period,
    stayStartDate: detail.stayStartDate,
    stayEndDate: detail.stayEndDate,
    status: detail.status,
    amount: detail.amount,
    verifiedAmount: detail.verifiedAmount,
    creditApplied: detail.creditApplied,
    amountDue: detail.amountDue,
    surplus: detail.surplus,
    rejectionReason: detail.rejectionReason,
    submittedAt: detail.submittedAt,
    createdAt: detail.createdAt,
    proofs: payment.proofs.map(toGuestProof),
    reviews: payment.reviews,
  };
}
