import type { components } from '@core/api/bff.generated';
import { toGuestPaymentRow } from './guest-payments';

type PaymentSummary = components['schemas']['PaymentSummary'];

function payment(fields: Partial<PaymentSummary> = {}): PaymentSummary {
  return {
    id: 'p1',
    guestId: 'g1',
    contractId: 'c1',
    stayId: null,
    period: '2026-09',
    amount: 800,
    verifiedAmount: null,
    status: 'PENDING',
    rejectionReason: null,
    proofCount: 1,
    voucherCount: 1,
    hasCash: false,
    reviewedAt: null,
    submittedAt: '2026-09-05T15:00:00Z',
    createdAt: '2026-09-05T15:00:00Z',
    ...fields,
  } as PaymentSummary;
}

describe('the rows of «Historial de pagos» (A3.2)', () => {
  it('says the month, when it was sent, with what, the declared amount and «Revisar pago»', () => {
    expect(toGuestPaymentRow(payment())).toEqual({
      id: 'p1',
      month: 'Septiembre 2026',
      sent: 'Enviado el 5 sep 2026',
      proofs: '1 voucher',
      amount: 'S/ 800.00',
      badge: { label: 'Pendiente de revisión', tone: 'review' },
      reason: null,
      action: { label: 'Revisar pago', link: ['/admin/payments', 'p1'], query: null },
    });
  });

  it('shows the verified amount of an approved payment, or the declared one if it has none', () => {
    const approved = toGuestPaymentRow(
      payment({ status: 'APPROVED', verifiedAmount: 780, voucherCount: 0, hasCash: true }),
    );
    expect([approved.amount, approved.proofs]).toEqual(['S/ 780.00', 'Efectivo']);
    expect(approved.badge).toEqual({ label: 'Aprobado', tone: 'paid' });
    expect(approved.action.label).toBe('Ver pago');
    expect(toGuestPaymentRow(payment({ status: 'APPROVED' })).amount).toBe('S/ 800.00');
  });

  it('gives a rejected payment its reason and «Corregir pago», without a reason when it has none', () => {
    const rejected = toGuestPaymentRow(
      payment({ status: 'REJECTED', rejectionReason: ' No se lee el voucher. ' }),
    );
    expect(rejected.reason).toBe('Motivo: No se lee el voucher.');
    expect(rejected.badge).toEqual({ label: 'Rechazado', tone: 'rejected' });
    expect(rejected.action.label).toBe('Corregir pago');
    expect(toGuestPaymentRow(payment({ status: 'REJECTED', rejectionReason: '  ' })).reason).toBe(
      null,
    );
    // A reason left on a payment that is no longer rejected is not shown.
    expect(toGuestPaymentRow(payment({ rejectionReason: 'Antiguo' })).reason).toBeNull();
  });

  it('dates the sending in Lima, five hours behind', () => {
    expect(toGuestPaymentRow(payment({ submittedAt: '2026-10-01T03:00:00Z' })).sent).toBe(
      'Enviado el 30 sep 2026',
    );
  });
});
