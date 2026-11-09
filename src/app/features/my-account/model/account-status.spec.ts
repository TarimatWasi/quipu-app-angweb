import type { components } from '@core/api/bff.generated';
import { accountNow, accountRows, creditNotice, rejectedAlert } from './account-status';

type PeriodStatus = components['schemas']['PeriodStatus'];

const NOW = new Date('2026-10-29T15:00:00Z');

function period(overrides: Partial<PeriodStatus> = {}): PeriodStatus {
  return {
    period: '2026-10',
    status: 'OVERDUE',
    dueDate: '2026-10-05',
    amount: 800,
    creditApplied: 0,
    amountDue: 800,
    contractId: 'c1',
    paymentId: null,
    rejectionReason: null,
    ...overrides,
  };
}

describe('H1 «Estado de cuenta»: lo que toca ahora', () => {
  it('asks for the voucher of the one month that is late, in red', () => {
    expect(accountNow([period()], NOW)).toEqual({
      figure: 'S/ 800.00',
      label: 'Octubre 2026',
      text: 'Venció el 5 de octubre. Cuando pagues, sube aquí la foto o el PDF del voucher.',
      urgent: true,
      badge: { label: 'Atrasado', tone: 'overdue' },
      action: {
        label: 'Subir voucher de octubre',
        link: ['/guest/payments/new'],
        query: { period: '2026-10' },
      },
    });
  });

  it('adds the months that are owed and starts with the oldest', () => {
    const now = accountNow(
      [
        period({ period: '2026-10', dueDate: '2026-10-05' }),
        period({ period: '2026-09', dueDate: '2026-09-05' }),
      ],
      NOW,
    );

    expect(now.figure).toBe('S/ 1,600.00');
    expect(now.label).toBe('2 meses por pagar');
    expect(now.text).toBe(
      'Septiembre venció el 5 de septiembre y octubre el 5 de octubre. Empieza por septiembre.',
    );
    expect(now.action?.label).toBe('Subir voucher de septiembre');
  });

  it('says «vence» of a month whose day has not come, even when an older one is late', () => {
    const now = accountNow(
      [
        period({ period: '2026-10', dueDate: '2026-10-05' }),
        period({ period: '2026-11', status: 'UNPAID', dueDate: '2026-11-05' }),
      ],
      new Date('2026-11-01T15:00:00Z'),
    );

    expect(now.text).toBe(
      'Octubre venció el 5 de octubre y noviembre vence el 5 de noviembre. Empieza por octubre.',
    );
  });

  it('says what the credit takes off the monthly amount', () => {
    const now = accountNow([period({ creditApplied: 50, amountDue: 750 })], NOW);

    expect(now.figure).toBe('S/ 750.00');
    expect(now.text).toBe(
      'Venció el 5 de octubre. Tu cuota es S/ 800.00 y se descuentan los S/ 50.00 que tienes a favor.',
    );
  });

  it('corrects a rejected payment instead of sending a new one', () => {
    const now = accountNow([period({ paymentId: 'p9', rejectionReason: 'No coincide' })], NOW);

    expect(now.text).toBe(
      'Octubre venció el 5 de octubre y tu pago no se aprobó. Tus comprobantes siguen ahí: agrega uno por la diferencia o corrige el que enviaste.',
    );
    expect(now.action).toEqual({
      label: 'Corregir pago de octubre',
      link: ['/guest/payments', 'p9'],
      query: null,
    });
  });

  it('says «vence» before the day of a month that is not paid yet', () => {
    const now = accountNow(
      [period({ status: 'UNPAID', dueDate: '2026-11-05', period: '2026-11' })],
      NOW,
    );

    expect(now.text).toBe(
      'Vence el 5 de noviembre. Cuando pagues, sube aquí la foto o el PDF del voucher.',
    );
    expect(now.urgent).toBe(false);
  });

  it('lets the guest see the payment under review and asks nothing more', () => {
    const now = accountNow([period({ status: 'UNDER_REVIEW', paymentId: 'p1' })], NOW);

    expect(now).toEqual(
      expect.objectContaining({
        label: 'Octubre 2026',
        text: 'La administración está revisando tu pago. No necesitas hacer nada más.',
        urgent: false,
        action: { label: 'Ver pago de octubre', link: ['/guest/payments', 'p1'], query: null },
      }),
    );
  });

  it('says «Al día» when every month is paid, and when there is no month yet', () => {
    expect(accountNow([period({ status: 'PAID', paymentId: 'p1' })], NOW)).toEqual(
      expect.objectContaining({
        figure: 'Al día',
        label: 'Todos tus meses están pagados',
        action: null,
      }),
    );
    expect(accountNow([], NOW)).toEqual(
      expect.objectContaining({ figure: 'Al día', label: 'Aún no tienes meses por pagar.' }),
    );
  });
});

describe('H1: los meses', () => {
  it('gives each month the action of the guest: voucher, correct or see', () => {
    const rows = accountRows([
      period({ period: '2026-07', status: 'PAID', paymentId: 'p7' }),
      period({
        period: '2026-08',
        status: 'PAID',
        paymentId: null,
        creditApplied: 800,
        amountDue: 0,
      }),
      period({ period: '2026-09', status: 'OVERDUE', paymentId: 'p9', rejectionReason: 'Falta' }),
      period({ period: '2026-10', status: 'OVERDUE' }),
      period({ period: '2026-11', status: 'UNDER_REVIEW', paymentId: 'p11' }),
    ]);

    expect(rows.map((row) => [row.period, row.action?.label ?? null])).toEqual([
      ['2026-07', 'Ver pago'],
      ['2026-08', null],
      ['2026-09', 'Corregir pago'],
      ['2026-10', 'Subir voucher'],
      ['2026-11', 'Ver pago'],
    ]);
    expect(rows[3]?.action?.query).toEqual({ period: '2026-10' });
    expect(rows[2]?.rejectionReason).toBe('Falta');
  });

  it('says under the month what the credit takes off', () => {
    const [row] = accountRows([period({ creditApplied: 50, amountDue: 750 })]);

    expect(row?.note).toBe('Cuota S/ 800.00 − crédito a favor S/ 50.00');
    expect(accountRows([period()])[0]?.note).toBeNull();
  });
});

describe('H1: los avisos', () => {
  it('names the month of a payment that was not approved and why', () => {
    expect(
      rejectedAlert([period({ paymentId: 'p9', rejectionReason: 'No se lee el voucher' })]),
    ).toEqual({
      heading: 'Tu pago de octubre no se aprobó.',
      reason: 'Motivo: No se lee el voucher',
    });
    expect(rejectedAlert([period({ paymentId: 'p9' })])?.reason).toBeNull();
    expect(rejectedAlert([period()])).toBeNull();
  });

  it('says how much credit there is and where it is discounted from', () => {
    const credit = {
      balance: 50,
      toRefund: false,
      origins: [{ paymentId: 'p', period: '2026-09', amount: 50 }],
      lastRefund: null,
    };

    expect(creditNotice(credit, [period({ creditApplied: 50, amountDue: 750 })])).toEqual({
      heading: 'Tienes S/ 50.00 a favor.',
      text: 'Sobró de tu pago de septiembre y se descuenta de Octubre 2026.',
      tone: 'info',
    });
  });

  it('says the credit will be refunded when no month is left, and tells the last refund once made', () => {
    expect(
      creditNotice({ balance: 120, toRefund: true, origins: [], lastRefund: null }, [])?.text,
    ).toContain('te lo devolveremos');

    const refunded = creditNotice(
      {
        balance: 0,
        toRefund: false,
        origins: [],
        lastRefund: { amount: 120, date: '2026-11-03', method: 'Yape' },
      },
      [],
    );
    expect(refunded?.tone).toBe('success');
    expect(refunded?.heading).toBe('Te devolvimos S/ 120.00 el 3 nov 2026 por Yape.');
  });

  it('shows nothing without credit or when the credit could not be read', () => {
    expect(creditNotice(null, [])).toBeNull();
    expect(
      creditNotice({ balance: 0, toRefund: false, origins: [], lastRefund: null }, []),
    ).toBeNull();
  });
});
