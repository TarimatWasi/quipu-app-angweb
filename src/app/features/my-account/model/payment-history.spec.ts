import type { components } from '@core/api/bff.generated';
import {
  creditHeading,
  DEFAULT_SORT,
  hasFilters,
  NO_FILTERS,
  toRows,
  visibleRows,
} from './payment-history';

type Item = components['schemas']['GuestHistoryItem'];
type Payment = components['schemas']['GuestPayment'];

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'p1',
    contractId: 'c1',
    stayId: null,
    period: '2026-10',
    status: 'APPROVED',
    amount: 850,
    verifiedAmount: 850,
    creditApplied: 0,
    amountDue: 850,
    surplus: null,
    rejectionReason: null,
    submittedAt: '2026-10-04T15:00:00Z',
    createdAt: '2026-10-04T15:00:00Z',
    proofs: [
      {
        id: 'x',
        kind: 'VOUCHER',
        method: 'Yape',
        declaredAmount: 850,
        verifiedAmount: 850,
        uploadedBy: 'GUEST',
        addedAt: '2026-10-04T15:00:00Z',
        file: null,
      },
    ],
    reviews: [{ decision: 'APPROVED', reason: null, at: '2026-10-05T15:00:00Z' }],
    ...overrides,
  };
}

const paymentItem = (p: Payment): Item => ({ kind: 'PAYMENT', payment: p, refund: null });
const refundItem = (fromPaymentId: string): Item => ({
  kind: 'REFUND',
  payment: null,
  refund: {
    id: 'r1',
    date: '2026-10-29',
    method: 'Yape',
    amount: 50,
    fromPaymentId,
    fromPeriod: '2026-10',
  },
});

describe('H4 history rows', () => {
  it('tells a refund inside the payment it came out of, and as a row of its own', () => {
    const rows = toRows([
      refundItem('p1'),
      paymentItem(payment({ surplus: { amount: 50, outcome: 'REFUNDED' } })),
    ]);

    expect(rows.map((row) => row.state)).toEqual(['REFUND', 'APPROVED']);
    expect(rows[1]?.outcome).toBe('Sobraron S/ 50.00: Quipu te los devolvió el 29 oct por Yape.');
    expect(rows[1]?.events.map((event) => event.text)).toEqual([
      'Enviaste el pago.',
      'La administración lo aprobó.',
      'Quipu te devolvió S/ 50.00 por Yape.',
    ]);
    expect(rows[0]?.detail).toBe(false);
  });

  it('says a payment registered by the administration as such, and a pending credit as promised', () => {
    const [row] = toRows([
      paymentItem(
        payment({
          surplus: { amount: 30, outcome: 'REFUND_PENDING' },
          proofs: [
            {
              id: 'c',
              kind: 'CASH',
              declaredAmount: 850,
              verifiedAmount: 850,
              uploadedBy: 'ADMIN',
              addedAt: '2026-10-03T15:00:00Z',
              receivedOn: '2026-10-03',
              file: null,
            },
          ],
        }),
      ),
    ]);

    expect(row?.sub).toBe('Registrado por la administración');
    expect(row?.what).toBe('Efectivo');
    expect(row?.proofs[0]?.detail).toBe('Registrado por la administración · recibido el 3 oct');
    expect(row?.events.map((event) => event.text)).toEqual([
      'La administración registró tu pago y lo aprobó.',
    ]);
    expect(row?.outcome).toBe('Sobraron S/ 30.00: te los devolveremos.');
  });

  it('shows what was sent while a payment is not approved and what was verified after', () => {
    const [pending, approved] = toRows([
      paymentItem(payment({ status: 'PENDING', verifiedAmount: null, amount: 800 })),
      paymentItem(payment({ id: 'p2', amount: 800, verifiedAmount: 850 })),
    ]);

    expect([pending?.amount, pending?.amountNote]).toEqual(['S/ 800.00', 'enviado']);
    expect([approved?.amount, approved?.amountNote]).toEqual(['S/ 850.00', 'verificado']);
  });

  it('filters by state, puts the newest first and orders by amount', () => {
    const rows = toRows([
      paymentItem(
        payment({
          id: 'old',
          submittedAt: '2026-08-04T15:00:00Z',
          amount: 900,
          verifiedAmount: 900,
        }),
      ),
      paymentItem(payment({ id: 'new', status: 'REJECTED', verifiedAmount: null })),
      refundItem('new'),
    ]);

    expect(visibleRows(rows, NO_FILTERS, DEFAULT_SORT).map((row) => row.id)).toEqual([
      'refund-r1',
      'new',
      'old',
    ]);
    expect(
      visibleRows(rows, { search: '', state: 'REJECTED' }, DEFAULT_SORT).map((row) => row.id),
    ).toEqual(['new']);
    expect(
      visibleRows(rows, NO_FILTERS, { key: 'amount', direction: 'desc' }).map((row) => row.id),
    ).toEqual(['old', 'new', 'refund-r1']);
    expect(hasFilters({ search: '', state: 'REFUND' })).toBe(true);
    expect(hasFilters(NO_FILTERS)).toBe(false);
  });

  it('says the credit only when there is some', () => {
    expect(creditHeading(0)).toBeNull();
    expect(creditHeading(20)).toBe('Tienes S/ 20.00 a favor.');
  });
});
