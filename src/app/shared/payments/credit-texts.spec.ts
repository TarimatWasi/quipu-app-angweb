import {
  creditAppliedText,
  creditBalanceText,
  creditUseText,
  dueBreakdownText,
  surplusText,
} from './credit-texts';

describe('credit-texts', () => {
  it('says how much credit the guest has (H1, RN-38)', () => {
    expect(creditBalanceText(150)).toBe('Tienes S/ 150.00 a favor.');
    expect(creditBalanceText(1200.5)).toBe('Tienes S/ 1,200.50 a favor.');
  });

  it('says where the credit is discounted, or that it will be refunded', () => {
    expect(creditUseText({ toRefund: false, month: '2026-11' })).toBe(
      'Sobró de un pago anterior y se descuenta de Noviembre 2026.',
    );
    expect(creditUseText({ toRefund: false, month: null })).toBe(
      'Sobró de un pago anterior y se descuenta de tu próxima cuota.',
    );
    expect(creditUseText({ toRefund: true, month: '2026-11' })).toBe(
      'Sobró de un pago anterior y ya no quedan meses donde descontarlo: te lo devolveremos.',
    );
  });

  it('explains the credit discounted from a month (H3)', () => {
    expect(creditAppliedText(50)).toBe(
      'Se descuentan S/ 50.00 de tu crédito a favor, que sobró de un pago anterior.',
    );
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
