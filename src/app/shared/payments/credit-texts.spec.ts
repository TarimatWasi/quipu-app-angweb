import {
  coveredAmountText,
  creditAppliedText,
  creditBalanceText,
  creditOriginText,
  creditUseText,
  dueBreakdownText,
  surplusText,
} from './credit-texts';

describe('credit-texts', () => {
  it('says how much credit the guest has (H1, RN-38)', () => {
    expect(creditBalanceText(150)).toBe('Tienes S/ 150.00 a favor.');
    expect(creditBalanceText(1200.5)).toBe('Tienes S/ 1,200.50 a favor.');
  });

  it('names the month of each payment the credit was left over from, oldest first (TAR-284)', () => {
    const origin = (period: string, amount = 10) => ({
      paymentId: `pay_${period}`,
      period,
      amount,
    });
    expect(creditOriginText([])).toBe('de un pago anterior');
    expect(creditOriginText([origin('2026-10')])).toBe('de tu pago de octubre');
    expect(creditOriginText([origin('2026-09'), origin('2026-10')])).toBe(
      'de tus pagos de septiembre y octubre',
    );
    expect(creditOriginText([origin('2026-08'), origin('2026-09'), origin('2026-10')])).toBe(
      'de tus pagos de agosto, septiembre y octubre',
    );
    expect(
      creditOriginText([
        origin('2026-07'),
        origin('2026-08'),
        origin('2026-09'),
        origin('2026-10'),
      ]),
    ).toBe('de tus pagos de julio, agosto, septiembre y octubre');
  });

  it('names a month once when two payments of it left credit', () => {
    const origin = (paymentId: string, period: string) => ({ paymentId, period, amount: 10 });
    expect(creditOriginText([origin('a', '2026-10'), origin('b', '2026-10')])).toBe(
      'de tus pagos de octubre',
    );
    expect(
      creditOriginText([origin('a', '2026-09'), origin('b', '2026-10'), origin('c', '2026-10')]),
    ).toBe('de tus pagos de septiembre y octubre');
  });

  it('keeps the months in order and adds the year only when they span two years', () => {
    const origin = (period: string) => ({ paymentId: `pay_${period}`, period, amount: 10 });
    expect(creditOriginText([origin('2026-10'), origin('2026-09')])).toBe(
      'de tus pagos de septiembre y octubre',
    );
    expect(creditOriginText([origin('2025-12'), origin('2026-01')])).toBe(
      'de tus pagos de diciembre 2025 y enero 2026',
    );
  });

  it('leaves out a period it cannot read, and says «un pago anterior» when none is left', () => {
    const origin = (period: string) => ({ paymentId: `pay_${period}`, period, amount: 10 });
    expect(creditOriginText([origin('2026-13'), origin('2026-10')])).toBe('de tu pago de octubre');
    expect(creditOriginText([origin('octubre')])).toBe('de un pago anterior');
  });

  it('says where the credit is discounted, or that it will be refunded', () => {
    expect(creditUseText({ toRefund: false, month: '2026-11', origins: [] })).toBe(
      'Sobró de un pago anterior y se descuenta de Noviembre 2026.',
    );
    expect(creditUseText({ toRefund: false, month: null, origins: [] })).toBe(
      'Sobró de un pago anterior y se descuenta de tu próxima cuota.',
    );
    expect(creditUseText({ toRefund: true, month: '2026-11', origins: [] })).toBe(
      'Sobró de un pago anterior y ya no quedan meses donde descontarlo: te lo devolveremos.',
    );
  });

  it('says which month the credit was left over from (H1, TAR-284)', () => {
    const origins = [
      { paymentId: 'pay_1', period: '2026-09', amount: 20 },
      { paymentId: 'pay_2', period: '2026-10', amount: 30 },
    ];
    expect(creditUseText({ toRefund: false, month: null, origins: origins.slice(1) })).toBe(
      'Sobró de tu pago de octubre y se descuenta de tu próxima cuota.',
    );
    expect(creditUseText({ toRefund: false, month: '2026-11', origins })).toBe(
      'Sobró de tus pagos de septiembre y octubre y se descuenta de Noviembre 2026.',
    );
  });

  it('explains the credit discounted from a month (H3)', () => {
    expect(creditAppliedText(50)).toBe(
      'Se descuentan S/ 50.00 de tu crédito a favor, que sobró de un pago anterior.',
    );
  });

  it('names what a payment already sent covers, without asking to pay it (H3 read-only)', () => {
    expect(coveredAmountText(300)).toBe('A cubrir con este pago S/ 300.00');
    expect(coveredAmountText(300)).not.toContain('Por pagar');
  });

  it('breaks what is left to pay into monthly amount and credit only when there is credit', () => {
    expect(dueBreakdownText({ amount: 350, creditApplied: 50 })).toBe(
      'Cuota S/ 350.00 − crédito a favor S/ 50.00',
    );
    expect(dueBreakdownText({ amount: 350, creditApplied: 0 })).toBeNull();
  });

  it('says the refund of a stay, pending or made with its method and date (T1, RN-39)', () => {
    expect(surplusText({ amount: 50, refundStatus: 'PENDING' })).toBe('Te devolveremos S/ 50.00.');
    expect(
      surplusText({
        amount: 50,
        refundStatus: 'REFUNDED',
        refundedOn: '2026-11-03',
        refundMethod: 'Yape',
      }),
    ).toBe('Te devolvimos S/ 50.00 el 3 nov 2026 por Yape.');
    expect(surplusText({ amount: 50, refundStatus: 'REFUNDED', refundMethod: 'Yape' })).toBe(
      'Te devolvimos S/ 50.00 por Yape.',
    );
    expect(
      surplusText({ amount: 50, refundStatus: 'REFUNDED', refundedOn: null, refundMethod: null }),
    ).toBe('Te devolvimos S/ 50.00.');
  });
});
