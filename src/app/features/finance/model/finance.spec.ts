import {
  balanceFacts,
  creditPanel,
  currentMonth,
  deleteNotice,
  emptyText,
  expenseDetail,
  expenseRow,
  fineDetail,
  fineRow,
  fineWho,
  monthLabel,
  monthName,
  monthOptions,
  monthPhrase,
  originText,
  refundDoneText,
  refundRow,
  sortMovements,
} from './finance';
import { creditOf, expenseOf, fineOf, refundOf, summaryOf } from './finance.testing';

describe('the balance and the movements of A6', () => {
  it('writes the months as the screens do', () => {
    expect(currentMonth('2026-11-07')).toBe('2026-11');
    expect(monthLabel('2026-10')).toBe('Octubre 2026');
    expect(monthPhrase('2026-10')).toBe('octubre 2026');
    expect(monthName('2026-10')).toBe('octubre');
  });

  it('offers this month and the eleven before, newest first, and the chosen one if it is further', () => {
    const options = monthOptions('2026-11', '2026-11');
    expect(options).toHaveLength(12);
    expect(options[0]).toBe('2026-11');
    expect(options.at(-1)).toBe('2025-12');
    expect(monthOptions('2026-11', '2020-01')).toHaveLength(13);
    expect(monthOptions('2026-11', '2020-01')[12]).toBe('2020-01');
    expect(monthOptions('2026-02', '2026-02')[2]).toBe('2025-12');
  });

  it('adds up the balance: payments and fines less refunds, and then less the expenses', () => {
    expect(balanceFacts(summaryOf({ refundsTotal: 30, totalIncome: 6_930, net: 5_764.5 }))).toEqual(
      [
        {
          label: 'Ingresos',
          value: 'S/ 6,930.00',
          hint: 'S/ 6,900.00 de 12 pagos aprobados + S/ 60.00 de multas − S/ 30.00 de devoluciones',
          wide: true,
          negative: false,
        },
        { label: 'Egresos', value: 'S/ 1,165.50', hint: '5 egresos', wide: false, negative: false },
        {
          label: 'Neto del mes',
          value: 'S/ 5,764.50',
          hint: 'Ingresos − egresos',
          wide: false,
          negative: false,
        },
      ],
    );
  });

  it('says the singular of one payment and one expense, and a negative neto with its sign', () => {
    const facts = balanceFacts(summaryOf({ paymentsCount: 1, expensesCount: 1, net: -120.5 }));

    expect(facts[0]?.hint).toContain('de 1 pago aprobado');
    expect(facts[1]?.hint).toBe('1 egreso');
    expect(facts[2]).toEqual(expect.objectContaining({ value: '− S/ 120.50', negative: true }));
  });

  it('puts the credit that waits in the panel, with who and since when, and none when nothing waits', () => {
    expect(creditPanel([])).toEqual({
      figure: 0,
      label: 'devoluciones por registrar',
      text: 'No hay dinero pendiente de devolver.',
      firstGuestId: '',
    });
    const one = creditPanel([creditOf()]);
    expect(one).toEqual({
      figure: 1,
      label: 'devolución por registrar',
      text: 'S/ 50.00 que pagaron de más Diego Huanca (204), sin un mes donde usarlos.',
      firstGuestId: 'g3',
    });
    const two = creditPanel([
      creditOf(),
      creditOf({ guestId: 'g4', guestName: null, environmentCode: null, amount: 35 }),
    ]);
    expect(two).toEqual(
      expect.objectContaining({
        figure: 2,
        label: 'devoluciones por registrar',
        firstGuestId: 'g3',
      }),
    );
    expect(two.text).toBe(
      'S/ 85.00 que pagaron de más Diego Huanca (204) y Huésped sin nombre, sin un mes donde usarlos.',
    );
  });

  it('says where a credit came from: a month of a contract that ended, or a stay', () => {
    expect(originText(creditOf())).toBe(
      'Sobró del pago de octubre; su contrato terminó el 15 oct.',
    );
    expect(originText(creditOf({ origin: { ...creditOf().origin, contractEndedOn: null } }))).toBe(
      'Sobró del pago de octubre.',
    );
    expect(
      originText(
        creditOf({
          origin: {
            paymentId: 'p2',
            period: null,
            stayStartDate: '2026-10-12',
            stayEndDate: '2026-10-19',
            contractEndedOn: null,
          },
        }),
      ),
    ).toBe('Sobró del pago de su estadía del 12 – 19 oct.');
    expect(
      originText(
        creditOf({ origin: { ...creditOf().origin, period: null, contractEndedOn: null } }),
      ),
    ).toBe('Sobró del pago de su último mes.');
  });

  it('shows an expense by its description, or by its category when it has none', () => {
    expect(expenseRow(expenseOf())).toEqual(
      expect.objectContaining({
        key: 'EXP:x1',
        title: 'Gasfitero, baño del segundo piso',
        middle: 'Mantenimiento y reparaciones',
        amount: 'S/ 320.00',
        editable: true,
        deletable: true,
        name: 'Gasfitero, baño del segundo piso',
      }),
    );
    expect(expenseRow(expenseOf({ description: undefined, category: 'TAXES_FEES' })).title).toBe(
      'Impuestos y tasas',
    );
  });

  it('shows a fine with its guest and environment, and one without a reason or a name', () => {
    expect(fineRow(fineOf())).toEqual(
      expect.objectContaining({
        key: 'FIN:f1',
        title: 'Ana Quispe',
        sub: 'Ambiente 201',
        middle: 'Ruido después de las 23:00',
        editable: false,
        deletable: true,
      }),
    );
    const bare = fineRow(
      fineOf({ description: undefined, guestName: null, environmentCode: null }),
    );
    expect(bare).toEqual(
      expect.objectContaining({ title: 'Huésped sin nombre', sub: '', middle: 'Sin motivo' }),
    );
  });

  it('shows a refund with its date, method and note, which is neither edited nor deleted (MVP)', () => {
    expect(refundRow(refundOf())).toEqual(
      expect.objectContaining({
        key: 'REF:r1',
        title: 'Elena Mayta',
        sub: 'Ambiente C2',
        middle: '9 oct · Yape · Sobró de la estadía 1 – 8 oct',
        editable: false,
        deletable: false,
      }),
    );
    expect(refundRow(refundOf({ note: null })).middle).toBe('9 oct · Yape');
  });

  it('orders by amount, the biggest first, or by name, and ties go by name', () => {
    const rows = [
      fineRow(fineOf({ id: 'a', guestName: 'Zoila', amount: 30 })),
      fineRow(fineOf({ id: 'b', guestName: 'Ana', amount: 30 })),
      fineRow(fineOf({ id: 'c', guestName: 'Luis', amount: 80 })),
    ];
    const ids = (sort: Parameters<typeof sortMovements>[1]) =>
      sortMovements(rows, sort).map((row) => row.id);

    expect(ids({ key: 'amount', direction: 'desc' })).toEqual(['c', 'b', 'a']);
    expect(ids({ key: 'amount', direction: 'asc' })).toEqual(['b', 'a', 'c']);
    expect(ids({ key: 'title', direction: 'asc' })).toEqual(['b', 'c', 'a']);
  });

  it('says what an empty month has and counts what is shown', () => {
    expect(emptyText('EXP', '2026-11')).toEqual({
      heading: 'No hay egresos en noviembre.',
      text: 'Registra los recibos y compras del mes para ver el neto real.',
    });
    expect(emptyText('FIN', '2026-11').heading).toBe('No hay multas en noviembre.');
    expect(emptyText('REF', '2026-11').heading).toBe('No hay devoluciones en noviembre.');
  });

  it('says what a refund did to the balance and what deleting does to it (RN-24)', () => {
    expect(refundDoneText('Diego Huanca', '2026-10')).toBe(
      'Devolución a Diego Huanca registrada. El balance de octubre se recalculó.',
    );
    expect(refundDoneText(null, '2026-10')).toContain('Huésped sin nombre');
    expect(deleteNotice('EXP', '2026-10')).toEqual({
      title: '¿Eliminar este egreso?',
      text: 'Deja de restar en el balance de octubre 2026 y no se puede recuperar. Si solo quieres cambiarlo, usa Editar.',
      button: 'Eliminar egreso',
    });
    expect(deleteNotice('FIN', '2026-10')).toEqual({
      title: '¿Eliminar esta multa?',
      text: 'Deja de sumar en el balance de octubre 2026 y no se puede recuperar. Para corregirla, elimínala y regístrala de nuevo.',
      button: 'Eliminar multa',
    });
  });

  it('describes what is deleted: the category and amount, or the guest, the reason and the amount', () => {
    expect(expenseDetail(expenseOf())).toBe('Mantenimiento y reparaciones · S/ 320.00');
    expect(fineDetail(fineOf())).toBe('Ruido después de las 23:00 · S/ 30.00');
    expect(fineDetail(fineOf({ description: undefined }))).toBe('Sin motivo · S/ 30.00');
    expect(fineWho(fineOf())).toBe('Ana Quispe · 201');
    expect(fineWho(fineOf({ environmentCode: null, guestName: null }))).toBe('Huésped sin nombre');
  });
});
