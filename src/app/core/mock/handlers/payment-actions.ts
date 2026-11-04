// What the payment handlers of the administrator and of the guests share: building proofs from an
// upload, creating a payment and approving one. Every mutation changes the data in memory, so the
// next reads (queue, detail, account status) answer the new state.
import { ADMIN_REVIEWER } from '../data/demo-users';
import { nowInstant } from '../data/mock-dates';
import { ID_KIND } from '../data/mock-db';
import type { AdminProof, MockDb, PaymentRecord } from '../data/mock-db';
import { paymentDetail } from '../data/payment-views';
import type { ProofsUpload } from '../mock-multipart';
import { invalid, raise } from '../mock-reply';

export type Uploader = AdminProof['uploadedBy'];
export type PaymentTarget = { contractId: string; period: string } | { stayId: string };

function newProof(db: MockDb, upload: ProofsUpload, index: number, by: Uploader): AdminProof {
  const edit = upload.proofs[index];
  const file = edit?.fileIndex === undefined ? null : (upload.files[edit.fileIndex] ?? null);
  return {
    id: db.newId(ID_KIND.proof),
    kind: edit?.kind ?? 'CASH',
    method: edit?.kind === 'CASH' ? 'Efectivo' : (edit?.method ?? null),
    declaredAmount: edit?.amount ?? 0,
    verifiedAmount: null,
    uploadedBy: by,
    addedAt: nowInstant(),
    receivedOn: null,
    file,
    fileUrl: null,
  };
}

/**
 * The whole new set of proofs of a correction: a proof with `id` is kept (its amount, method and,
 * with `fileIndex`, its file change); one without `id` is new.
 */
export function proofsFrom(
  db: MockDb,
  upload: ProofsUpload,
  by: Uploader,
  existing: readonly AdminProof[] = [],
): AdminProof[] {
  return upload.proofs.map((edit, index) => {
    if (edit.id === undefined) {
      return newProof(db, upload, index, by);
    }
    const kept = existing.find((proof) => proof.id === edit.id);
    if (kept === undefined) {
      return invalid(`proofs[${String(index)}].id`);
    }
    const file = edit.fileIndex === undefined ? kept.file : (upload.files[edit.fileIndex] ?? null);
    return {
      ...kept,
      kind: edit.kind,
      method: edit.method ?? kept.method ?? null,
      declaredAmount: edit.amount,
      verifiedAmount: null,
      file,
    };
  });
}

/** The 409 of the contract when the period or the stay already has a live payment (RN-02, RN-15). */
export function checkTargetFree(db: MockDb, target: PaymentTarget): void {
  const existing = db.paymentFor(target);
  if (existing?.status === 'APPROVED') {
    raise(409, 'PAYMENT_ALREADY_EXISTS_FOR_PERIOD', 'Este período ya tiene un pago aprobado.');
  }
  if (existing !== undefined) {
    raise(
      409,
      'VOUCHER_ALREADY_EXISTS',
      'Ya hay un pago enviado para este período; corrígelo en lugar de enviar otro.',
    );
  }
}

export function createPayment(
  db: MockDb,
  guestId: string,
  target: PaymentTarget,
  proofs: AdminProof[],
): PaymentRecord {
  const now = nowInstant();
  const payment: PaymentRecord = {
    id: db.newId(ID_KIND.payment),
    guestId,
    contractId: 'contractId' in target ? target.contractId : null,
    stayId: 'stayId' in target ? target.stayId : null,
    period: 'period' in target ? target.period : null,
    status: 'PENDING',
    proofs,
    reviews: [],
    rejectionReason: null,
    reviewedAt: null,
    reviewedBy: null,
    surplus: null,
    submittedAt: now,
    createdAt: now,
    creditApplied: 0,
  };
  db.data.payments.push(payment);
  return payment;
}

/**
 * Approves with the verified amount of each proof (RN-16): every proof needs one and their sum must
 * cover what is due. What is left over becomes credit, or a refund for a last period or a stay.
 */
export function approve(
  db: MockDb,
  payment: PaymentRecord,
  verified: ReadonlyMap<string, number>,
): void {
  if (payment.proofs.some((proof) => !verified.has(proof.id))) {
    invalid('proofs');
  }
  const proofs = payment.proofs.map((proof) => ({
    ...proof,
    verifiedAmount: verified.get(proof.id) ?? 0,
  }));
  const total = proofs.reduce((sum, proof) => sum + proof.verifiedAmount, 0);
  const { amountDue, lastPeriod } = paymentDetail(db, payment);
  if (total < amountDue) {
    invalid('proofs');
  }
  const now = nowInstant();
  const left = Math.round((total - amountDue) * 100) / 100;
  payment.proofs = proofs;
  payment.status = 'APPROVED';
  payment.rejectionReason = null;
  payment.reviewedAt = now;
  payment.reviewedBy = ADMIN_REVIEWER;
  payment.reviews = [...payment.reviews, { decision: 'APPROVED', reason: null, at: now }];
  payment.surplus =
    left > 0 ? { amount: left, outcome: lastPeriod ? 'REFUND_PENDING' : 'CREDIT' } : null;
  if (payment.surplus?.outcome === 'CREDIT') {
    db.credit(payment.guestId).balance += left;
  }
}

export function reject(payment: PaymentRecord, reason: string): void {
  const now = nowInstant();
  payment.status = 'REJECTED';
  payment.rejectionReason = reason;
  payment.reviewedAt = now;
  payment.reviewedBy = ADMIN_REVIEWER;
  payment.reviews = [...payment.reviews, { decision: 'REJECTED', reason, at: now }];
}
