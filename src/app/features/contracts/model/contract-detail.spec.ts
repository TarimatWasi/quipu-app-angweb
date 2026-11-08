import { toPeriodRow } from '@shared/payments/period-rows';
import type { PeriodItem, PeriodRow } from '@shared/payments/period-rows';
import { contractOf } from './contract.testing';
import {
  confirmPoints,
  confirmTitle,
  detailFacts,
  detailPanel,
  fileText,
  monthsNote,
  noMonthsText,
  ownPeriods,
} from './contract-detail';

const NOW = new Date('2026-10-29T15:00:00Z');

function item(period: string, status: PeriodItem['status'], extra: Partial<PeriodItem> = {}) {
  return {
    period,
    status,
    dueDate: `${period}-05`,
    amountDue: 800,
    contractId: 'c1',
    paymentId: null,
    ...extra,
  } satisfies PeriodItem;
}

const rows = (...items: PeriodItem[]): PeriodRow[] => items.map((one) => toPeriodRow(one, 'g1'));

describe('the detail of a contract (A4.2)', () => {
  it('keeps only the months of this contract', () => {
    const periods = [item('2026-09', 'PAID'), item('2026-10', 'PAID', { contractId: 'c2' })];
    expect(ownPeriods(periods, 'c1').map((period) => period.period)).toEqual(['2026-09']);
  });

  it('puts the debt first, in red, with the way to register the payment', () => {
    const panel = detailPanel(
      contractOf({ guestName: 'Ana Quispe', environmentCode: '201' }),
      rows(item('2026-09', 'PAID'), item('2026-10', 'OVERDUE')),
      NOW,
    );
    expect(panel).toEqual({
      figure: 'S/ 800.00',
      label: 'por pagar',
      text: 'Octubre 2026: venció el 5 oct. Si te pagó en persona, regístralo como pago directo.',
      urgent: true,
      badge: { label: 'Atrasado', tone: 'overdue' },
      action: {
        label: 'Registrar pago',
        link: ['/admin/payments/new'],
        query: { guestId: 'g1' },
      },
    });
  });

  it('corrects a rejected payment instead of asking for another one, quoting why it was rejected', () => {
    const panel = detailPanel(
      contractOf({ guestName: 'Ana Quispe' }),
      rows(
        item('2026-10', 'OVERDUE', {
          paymentId: 'p9',
          rejectionReason: 'Faltan S/ 100.00: el voucher es de S/ 700.00.',
        }),
      ),
      NOW,
    );
    expect(panel).toEqual({
      figure: 'S/ 800.00',
      label: 'por pagar',
      text: 'Octubre 2026: venció el 5 oct y su pago fue rechazado («Faltan S/ 100.00: el voucher es de S/ 700.00.»). Corrígelo o agrega lo que falte en la revisión del pago.',
      urgent: true,
      badge: { label: 'Atrasado', tone: 'overdue' },
      action: { label: 'Corregir pago', link: ['/admin/payments', 'p9'], query: null },
    });
  });

  it('corrects a rejected payment without a reason, and still registers the others in person', () => {
    const rejectedOnly = detailPanel(
      contractOf(),
      rows(item('2026-10', 'UNPAID', { paymentId: 'p9' })),
      NOW,
    );
    expect(rejectedOnly.text).toBe(
      'Octubre 2026: venció el 5 oct y su pago fue rechazado. Corrígelo o agrega lo que falte en la revisión del pago.',
    );

    const none = detailPanel(contractOf(), rows(item('2026-10', 'OVERDUE')), NOW);
    expect(none.action?.label).toBe('Registrar pago');
  });

  it('adds the months that are owed and says the debt stays after the contract ended', () => {
    const owed = detailPanel(
      contractOf({ status: 'TERMINATED', terminatedAt: '2026-08-31' }),
      rows(item('2026-07', 'OVERDUE'), item('2026-08', 'OVERDUE')),
      NOW,
    );
    expect(owed.figure).toBe('S/ 1,600.00');
    expect(owed.text).toBe(
      'Julio y agosto de 2026: venció el 5 jul. Finalizar el contrato no borra la deuda: sigue hasta que la pague.',
    );
  });

  it('then the voucher to review, with the payment to open', () => {
    const panel = detailPanel(
      contractOf({ guestName: 'Luis Mamani' }),
      rows(item('2026-10', 'UNDER_REVIEW', { paymentId: 'p1' })),
      NOW,
    );
    expect(panel).toEqual(
      expect.objectContaining({
        figure: 'S/ 800.00',
        label: 'por revisar',
        text: 'Octubre 2026: Luis envió su pago.',
        urgent: false,
      }),
    );
    expect(panel.action).toEqual({
      label: 'Revisar pago',
      link: ['/admin/payments', 'p1'],
      query: null,
    });
  });

  it('says how it ended, and that its environment was freed', () => {
    const ended = detailPanel(
      contractOf({ status: 'TERMINATED', terminatedAt: '2026-10-15', environmentCode: '208' }),
      rows(item('2026-09', 'PAID')),
      NOW,
    );
    expect(ended).toEqual(
      expect.objectContaining({
        figure: 'Finalizado',
        text: 'Lo finalizaste el 15 oct 2026. La habitación 208 quedó libre y sus pagos se conservan.',
        action: null,
      }),
    );
    const expired = detailPanel(
      contractOf({ status: 'EXPIRED', endDate: '2026-08-31', environmentCode: '207' }),
      rows(),
      NOW,
    );
    expect(expired.figure).toBe('Vencido');
    expect(expired.text).toContain('Venció el 31 ago 2026 y la habitación 207 quedó libre');
  });

  it('counts the days to the start of a contract that has not begun', () => {
    const panel = detailPanel(
      contractOf({ startDate: '2026-11-01', endDate: '2027-10-31' }),
      rows(),
      NOW,
    );
    expect(panel).toEqual(expect.objectContaining({ figure: '3 días', label: 'para que empiece' }));
    expect(panel.text).toBe('Empieza el 1 nov 2026. La habitación 101 ya está ocupada.');
  });

  it('offers to renew a contract about to end, from the day after', () => {
    const panel = detailPanel(
      contractOf({ guestName: 'Rocío Apaza', endDate: '2026-11-25', expiringSoon: true }),
      rows(item('2026-10', 'PAID')),
      NOW,
    );
    expect(panel).toEqual({
      figure: '27 días',
      label: 'para que venza',
      text: 'Vence el 25 nov. Conversa con Rocío: para renovarlo, carga el contrato nuevo desde el 26 nov; si no, la habitación 101 queda libre al día siguiente.',
      urgent: false,
      badge: { label: 'Próximo a vencer', tone: 'review' },
      action: {
        label: 'Renovar contrato',
        link: ['/admin/contracts/new'],
        query: { guestId: 'g1' },
      },
    });
  });

  it('says it is up to date, with when it ends or that it does not', () => {
    const upToDate = detailPanel(contractOf(), rows(item('2026-10', 'PAID')), NOW);
    expect(upToDate).toEqual(
      expect.objectContaining({ figure: '0', label: 'meses por pagar', badge: null, action: null }),
    );
    expect(upToDate.text).toBe('Está al día: pagó octubre 2026. Vence el 31 mar 2027.');
    expect(detailPanel(contractOf({ endDate: null }), rows(), NOW).text).toBe(
      'Está al día: pagó todo. No tiene fecha de fin: sigue hasta que lo finalices.',
    );
  });

  it('writes what was agreed as the guest reads it in H2', () => {
    expect(detailFacts(contractOf({ guestName: null, paymentDay: 5, graceDays: 3 }), NOW)).toEqual([
      { label: 'Huésped', value: 'Huésped sin nombre', wide: true, hint: 'DNI 43219087' },
      { label: 'Ambiente', value: 'Habitación 101', wide: false },
      { label: 'Estado', value: 'Vigente', wide: false },
      { label: 'Cuota mensual', value: 'S/ 650.00', wide: false },
      { label: 'Día de pago', value: '5 de cada mes', wide: false, hint: 'Sin atraso hasta el 8.' },
      { label: 'Vigencia', value: '1 abr 2026 – 31 mar 2027', wide: true },
    ]);
  });

  it('says what the validity is today under its dates', () => {
    const hint = (fields: Parameters<typeof contractOf>[0]) =>
      detailFacts(contractOf(fields), NOW).at(-1)?.hint;
    expect(hint({ endDate: null })).toBe('Sigue hasta que lo finalices.');
    expect(hint({ endDate: '2026-11-25', expiringSoon: true })).toBe('Vence en 27 días.');
    expect(hint({ startDate: '2026-11-01' })).toBe('Empieza en 3 días.');
    expect(hint({ status: 'EXPIRED', endDate: '2026-08-31' })).toBe('Venció el 31 ago 2026.');
    expect(hint({ status: 'TERMINATED', terminatedAt: '2026-10-15' })).toBe(
      'Finalizado el 15 oct 2026.',
    );
  });

  it('names its file with its kind, size and when it was uploaded', () => {
    expect(fileText(contractOf(), NOW)).toBe('PDF · 840 KB · subido el 30 mar 2026');
  });

  it('says which months are shown and what an empty list waits for', () => {
    expect(monthsNote(contractOf())).toBe(
      'Solo los meses de este contrato, del más reciente al más antiguo.',
    );
    expect(monthsNote(contractOf({ status: 'TERMINATED' }))).toBe(
      'Solo los meses de este contrato. Ya no se generan meses nuevos.',
    );
    expect(noMonthsText(contractOf({ startDate: '2026-11-01' }))).toBe(
      'El primer mes es noviembre: aparece aquí desde el 1 nov.',
    );
  });

  it('says what finalizing changes: the environment is freed, the debt stays', () => {
    expect(confirmTitle('Ana Quispe')).toBe('¿Finalizar el contrato de Ana Quispe?');
    expect(confirmTitle(null)).toBe('¿Finalizar el contrato de Huésped sin nombre?');
    const contract = contractOf({ guestName: 'Ana Quispe', environmentCode: '201' });
    expect(confirmPoints(contract, rows(item('2026-10', 'OVERDUE')))).toEqual([
      'La habitación 201 queda libre desde hoy.',
      'Sigue debiendo octubre 2026 (S/ 800.00) hasta que lo pague.',
      'Ana podrá entrar a Quipu solo para ver sus pagos y este contrato.',
    ]);
    expect(confirmPoints(contract, rows(item('2026-10', 'PAID')))[1]).toBe(
      'Está al día: no queda nada por cobrar.',
    );
  });
});
