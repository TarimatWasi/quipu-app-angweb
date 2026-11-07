import { creditOf, expenseOf } from './finance.testing';
import {
  amountProblem,
  categoryProblem,
  creditOf as creditOfGuest,
  creditOptions,
  dateProblem,
  draftOfExpense,
  guestOptions,
  guestProblem,
  methodProblem,
  monthHelp,
  newExpense,
  newFine,
  newRefund,
  refundAmountHelp,
  refundAmountProblem,
  refundDateHelp,
  refundGuestHelp,
  refusal,
  toExpenseInput,
  toFineInput,
  toRefundInput,
} from './finance-forms';
import type { GuestSummary } from './finance-forms';

const TODAY = '2026-10-29';

describe('the forms of A6', () => {
  it('wants an amount above 0 with two decimals at most, written with a comma or a dot', () => {
    expect(amountProblem('')).toBe('El monto debe ser mayor a 0');
    expect(amountProblem('0')).toBe('El monto debe ser mayor a 0');
    expect(amountProblem('10.555')).toBe('El monto debe ser mayor a 0');
    expect(amountProblem('abc')).toBe('El monto debe ser mayor a 0');
    expect(amountProblem('85,50')).toBeNull();
    expect(amountProblem('85.5')).toBeNull();
  });

  it('wants a category of D-26 and a guest', () => {
    expect(categoryProblem('')).toBe('Elige una categoría');
    expect(categoryProblem('OTRA')).toBe('Elige una categoría');
    expect(categoryProblem('UTILITIES')).toBeNull();
    expect(guestProblem('')).toBe('Elige un huésped');
    expect(guestProblem('g1')).toBeNull();
  });

  it('starts an expense in the month of the balance, and an edit from the expense as loaded', () => {
    expect(newExpense('2026-10')).toEqual({
      category: '',
      amount: '',
      month: '2026-10',
      description: '',
    });
    expect(draftOfExpense(expenseOf({ amount: 180.5, description: undefined }))).toEqual({
      category: 'MAINTENANCE',
      amount: '180.50',
      month: '2026-10',
      description: '',
    });
  });

  it('turns a valid expense into what the BFF takes, with no description when it is blank', () => {
    const draft = {
      category: 'UTILITIES',
      amount: '420,50',
      month: '2026-10',
      description: ' Luz ',
    } as const;

    expect(toExpenseInput(draft)).toEqual({
      category: 'UTILITIES',
      amount: 420.5,
      month: '2026-10',
      description: 'Luz',
    });
    expect(toExpenseInput({ ...draft, description: '  ' })).toEqual({
      category: 'UTILITIES',
      amount: 420.5,
      month: '2026-10',
    });
    expect(toExpenseInput({ ...draft, category: '' })).toBeNull();
    expect(toExpenseInput({ ...draft, amount: '0' })).toBeNull();
  });

  it('turns a valid fine into what the BFF takes', () => {
    const draft = { ...newFine('2026-10'), guestId: 'g1', amount: '30', description: 'Ruido' };

    expect(toFineInput(draft)).toEqual({
      guestId: 'g1',
      amount: 30,
      month: '2026-10',
      description: 'Ruido',
    });
    expect(toFineInput({ ...draft, description: '' })?.description).toBeUndefined();
    expect(toFineInput({ ...draft, guestId: '' })).toBeNull();
    expect(toFineInput({ ...draft, amount: '' })).toBeNull();
  });

  it('offers every guest for a fine, and says «Inactivo» for the ones that left', () => {
    const guest = (fields: Partial<GuestSummary>) =>
      ({
        id: 'g1',
        documentType: 'DNI',
        documentNumber: '70000001',
        name: 'Luis Mamani',
        type: 'CONTRACT',
        status: 'ACTIVE',
        environment: { code: '104', type: 'ROOM', kind: 'CONTRACT' },
        ...fields,
      }) as GuestSummary;

    expect(
      guestOptions([
        guest({}),
        guest({ id: 'g2', name: 'Rubén Soto', status: 'INACTIVE' }),
        guest({ id: 'g3', name: null, environment: null }),
      ]),
    ).toEqual([
      { value: 'g1', label: 'Luis Mamani · 104' },
      { value: 'g2', label: 'Rubén Soto · 104 · Inactivo' },
      { value: 'g3', label: 'Huésped sin nombre · DNI 70000001' },
    ]);
  });

  it('says in which balance the month counts: the expenses or the income', () => {
    expect(monthHelp('EXP', '2026-10')).toBe('Cuenta en los egresos de octubre 2026.');
    expect(monthHelp('FIN', '2026-10')).toBe('Suma a los ingresos de octubre 2026.');
  });

  it('starts a refund with the guest chosen and all its credit, dated today', () => {
    expect(newRefund(creditOf(), TODAY)).toEqual({
      guestId: 'g3',
      amount: '50.00',
      date: TODAY,
      method: '',
      note: '',
    });
    expect(newRefund(undefined, TODAY)).toEqual(
      expect.objectContaining({ guestId: '', amount: '' }),
    );
  });

  it('does not let a refund pass the credit, and says the credit', () => {
    const credit = creditOf({ amount: 50 });

    expect(refundAmountProblem('50', credit)).toBeNull();
    expect(refundAmountProblem('20', credit)).toBeNull();
    expect(refundAmountProblem('80', credit)).toBe(
      'El monto no puede pasar el crédito de S/ 50.00',
    );
    expect(refundAmountProblem('0', credit)).toBe('El monto debe ser mayor a 0');
    expect(refundAmountProblem('80', undefined)).toBeNull();
  });

  it('wants how it was returned and a date that is not in the future', () => {
    expect(methodProblem('  ')).toBe('Escribe cómo devolviste el dinero');
    expect(methodProblem('Yape')).toBeNull();
    expect(dateProblem('', TODAY)).toBe('Elige la fecha en que devolviste el dinero.');
    expect(dateProblem('2026-10-30', TODAY)).toBe('La fecha no puede ser futura.');
    expect(dateProblem(TODAY, TODAY)).toBeNull();
    expect(dateProblem('2026-10-01', TODAY)).toBeNull();
  });

  it('turns a valid refund into what the BFF takes: partial, trimmed, with the note only if it has one', () => {
    const credit = creditOf();
    const draft = { guestId: 'g3', amount: '20', date: TODAY, method: ' Yape ', note: ' Op. 123 ' };

    expect(toRefundInput(draft, credit, TODAY)).toEqual({
      guestId: 'g3',
      amount: 20,
      date: TODAY,
      method: 'Yape',
      note: 'Op. 123',
    });
    expect(toRefundInput({ ...draft, note: '' }, credit, TODAY)?.note).toBeUndefined();
    for (const wrong of [
      { guestId: '' },
      { amount: '80' },
      { method: '' },
      { date: '2026-12-01' },
    ]) {
      expect(toRefundInput({ ...draft, ...wrong }, credit, TODAY)).toBeNull();
    }
  });

  it('helps the refund with where the credit came from, how much and in which month it counts', () => {
    expect(refundGuestHelp(undefined)).toBe(
      'Solo aparecen los huéspedes con crédito por devolver.',
    );
    expect(refundGuestHelp(creditOf())).toBe(
      'Sobró del pago de octubre; su contrato terminó el 15 oct. Crédito por devolver: S/ 50.00.',
    );
    expect(refundAmountHelp(undefined)).toBe('Elige primero el huésped.');
    expect(refundAmountHelp(creditOf())).toBe(
      'Hasta S/ 50.00. Si devuelves menos, el resto sigue pendiente.',
    );
    expect(refundDateHelp('2026-10-29')).toBe('Resta de los ingresos de octubre 2026.');
    expect(refundDateHelp('')).toBe('Elige la fecha en que devolviste el dinero.');
  });

  it('finds the credit of a guest and lists the guests that have one with how much', () => {
    const credits = [
      creditOf(),
      creditOf({ guestId: 'g4', guestName: 'Valeria Choque', environmentCode: null, amount: 35 }),
    ];

    expect(creditOfGuest(credits, 'g4')?.amount).toBe(35);
    expect(creditOfGuest(credits, 'nadie')).toBeUndefined();
    expect(creditOptions(credits)).toEqual([
      { value: 'g3', label: 'Diego Huanca · 204 · S/ 50.00' },
      { value: 'g4', label: 'Valeria Choque · S/ 35.00' },
    ]);
  });

  it('puts what the BFF refuses under its field in the words of the catalog, never its own', () => {
    expect(refusal('EXPENSE_INVALID_AMOUNT', undefined)).toEqual({
      field: 'amount',
      message: 'El monto debe ser mayor a 0',
    });
    expect(refusal('VALIDATION_ERROR', 'category')).toEqual({
      field: 'category',
      message: 'Elige una categoría',
    });
    expect(refusal('VALIDATION_ERROR', 'method')?.message).toBe(
      'Escribe cómo devolviste el dinero',
    );
    expect(refusal('VALIDATION_ERROR', 'date')?.field).toBe('date');
    expect(refusal('VALIDATION_ERROR', 'note')).toBeNull();
    expect(refusal('UNEXPECTED_ERROR', undefined)).toBeNull();
  });
});
