import {
  countText,
  DEFAULT_SORT,
  emptyText,
  hasFilters,
  NO_FILTERS,
  rangeNote,
  rangeText,
  soonPanel,
  stateOf,
  toRow,
  visibleContracts,
} from './contract';
import { summaryOf } from './contract.testing';

const NOW = new Date('2026-10-29T15:00:00Z');

describe('a contract as A4 shows it', () => {
  it('says the guest, the environment, the fee and the dates', () => {
    expect(toRow(summaryOf(), NOW)).toEqual(
      expect.objectContaining({
        name: 'Lucía Paredes',
        document: 'DNI 43219087',
        environment: 'Habitación 101',
        fee: 'S/ 650.00',
        paymentDay: 5,
        range: '1 abr 2026 – 31 mar 2027',
        note: '',
        viewName: 'Ver contrato de Lucía Paredes',
      }),
    );
  });

  it('names a guest that has not given a name yet', () => {
    expect(toRow(summaryOf({ guestName: null }), NOW).name).toBe('Huésped sin nombre');
  });

  it('tells «Próximo a vencer» apart from a Vigente, and the others by their state', () => {
    expect(stateOf(summaryOf())).toBe('ACTIVE');
    expect(stateOf(summaryOf({ expiringSoon: true }))).toBe('SOON');
    expect(stateOf(summaryOf({ status: 'EXPIRED' }))).toBe('EXPIRED');
    expect(toRow(summaryOf({ expiringSoon: true }), NOW).badge).toEqual({
      label: 'Próximo a vencer',
      tone: 'review',
    });
    expect(toRow(summaryOf({ status: 'TERMINATED' }), NOW).badge.label).toBe('Finalizado');
  });

  it('adds under the dates how much is left or how it ended', () => {
    const soon = summaryOf({ expiringSoon: true, endDate: '2026-11-25' });
    expect(rangeNote(soon, NOW)).toBe('vence en 27 días');
    expect(rangeNote({ ...soon, endDate: '2026-10-30' }, NOW)).toBe('vence mañana');
    expect(rangeNote({ ...soon, endDate: '2026-10-29' }, NOW)).toBe('vence hoy');
    expect(rangeNote(summaryOf({ status: 'EXPIRED', endDate: '2026-08-31' }), NOW)).toBe(
      'venció el 31 ago 2026',
    );
    expect(rangeNote(summaryOf({ status: 'TERMINATED', terminatedAt: '2026-10-15' }), NOW)).toBe(
      'finalizado el 15 oct 2026',
    );
    expect(rangeNote(summaryOf({ endDate: null }), NOW)).toBe('contrato abierto');
    expect(rangeText('2025-11-01', null)).toBe('1 nov 2025 – sin fecha de fin');
  });

  it('keeps by the search and by «Próximo a vencer», and orders by when it ends', () => {
    const rows = [
      toRow(summaryOf({ id: 'a', guestName: 'Zoila', endDate: '2027-01-31' }), NOW),
      toRow(summaryOf({ id: 'b', guestName: 'Ana', endDate: null, environmentCode: '202' }), NOW),
      toRow(
        summaryOf({ id: 'c', guestName: 'Luis', endDate: '2026-11-10', expiringSoon: true }),
        NOW,
      ),
    ];
    const ids = (filters = NO_FILTERS, sort = DEFAULT_SORT) =>
      visibleContracts(rows, filters, sort).map((row) => row.id);

    expect(ids()).toEqual(['c', 'a', 'b']);
    expect(ids(NO_FILTERS, { key: 'end', direction: 'desc' })).toEqual(['b', 'a', 'c']);
    expect(ids(NO_FILTERS, { key: 'name', direction: 'asc' })).toEqual(['b', 'c', 'a']);
    expect(ids({ search: '202', soon: 'ALL' })).toEqual(['b']);
    expect(ids({ search: '43219087', soon: 'ALL' })).toHaveLength(3);
    expect(ids({ search: '', soon: 'SOON' })).toEqual(['c']);
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ search: ' ', soon: 'ALL' })).toBe(false);
    expect(hasFilters({ search: 'ana', soon: 'ALL' })).toBe(true);
    expect(hasFilters({ search: '', soon: 'SOON' })).toBe(true);
  });

  it('counts what is shown among what is loaded', () => {
    expect(countText(3, 17)).toBe('Mostrando 3 de 17 cargados');
  });

  it('puts the contracts about to end in the panel, with one action', () => {
    expect(soonPanel([])).toEqual({
      figure: 0,
      label: 'contratos por vencer',
      text: 'Ningún contrato vence pronto.',
      only: null,
      action: '',
    });
    const one = soonPanel([
      summaryOf({
        id: 'r',
        guestName: 'Rocío Apaza',
        environmentCode: '202',
        endDate: '2026-11-25',
      }),
    ]);
    expect(one).toEqual({
      figure: 1,
      label: 'contrato por vencer',
      text: 'Rocío Apaza (habitación 202) vence el 25 nov. Conversa con el huésped para renovarlo o finalizarlo.',
      only: 'r',
      action: 'Ver contrato',
    });
    const two = soonPanel([
      summaryOf({ id: 'r', endDate: '2026-11-25' }),
      summaryOf({ id: 's', guestName: 'Sofía', environmentCode: '103', endDate: '2026-11-28' }),
    ]);
    expect(two).toEqual(
      expect.objectContaining({ figure: 2, label: 'contratos por vencer', only: null }),
    );
    expect(two.action).toBe('Ver por vencer');
    expect(two.text).toContain('; Sofía (habitación 103) vence el 28 nov');
  });

  it('says what an empty state is for', () => {
    expect(emptyText('ACTIVE').heading).toBe('Aún no hay contratos vigentes.');
    expect(emptyText('EXPIRED').heading).toBe('No hay contratos vencidos.');
    expect(emptyText('TERMINATED').heading).toBe('No hay contratos finalizados.');
  });
});
