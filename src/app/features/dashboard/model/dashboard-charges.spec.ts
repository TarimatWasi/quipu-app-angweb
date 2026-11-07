import { chargeOf } from './dashboard.testing';
import {
  countText,
  DEFAULT_SORT,
  hasFilters,
  isChargeState,
  NO_FILTERS,
  segmentsOf,
  toChargeRow,
  visibleCharges,
} from './dashboard-charges';
import type { ChargeRow } from './dashboard-charges';

const row = (...args: Parameters<typeof chargeOf>): ChargeRow => toChargeRow(chargeOf(...args));

describe('a charge of the month as A1 shows it', () => {
  it('says whose it is, for what period, how much and when it falls due', () => {
    const ana = row({ guestName: 'Ana Quispe', dueDate: '2026-10-05', amount: 1350.5 });

    expect(ana).toEqual(
      expect.objectContaining({
        name: 'Ana Quispe',
        document: 'DNI 12345678',
        typeLabel: 'Contrato',
        environment: '201',
        period: 'Octubre 2026',
        amountLabel: 'S/ 1,350.50',
        dueLabel: '5 oct 2026',
      }),
    );
  });

  it('shows the dates of the stay of a temporary guest and an environment it may not have', () => {
    const stay = row({
      guestType: 'TEMPORARY',
      contractId: null,
      stayId: 's1',
      period: null,
      stayStartDate: '2026-10-20',
      stayEndDate: '2026-10-31',
      environmentCode: null,
    });

    expect(stay).toEqual(
      expect.objectContaining({
        typeLabel: 'Temporal',
        period: '20 – 31 oct',
        environment: 'Sin ambiente',
      }),
    );
  });

  it.each([
    ['PAID', 'Al día', 'paid'],
    ['UNDER_REVIEW', 'Pendiente de revisión', 'review'],
    ['UNPAID', 'No pagado', 'unpaid'],
    ['OVERDUE', 'Atrasado', 'overdue'],
  ] as const)('words the state %s as «%s»', (status, label, tone) => {
    expect(row({ status })).toEqual(expect.objectContaining({ stateLabel: label, tone }));
  });

  it('offers «Revisar pago» for what waits for its review, on the payment', () => {
    const review = row({ status: 'UNDER_REVIEW', paymentId: 'p1' });

    expect(review.action).toEqual({
      label: 'Revisar pago',
      kind: 'primary',
      link: ['/admin/payments', 'p1'],
      query: { vista: 'por-revisar' },
    });
  });

  it('offers «Registrar pago» for an unpaid or overdue charge without a payment, for its guest', () => {
    for (const status of ['UNPAID', 'OVERDUE'] as const) {
      expect(row({ status, guestId: 'g7' }).action).toEqual({
        label: 'Registrar pago',
        kind: 'secondary',
        link: ['/admin/payments', 'new'],
        query: { guestId: 'g7' },
      });
    }
  });

  it('offers «Corregir pago» instead, and says «Pago rechazado», when its payment was rejected', () => {
    const rejected = row({ status: 'OVERDUE', paymentId: 'p9', paymentRejected: true });

    expect(rejected.rejected).toBe(true);
    expect(rejected.action).toEqual({
      label: 'Corregir pago',
      kind: 'secondary',
      link: ['/admin/payments', 'p9'],
      query: { vista: 'rechazados' },
    });
  });

  it('only offers «Ver huésped» once it is paid, and never says «Pago rechazado» there', () => {
    const paid = row({ status: 'PAID', guestId: 'g1', paymentRejected: true });

    expect(paid.rejected).toBe(false);
    expect(paid.action).toEqual(
      expect.objectContaining({
        label: 'Ver huésped',
        kind: 'link',
        link: ['/admin/guests', 'g1'],
      }),
    );
  });

  it('names the guest in the action by its name, or by its document while it has none', () => {
    expect(row({ guestName: 'Ana Quispe' }).actionFor).toBe('Ana Quispe');
    expect(row({ guestName: null }).actionFor).toBe('DNI 12345678');
  });
});

describe('the filters and the order of the charges', () => {
  const rows = [
    row({
      contractId: 'c1',
      guestName: 'Jorge Condori',
      environmentCode: '203',
      status: 'PAID',
      dueDate: '2026-10-05',
    }),
    row({
      contractId: 'c2',
      guestName: 'Pedro Ccori',
      environmentCode: '105',
      status: 'OVERDUE',
      dueDate: '2026-10-10',
      amount: 650,
    }),
    row({
      contractId: 'c3',
      guestName: 'Ana Quispe',
      environmentCode: '201',
      status: 'OVERDUE',
      dueDate: '2026-10-05',
      amount: 800,
    }),
    row({
      contractId: 'c4',
      guestName: 'Luis Mamani',
      environmentCode: '104',
      status: 'UNDER_REVIEW',
      dueDate: '2026-10-15',
    }),
    row({
      contractId: null,
      stayId: 's1',
      guestType: 'TEMPORARY',
      guestName: 'Diego Rojas',
      environmentCode: 'C2',
      period: null,
      stayStartDate: '2026-10-25',
      stayEndDate: '2026-11-02',
      status: 'UNPAID',
      dueDate: '2026-11-02',
    }),
  ];
  const names = (list: readonly ChargeRow[]) => list.map((item) => item.name);

  it('orders the urgent first by default: overdue, under review, unpaid, up to date, earliest due first', () => {
    expect(names(visibleCharges(rows, NO_FILTERS, DEFAULT_SORT))).toEqual([
      'Ana Quispe',
      'Pedro Ccori',
      'Luis Mamani',
      'Diego Rojas',
      'Jorge Condori',
    ]);
  });

  it('turns an order around and orders by amount, by environment and by guest', () => {
    const by = (key: 'amount' | 'environment' | 'guest', direction: 'asc' | 'desc') =>
      names(visibleCharges(rows, NO_FILTERS, { key, direction }));

    expect(by('guest', 'asc')[0]).toBe('Ana Quispe');
    expect(by('guest', 'desc')[0]).toBe('Pedro Ccori');
    expect(by('environment', 'asc')[0]).toBe('Luis Mamani');
    expect(by('amount', 'desc')[0]).toBe('Ana Quispe');
  });

  it('keeps one state, one type, or what the search finds in the name, the document or the environment', () => {
    const only = (filters: Partial<typeof NO_FILTERS>) =>
      names(visibleCharges(rows, { ...NO_FILTERS, ...filters }, DEFAULT_SORT));

    expect(only({ state: 'OVERDUE' })).toEqual(['Ana Quispe', 'Pedro Ccori']);
    expect(only({ type: 'TEMPORARY' })).toEqual(['Diego Rojas']);
    expect(only({ type: 'CONTRACT' })).toHaveLength(4);
    expect(only({ search: 'pedro' })).toEqual(['Pedro Ccori']);
    expect(only({ search: '  c2 ' })).toEqual(['Diego Rojas']);
    expect(only({ search: '12345678' })).toHaveLength(5);
    expect(only({ search: 'nadie' })).toEqual([]);
  });

  it('knows when something narrows the list', () => {
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, state: 'PAID' })).toBe(true);
    expect(hasFilters({ ...NO_FILTERS, search: ' ' })).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, type: 'TEMPORARY' })).toBe(true);
  });

  it('lists the states present for the bar and the tiles, with how many each has', () => {
    expect(segmentsOf(rows)).toEqual([
      { key: 'PAID', label: 'Al día', count: 1, tone: 'paid' },
      { key: 'REVIEW', label: 'Pendiente de revisión', count: 1, tone: 'review' },
      { key: 'UNPAID', label: 'No pagado', count: 1, tone: 'unpaid' },
      { key: 'OVERDUE', label: 'Atrasado', count: 2, tone: 'overdue' },
    ]);
    expect(segmentsOf([])).toEqual([]);
  });

  it('recognizes the key of a state and says how many charges are shown', () => {
    expect(isChargeState('OVERDUE')).toBe(true);
    expect(isChargeState('REJECTED')).toBe(false);
    expect(isChargeState(null)).toBe(false);
    expect(countText(5, 17)).toBe('Mostrando 5 de 17 cobros');
  });
});
