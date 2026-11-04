import type { components, operations } from '@core/api/bff.generated';
import { contractPeriods, payablePeriods } from '../data/account-views';
import { nowInstant, today } from '../data/mock-dates';
import type { MockDb, PaymentRecord } from '../data/mock-db';
import { paymentDetail, paymentSummary, queueItem } from '../data/payment-views';
import { readProofsUpload } from '../mock-multipart';
import { invalid, notFound, ok, paginate, raise } from '../mock-reply';
import type { MockRequest, MockRoute } from '../mock-types';
import {
  approve,
  checkTargetFree,
  createPayment,
  PaymentTarget,
  proofsFrom,
  reject,
} from './payment-actions';

type ResolveBody = operations['resolvePayment']['requestBody']['content']['application/json'];
type QueueStatus = components['schemas']['PaymentQueueItem']['status'];

const QUEUE_STATUSES = new Set<string>(['PENDING', 'APPROVED', 'REJECTED']);

function isQueueStatus(value: string): value is QueueStatus {
  return QUEUE_STATUSES.has(value);
}

function paymentOf(db: MockDb, req: MockRequest): PaymentRecord {
  return db.payment(req.params['id'] ?? '') ?? notFound();
}

function resolve(db: MockDb, payment: PaymentRecord, body: Partial<ResolveBody>): void {
  if (payment.status === 'APPROVED') {
    raise(409, 'PAYMENT_ALREADY_RESOLVED', 'Este pago ya fue resuelto por otra persona.');
  }
  if (body.status === 'REJECTED') {
    const reason = body.reason?.trim() ?? '';
    if (reason === '') {
      raise(400, 'PAYMENT_REASON_REQUIRED', 'Indica el motivo del rechazo.', 'reason');
    }
    reject(payment, reason);
    return;
  }
  if (body.status !== 'APPROVED' || !Array.isArray(body.proofs)) {
    invalid(body.status === 'APPROVED' ? 'proofs' : 'status');
  }
  approve(db, payment, new Map(body.proofs.map((proof) => [proof.id, proof.verifiedAmount])));
}

/** `period` or `stayId` of a direct payment, exactly one, belonging to the guest (A5.1). */
function directTarget(
  db: MockDb,
  guestId: string,
  fields: (name: string) => string | null,
): PaymentTarget {
  const period = fields('period');
  const stayId = fields('stayId');
  if ((period === null) === (stayId === null)) {
    return invalid('period');
  }
  if (stayId !== null) {
    const stay = db.stay(stayId);
    return stay?.guestId === guestId
      ? { stayId }
      : raise(404, 'STAY_NOT_FOUND', 'No encontramos esa estadía.');
  }
  const contract = db.contractOf(guestId);
  return contract === undefined || period === null
    ? invalid('period')
    : { contractId: contract.id, period };
}

/** What is due for a stay, or for a month after the credit of the guest (RN-38). */
function chargeOf(db: MockDb, target: PaymentTarget): { amountDue: number; creditApplied: number } {
  if ('stayId' in target) {
    return { amountDue: db.stay(target.stayId)?.agreedAmount ?? 0, creditApplied: 0 };
  }
  const contract = db.contract(target.contractId);
  const charged = (contract ? contractPeriods(db, contract) : []).find(
    (item) => item.period === target.period,
  );
  if (charged === undefined) {
    return invalid('period');
  }
  if (charged.status === 'PAID') {
    raise(
      409,
      'PAYMENT_ALREADY_EXISTS_FOR_PERIOD',
      'El crédito del huésped ya cubre este período.',
    );
  }
  return { amountDue: charged.amountDue, creditApplied: charged.creditApplied };
}

async function createDirect(db: MockDb, req: MockRequest): Promise<PaymentRecord> {
  const upload = await readProofsUpload(req.body);
  const guestId = upload.field('guestId') ?? invalid('guestId');
  if (db.guest(guestId) === undefined) {
    raise(404, 'GUEST_NOT_FOUND', 'No encontramos al huésped.');
  }
  const target = directTarget(db, guestId, upload.field);
  const receivedOn = upload.field('receivedOn') ?? today();
  if (receivedOn > today()) {
    invalid('receivedOn');
  }
  checkTargetFree(db, target);
  const { amountDue, creditApplied } = chargeOf(db, target);
  const proofs = proofsFrom(db, upload, 'ADMIN').map((proof) => ({ ...proof, receivedOn }));
  if (proofs.reduce((sum, proof) => sum + proof.declaredAmount, 0) < amountDue) {
    invalid('proofs');
  }
  const payment = createPayment(db, guestId, target, proofs, creditApplied);
  approve(db, payment, new Map(proofs.map((proof) => [proof.id, proof.declaredAmount])));
  return payment;
}

/** The review queue (A5), the review (A5.2) and the direct payment (A5.1). */
export const ADMIN_PAYMENT_ROUTES: readonly MockRoute[] = [
  {
    key: 'GET /bff/admin/payments',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const status = req.query.get('status');
      if (status !== null && !isQueueStatus(status)) {
        invalid('status');
      }
      const items = ctx.db.data.payments
        .filter((payment) => status === null || payment.status === status)
        .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
        .map((payment) => queueItem(ctx.db, payment));
      return ok(paginate(items, req.query));
    },
  },
  {
    key: 'GET /bff/admin/payments/{id}',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      return ok(paymentDetail(ctx.db, paymentOf(ctx.db, req)));
    },
  },
  {
    key: 'PATCH /bff/admin/payments/{id}',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const payment = paymentOf(ctx.db, req);
      resolve(ctx.db, payment, req.body ?? {});
      return ok(paymentSummary(ctx.db, payment));
    },
  },
  {
    key: 'PUT /bff/admin/payments/{id}/proofs',
    versioned: true,
    handler: async (req, ctx) => {
      ctx.requireAdmin();
      const payment = paymentOf(ctx.db, req);
      if (payment.status === 'APPROVED') {
        raise(409, 'PAYMENT_NOT_CORRECTABLE', 'Un pago aprobado ya no se puede corregir.');
      }
      const upload = await readProofsUpload(req.body);
      payment.proofs = proofsFrom(ctx.db, upload, 'ADMIN', payment.proofs);
      payment.submittedAt = nowInstant();
      return ok(paymentSummary(ctx.db, payment));
    },
  },
  {
    key: 'POST /bff/admin/payments',
    handler: async (req, ctx) => {
      ctx.requireAdmin();
      return ok(paymentSummary(ctx.db, await createDirect(ctx.db, req)), 201);
    },
  },
  {
    key: 'GET /bff/admin/guests/{id}/payable-periods',
    handler: (req, ctx) => {
      ctx.requireAdmin();
      const guestId = req.params['id'] ?? '';
      return ctx.db.guest(guestId) === undefined ? notFound() : ok(payablePeriods(ctx.db, guestId));
    },
  },
];
