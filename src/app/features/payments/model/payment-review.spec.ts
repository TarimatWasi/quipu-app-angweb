import type { components } from '@core/api/bff.generated';
import {
  approvedNotice,
  balanceNotice,
  decisionHelp,
  fileSize,
  payingFacts,
  proofEntries,
  resolvedText,
  verifiedTotal,
} from './payment-review';

type AdminProof = components['schemas']['AdminProof'];
type PaymentDetail = components['schemas']['Payment'];

function proof(overrides: Partial<AdminProof> = {}): AdminProof {
  return {
    id: 'p1',
    kind: 'VOUCHER',
    method: 'Yape',
    declaredAmount: 400,
    verifiedAmount: null,
    uploadedBy: 'GUEST',
    addedAt: '2026-10-26T14:14:00Z',
    file: { name: 'yape.jpg', contentType: 'image/jpeg', sizeBytes: 1_468_006 },
    fileUrl: 'https://r2.example.test/yape',
    ...overrides,
  };
}

function payment(overrides: Partial<PaymentDetail> = {}): PaymentDetail {
  return {
    id: 'pay_1',
    guestId: 'g1',
    guestName: 'Pedro Ccori',
    documentNumber: '41239876',
    guestType: 'CONTRACT',
    environmentCode: '105',
    contractId: 'c1',
    stayId: null,
    period: '2026-10',
    stayStartDate: null,
    stayEndDate: null,
    expectedAmount: 650,
    creditApplied: 0,
    amountDue: 650,
    lastPeriod: false,
    amount: 650,
    verifiedAmount: null,
    status: 'PENDING',
    reviewedBy: null,
    submittedAt: '2026-10-26T14:14:00Z',
    createdAt: '2026-10-26T14:14:00Z',
    proofs: [],
    reviews: [],
    ...overrides,
  } as PaymentDetail;
}

describe('A5.2 review model', () => {
  it('numbers the proofs within their kind and says how each one is shown', () => {
    const entries = proofEntries([
      proof(),
      proof({
        id: 'p2',
        method: null,
        file: { name: 'bcp.pdf', contentType: 'application/pdf', sizeBytes: 245_760 },
      }),
      proof({
        id: 'p3',
        kind: 'CASH',
        method: null,
        file: null,
        fileUrl: null,
        uploadedBy: 'ADMIN',
      }),
      proof({ id: 'p4', fileUrl: null }),
    ]);

    expect(entries.map((entry) => [entry.title, entry.view])).toEqual([
      ['Voucher 1', 'image'],
      ['Voucher 2', 'pdf'],
      ['Efectivo', 'cash'],
      ['Voucher 3', 'missing'],
    ]);
    expect(entries[0]).toMatchObject({
      declared: 'S/ 400.00',
      method: 'Yape',
      fileMeta: 'Imagen JPG · 1.4 MB',
      by: 'Subido por el huésped',
      byAdmin: false,
      verified: null,
      corrected: false,
    });
    expect(entries[1]?.fileMeta).toBe('PDF · 240 KB');
    expect(entries[2]).toMatchObject({ by: 'Agregado por la administración', byAdmin: true });
  });

  it('marks a verified amount that differs from the declared one as corrected', () => {
    const [entry] = proofEntries([proof({ verifiedAmount: 350 })]);
    expect(entry).toMatchObject({ verified: 'S/ 350.00', corrected: true });
    expect(fileSize(500)).toBe('1 KB');
  });

  it('adds the verified amounts typed, ignoring what is not an amount', () => {
    const proofs = [proof(), proof({ id: 'p2' })];
    expect(verifiedTotal(proofs, { p1: '400', p2: '250.50' })).toBe(650.5);
    expect(verifiedTotal(proofs, { p1: '400', p2: 'abc' })).toBe(400);
  });

  it('shows what is paid, and what is left after the credit', () => {
    expect(payingFacts(payment())).toEqual({
      name: 'Pedro Ccori',
      document: '41239876',
      type: 'Contrato',
      environment: '105',
      whatLabel: 'Mes',
      what: 'Octubre 2026',
      dueLabel: 'Cuota',
      due: 'S/ 650.00',
      creditNote: null,
    });
    const credited = payingFacts(payment({ creditApplied: 40, amountDue: 610 }));
    expect(credited).toMatchObject({ dueLabel: 'Por pagar', due: 'S/ 610.00' });
    expect(credited.creditNote).toBe('Cuota S/ 650.00 − crédito a favor S/ 40.00 (RN-38).');
    const stay = payingFacts(
      payment({
        guestType: 'TEMPORARY',
        period: null,
        stayStartDate: '2026-10-30',
        stayEndDate: '2026-11-02',
      }),
    );
    expect(stay).toMatchObject({ type: 'Temporal', whatLabel: 'Estadía', what: '30 oct – 2 nov' });
  });

  it('says whether the verified sum is complete, short or leaves something over', () => {
    expect(balanceNotice({ kind: 'complete', difference: 0 }, false)).toEqual({
      tone: 'success',
      heading: 'Completo.',
      text: 'Lo verificado cubre la cuota.',
    });
    expect(balanceNotice({ kind: 'short', difference: 100 }, false)).toMatchObject({
      tone: 'error',
      heading: 'Faltan S/ 100.00.',
    });
    expect(balanceNotice({ kind: 'over', difference: 50, refund: true }, true).text).toContain(
      'devolución',
    );
    expect(balanceNotice({ kind: 'over', difference: 50, refund: false }, false).text).toContain(
      'crédito',
    );
    expect(approvedNotice({ amount: 20, outcome: 'REFUNDED' })).toEqual({
      tone: 'info',
      heading: 'Sobraron S/ 20.00.',
      text: 'Ya se devolvió.',
    });
  });

  it('says who resolved a payment and why approving is not possible', () => {
    expect(resolvedText('REJECTED', '2026-10-05T13:40:00Z', 'Rosa Quispe')).toBe(
      'Rechazado el 5 oct 2026, 08:40 por Rosa Quispe.',
    );
    expect(resolvedText('APPROVED', null, null)).toBe('Aprobado.');
    expect(decisionHelp({ kind: 'complete', difference: 0 }, true)).toBe(
      'Para aprobar, primero tienes que ver los vouchers.',
    );
    expect(decisionHelp({ kind: 'short', difference: 1 }, false)).toContain('no se aprueba');
    expect(decisionHelp(null, false)).toContain('montos verificados');
  });
});
