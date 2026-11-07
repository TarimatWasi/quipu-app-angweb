import type { components } from '@core/api/bff.generated';
import {
  contractPeriods,
  guestPeriods,
  creditLeft,
  creditOrigins,
  currentStay,
  periodStatus,
  stayView,
} from '../data/account-views';
import { nowInstant, today } from '../data/mock-dates';
import type { MockDb, PaymentRecord } from '../data/mock-db';
import { ownContracts } from '../data/guest-views';
import { guestPayment, paymentSummary } from '../data/payment-views';
import { readProofsUpload } from '../mock-multipart';
import { invalid, notFound, ok, paginate, raise } from '../mock-reply';
import type { GuestType, MockContext, MockRequest, MockRoute } from '../mock-types';
import { checkTargetFree, createPayment, proofsFrom } from './payment-actions';

type Schemas = components['schemas'];

/** A payment of the guest of the session; a payment of someone else is a 404 (RN-09). */
function ownPayment(ctx: MockContext, req: MockRequest, type: GuestType): PaymentRecord {
  const { guestId } = ctx.requireGuest(type);
  const payment = ctx.db.payment(req.params['id'] ?? '');
  return payment?.guestId === guestId ? payment : notFound();
}

/** Replaces the proofs of a rejected payment and sends it again (RN-05). */
async function correct(ctx: MockContext, req: MockRequest, type: GuestType) {
  const payment = ownPayment(ctx, req, type);
  if (payment.status !== 'REJECTED') {
    raise(409, 'PAYMENT_NOT_CORRECTABLE', 'Solo puedes corregir un pago rechazado.');
  }
  const upload = await readProofsUpload(req.body);
  payment.proofs = proofsFrom(ctx.db, upload, 'GUEST', payment.proofs);
  payment.status = 'PENDING';
  payment.rejectionReason = null;
  payment.submittedAt = nowInstant();
  return ok(paymentSummary(ctx.db, payment));
}

function history(db: MockDb, guestId: string): Schemas['GuestHistoryItem'][] {
  const payments = db.paymentsOf(guestId).map((payment) => ({
    at: payment.submittedAt,
    item: { kind: 'PAYMENT', payment: guestPayment(db, payment), refund: null } as const,
  }));
  const refunds = db.data.refunds
    .filter((refund) => refund.guestId === guestId)
    .map((refund) => ({
      at: `${refund.date}T23:59:59Z`,
      item: {
        kind: 'REFUND',
        payment: null,
        refund: {
          id: refund.id,
          date: refund.date,
          method: refund.method,
          amount: refund.amount,
          fromPaymentId: refund.fromPaymentId,
          fromPeriod: refund.fromPeriod ?? null,
        },
      } as const,
    }));
  return [...payments, ...refunds].sort((a, b) => b.at.localeCompare(a.at)).map(({ item }) => item);
}

async function uploadForPeriod(req: MockRequest, ctx: MockContext) {
  const { guestId } = ctx.requireGuest('CONTRACT');
  const upload = await readProofsUpload(req.body);
  const period = upload.field('period') ?? invalid('period');
  const contract = ctx.db.contractOf(guestId);
  if (contract === undefined) {
    return raise(403, 'VOUCHER_NO_ACTIVE_CONTRACT', 'No tienes un contrato vigente.');
  }
  const charged =
    contractPeriods(ctx.db, contract).find((item) => item.period === period) ?? invalid('period');
  const target = { contractId: contract.id, period };
  checkTargetFree(ctx.db, target);
  if (charged.status === 'PAID') {
    raise(409, 'PAYMENT_ALREADY_EXISTS_FOR_PERIOD', 'Tu crédito ya cubre este período.');
  }
  const proofs = proofsFrom(ctx.db, upload, 'GUEST');
  const payment = createPayment(ctx.db, guestId, target, proofs, charged.creditApplied);
  return ok(paymentSummary(ctx.db, payment), 201);
}

async function uploadForStay(req: MockRequest, ctx: MockContext) {
  const { guestId } = ctx.requireGuest('TEMPORARY');
  const upload = await readProofsUpload(req.body);
  const stay = currentStay(ctx.db, guestId);
  if (stay === undefined || stay.endDate < today()) {
    return raise(403, 'VOUCHER_NO_ACTIVE_STAY', 'No tienes una estadía vigente ni próxima.');
  }
  const target = { stayId: stay.id };
  checkTargetFree(ctx.db, target);
  const payment = createPayment(ctx.db, guestId, target, proofsFrom(ctx.db, upload, 'GUEST'));
  return ok(paymentSummary(ctx.db, payment), 201);
}

function stayPaymentStatus(db: MockDb, guestId: string): Schemas['StayPaymentStatus'] {
  const stay = currentStay(db, guestId) ?? notFound();
  const view = stayView(db, stay);
  const payment = view.paymentId === null ? undefined : db.payment(view.paymentId);
  return {
    stayId: stay.id,
    startDate: stay.startDate,
    endDate: stay.endDate,
    status: view.paymentStatus,
    agreedAmount: stay.agreedAmount,
    paymentId: view.paymentId,
    rejectionReason: payment?.status === 'REJECTED' ? payment.rejectionReason : null,
    surplus: payment?.surplus
      ? { amount: payment.surplus.amount, refundStatus: 'PENDING', refundedOn: null }
      : null,
  };
}

/** The guest with a contract (H1, H3, H4) and the temporary guest (T1, T2). */
export const GUEST_ROUTES: readonly MockRoute[] = [
  {
    key: 'GET /bff/guest/account-status',
    handler: (_req, ctx) => {
      const { guestId } = ctx.requireGuest('CONTRACT');
      return ok(guestPeriods(ctx.db, guestId).map(periodStatus));
    },
  },
  {
    key: 'GET /bff/guest/contract',
    handler: (_req, ctx) => {
      const { guestId } = ctx.requireGuest('CONTRACT');
      return ok(ownContracts(ctx.db, guestId) ?? notFound());
    },
  },
  {
    key: 'GET /bff/guest/credit',
    handler: (_req, ctx) => {
      const { guestId } = ctx.requireGuest('CONTRACT');
      const body: Schemas['GuestCredit'] = {
        balance: creditLeft(ctx.db, guestId),
        toRefund: false,
        origins: creditOrigins(ctx.db, guestId),
        lastRefund: ctx.db.credit(guestId).lastRefund,
      };
      return ok(body);
    },
  },
  {
    key: 'GET /bff/guest/payments',
    handler: (req, ctx) => {
      const { guestId } = ctx.requireGuest('CONTRACT');
      const body: Schemas['PagedGuestHistory'] = {
        ...paginate(history(ctx.db, guestId), req.query),
        creditBalance: creditLeft(ctx.db, guestId),
      };
      return ok(body);
    },
  },
  {
    key: 'GET /bff/guest/payments/{id}',
    handler: (req, ctx) => ok(guestPayment(ctx.db, ownPayment(ctx, req, 'CONTRACT'))),
  },
  { key: 'POST /bff/guest/payments', handler: uploadForPeriod },
  { key: 'PUT /bff/guest/payments/{id}', handler: (req, ctx) => correct(ctx, req, 'CONTRACT') },
  {
    key: 'GET /bff/temporary-guest/payment-status',
    handler: (_req, ctx) => ok(stayPaymentStatus(ctx.db, ctx.requireGuest('TEMPORARY').guestId)),
  },
  { key: 'POST /bff/temporary-guest/payments', handler: uploadForStay },
  {
    key: 'GET /bff/temporary-guest/payments/{id}',
    handler: (req, ctx) => ok(guestPayment(ctx.db, ownPayment(ctx, req, 'TEMPORARY'))),
  },
  {
    key: 'PUT /bff/temporary-guest/payments/{id}',
    handler: (req, ctx) => correct(ctx, req, 'TEMPORARY'),
  },
];
