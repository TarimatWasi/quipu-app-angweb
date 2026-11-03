import {
  balanceOf,
  formatDateTime,
  formatMoney,
  formatPeriod,
  formatStay,
  parseAmount,
  periodLabel,
  proofsSummary,
} from './payment-format';

describe('payment-format', () => {
  it('names a month of a contract in Spanish', () => {
    expect(formatPeriod('2026-09')).toBe('Septiembre 2026');
    expect(formatPeriod('2027-01')).toBe('Enero 2027');
  });

  it('keeps a period it cannot read as it came', () => {
    expect(formatPeriod('2026-13')).toBe('2026-13');
    expect(formatPeriod('sep')).toBe('sep');
  });

  it('writes the dates of a stay the short way (TAR-237)', () => {
    expect(formatStay('2026-10-20', '2026-10-31')).toBe('20 – 31 oct');
    expect(formatStay('2026-10-28', '2026-11-03')).toBe('28 oct – 3 nov');
    expect(formatStay('2026-12-28', '2027-01-03')).toBe('28 dic 2026 – 3 ene 2027');
  });

  it('picks the period, else the stay, else a dash', () => {
    expect(periodLabel({ period: '2026-09', stayStartDate: null, stayEndDate: null })).toBe(
      'Septiembre 2026',
    );
    expect(
      periodLabel({ period: null, stayStartDate: '2026-10-20', stayEndDate: '2026-10-31' }),
    ).toBe('20 – 31 oct');
    expect(periodLabel({ period: null, stayStartDate: null, stayEndDate: null })).toBe('—');
  });

  it('shows a moment in the time of Lima', () => {
    expect(formatDateTime('2026-11-03T19:05:00Z')).toBe('3 nov 2026, 14:05');
    expect(formatDateTime('2026-11-01T03:30:00Z')).toBe('31 oct 2026, 22:30');
    expect(formatDateTime('no-es-fecha')).toBe('—');
  });

  it('writes soles with two decimals and thousands', () => {
    expect(formatMoney(350)).toBe('S/ 350.00');
    expect(formatMoney(1350.5)).toBe('S/ 1,350.50');
    expect(formatMoney(0)).toBe('S/ 0.00');
  });

  it('summarizes the proofs of a row without the amount (A5)', () => {
    expect(proofsSummary(2, false)).toBe('2 vouchers');
    expect(proofsSummary(1, false)).toBe('1 voucher');
    expect(proofsSummary(1, true)).toBe('1 voucher y efectivo');
    expect(proofsSummary(0, true)).toBe('Efectivo');
    expect(proofsSummary(0, false)).toBe('Sin comprobantes');
  });

  it('reads an amount in soles, zero included, with at most two decimals', () => {
    expect(parseAmount('350')).toBe(350);
    expect(parseAmount(' 12.5 ')).toBe(12.5);
    expect(parseAmount('0')).toBe(0);
    expect(parseAmount('1,5')).toBe(1.5);
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('-1')).toBeNull();
    expect(parseAmount('1.234')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('1e3')).toBeNull();
  });

  it('compares the verified sum with what is due (RN-16, RN-38)', () => {
    expect(balanceOf(350, 350, false)).toEqual({ kind: 'complete', difference: 0 });
    expect(balanceOf(300, 350, false)).toEqual({ kind: 'short', difference: 50 });
    expect(balanceOf(400, 350, false)).toEqual({ kind: 'over', difference: 50, refund: false });
    expect(balanceOf(400, 350, true)).toEqual({ kind: 'over', difference: 50, refund: true });
    // Cents are compared exactly, without floating point drift.
    expect(balanceOf(0.1 + 0.2, 0.3, false)).toEqual({ kind: 'complete', difference: 0 });
  });
});
