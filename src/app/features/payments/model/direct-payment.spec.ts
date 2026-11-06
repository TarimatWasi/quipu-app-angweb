import type { components } from '@core/api/bff.generated';
import { payingNote, payingTiles, receivedNotice } from './direct-payment';

type PayablePeriod = components['schemas']['PayablePeriod'];

function period(overrides: Partial<PayablePeriod> = {}): PayablePeriod {
  return {
    contractId: 'c1',
    period: '2026-10',
    stayId: null,
    stayStartDate: null,
    stayEndDate: null,
    status: 'OVERDUE',
    dueDate: '2026-10-05',
    expectedAmount: 650,
    creditApplied: 0,
    amountDue: 650,
    lastPeriod: false,
    paymentId: null,
    ...overrides,
  };
}

describe('A5.1 direct payment model', () => {
  it('shows the guest, then the month with its fee, and the credit it uses', () => {
    expect(payingTiles('Pedro Ccori', null)).toEqual([
      { label: 'Huésped', value: 'Pedro Ccori', wide: true },
    ]);
    expect(payingTiles('Pedro Ccori', period()).map((tile) => [tile.label, tile.value])).toEqual([
      ['Huésped', 'Pedro Ccori'],
      ['Mes', 'Octubre 2026'],
      ['Cuota', 'S/ 650.00'],
    ]);
    const credited = payingTiles('Sara', period({ creditApplied: 40, amountDue: 610 }));
    expect(credited.slice(3).map((tile) => [tile.label, tile.value])).toEqual([
      ['Crédito a favor', '− S/ 40.00'],
      ['Por pagar', 'S/ 610.00'],
    ]);
    expect(payingNote(period({ creditApplied: 40 }))).toContain('RN-38');
    const stay = payingTiles(
      'Julia',
      period({
        period: null,
        stayId: 's1',
        stayStartDate: '2026-10-30',
        stayEndDate: '2026-11-02',
      }),
    );
    expect(stay.slice(1).map((tile) => tile.label)).toEqual(['Estadía', 'Acordado']);
  });

  it('compares what was received with what is due', () => {
    expect(receivedNotice(null, null).heading).toBe('Elige el período');
    expect(receivedNotice({ kind: 'short', difference: 250 }, period())).toEqual({
      tone: 'error',
      heading: 'Faltan S/ 250.00.',
      text: 'Corresponde S/ 650.00.',
    });
    expect(receivedNotice({ kind: 'complete', difference: 0 }, period()).text).toBe(
      'Lo recibido cubre la cuota.',
    );
    expect(
      receivedNotice({ kind: 'over', difference: 50, refund: true }, period({ stayId: 's1' })).text,
    ).toContain('Es su única estadía');
    expect(receivedNotice({ kind: 'over', difference: 50, refund: false }, period()).text).toBe(
      'Quedan como crédito para el mes siguiente.',
    );
  });
});
