import type { PeriodStatus } from '@core/api/clients/admin-guests.service';
import {
  DEFAULT_PERIOD_SORT,
  paymentAction,
  showingText,
  sortPeriods,
  stateCounts,
  toPeriodRow,
} from './period-rows';
import { nextSort } from '@shared/ui/data-table/list-sort';

function month(period: string, status: PeriodStatus['status'], extra: Partial<PeriodStatus> = {}) {
  return toPeriodRow(
    {
      period,
      status,
      dueDate: `${period}-05`,
      amount: 800,
      creditApplied: 0,
      amountDue: 800,
      contractId: 'c1',
      paymentId: null,
      rejectionReason: null,
      ...extra,
    },
    'g1',
  );
}

describe('A3.2 «Pagos por mes» rows', () => {
  it('words a month: its name, due date, amount, badge and whether it was rejected', () => {
    const row = month('2026-10', 'OVERDUE', { paymentId: 'p9', amountDue: 750.5 });

    expect(row).toEqual({
      key: 'c1:2026-10',
      period: '2026-10',
      month: 'Octubre 2026',
      dueDate: '2026-10-05',
      due: '5 oct 2026',
      amountDue: 750.5,
      amount: 'S/ 750.50',
      state: 'OVERDUE',
      badge: { label: 'Atrasado', tone: 'overdue' },
      rejected: true,
      action: { label: 'Corregir pago', link: ['/admin/payments', 'p9'], query: null },
    });
    expect(month('2026-09', 'UNPAID').rejected).toBe(false);
    expect(month('2026-09', 'UNDER_REVIEW', { paymentId: 'p1' }).rejected).toBe(false);
  });

  it('gives each state its action: review, see, correct or register a direct payment', () => {
    expect(paymentAction('UNDER_REVIEW', 'p1', 'g1')).toEqual({
      label: 'Revisar pago',
      link: ['/admin/payments', 'p1'],
      query: null,
    });
    expect(paymentAction('PAID', 'p2', 'g1')?.label).toBe('Ver pago');
    expect(paymentAction('UNPAID', 'p3', 'g1')?.label).toBe('Corregir pago');
    expect(paymentAction('OVERDUE', null, 'g1')).toEqual({
      label: 'Registrar pago',
      link: ['/admin/payments/new'],
      query: { guestId: 'g1' },
    });
    expect(paymentAction('UNPAID', undefined, 'g1')?.label).toBe('Registrar pago');
    // A month paid with credit alone has no payment to open.
    expect(paymentAction('PAID', null, 'g1')).toBeNull();
  });

  it('sorts overdue, under review, unpaid and paid, the latest month first within each', () => {
    const rows = [
      month('2026-07', 'PAID'),
      month('2026-08', 'OVERDUE'),
      month('2026-09', 'PAID'),
      month('2026-10', 'UNDER_REVIEW'),
      month('2026-11', 'UNPAID'),
      month('2026-06', 'OVERDUE'),
    ];

    expect(sortPeriods(rows, DEFAULT_PERIOD_SORT).map((row) => row.period)).toEqual([
      '2026-08',
      '2026-06',
      '2026-10',
      '2026-11',
      '2026-09',
      '2026-07',
    ]);
    expect(sortPeriods(rows, { key: 'month', direction: 'asc' }).map((row) => row.period)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
    expect(sortPeriods(rows, { key: 'due', direction: 'desc' })[0]?.period).toBe('2026-11');
    const amounts = [month('2026-01', 'PAID', { amountDue: 900 }), month('2026-02', 'PAID')];
    expect(
      sortPeriods(amounts, { key: 'amount', direction: 'asc' }).map((row) => row.amount),
    ).toEqual(['S/ 800.00', 'S/ 900.00']);
  });

  it('turns a header around or starts another one ascending', () => {
    expect(nextSort(DEFAULT_PERIOD_SORT, 'state')).toEqual({
      key: 'state',
      direction: 'desc',
    });
    expect(nextSort({ key: 'state', direction: 'desc' }, 'state')).toEqual({
      key: 'state',
      direction: 'asc',
    });
    expect(nextSort(DEFAULT_PERIOD_SORT, 'month')).toEqual({
      key: 'month',
      direction: 'asc',
    });
  });

  it('counts the states present in their order and says how many are shown', () => {
    const rows = [month('2026-09', 'PAID'), month('2026-10', 'OVERDUE'), month('2026-08', 'PAID')];

    expect(stateCounts(rows)).toEqual([
      { state: 'OVERDUE', count: 1 },
      { state: 'PAID', count: 2 },
    ]);
    expect(showingText(1, 3)).toBe('Mostrando 1 de 3 meses');
    expect(showingText(1, 1)).toBe('Mostrando 1 de 1 mes');
  });

  it('keys a month by its contract, so two contracts can charge the same month', () => {
    const first = month('2026-10', 'PAID');
    const second = toPeriodRow({ ...month2('2026-10'), contractId: 'c2' }, 'g1');

    expect(first.key).toBe('c1:2026-10');
    expect(second.key).toBe('c2:2026-10');
  });
});

function month2(period: string): PeriodStatus {
  return {
    period,
    status: 'UNPAID',
    dueDate: `${period}-05`,
    amount: 800,
    creditApplied: 0,
    amountDue: 800,
    contractId: 'c1',
    paymentId: null,
    rejectionReason: null,
  };
}
