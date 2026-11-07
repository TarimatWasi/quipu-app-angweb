import {
  busyText,
  changesOf,
  codeProblem,
  DEFAULT_SORT,
  draftFacts,
  freePanel,
  hasFilters,
  isDirty,
  loadedFacts,
  NO_FILTERS,
  toRow,
  visibleEnvironments,
} from './environment';
import { contractOf, environmentOf, stayOf } from './environment.testing';

describe('an environment as A2 shows it', () => {
  it('says who is in it and for how long', () => {
    expect(toRow(environmentOf({ occupant: contractOf() }))).toEqual(
      expect.objectContaining({
        occupancyTitle: 'Lucía Paredes',
        occupancyDetail: 'contrato hasta 31 mar 2027',
        typeLabel: 'Habitación',
      }),
    );
    expect(toRow(environmentOf({ occupant: contractOf({ endDate: null }) })).occupancyDetail).toBe(
      'contrato sin fecha de fin',
    );
    expect(
      toRow(environmentOf({ type: 'CABIN', code: 'C2', occupant: stayOf() })).occupancyDetail,
    ).toBe('estadía 25 oct – 2 nov');
  });

  it('says it is free, since when, and until when when somebody comes later', () => {
    expect(toRow(environmentOf())).toEqual(
      expect.objectContaining({
        occupancyTitle: 'Libre',
        occupancyDetail: 'desde el 15 oct 2026',
        reserved: false,
      }),
    );
    const booked = toRow(
      environmentOf({ nextOccupant: stayOf({ startDate: '2026-11-05', endDate: '2026-11-12' }) }),
    );
    expect(booked).toEqual(
      expect.objectContaining({
        occupancyTitle: 'Libre hasta el 5 nov 2026',
        occupancyDetail: 'Luego Diego Rojas, estadía 5 – 12 nov',
        reserved: true,
      }),
    );
    expect(
      toRow(environmentOf({ nextOccupant: contractOf({ startDate: '2026-11-01' }) }))
        .occupancyDetail,
    ).toBe('Luego Lucía Paredes, contrato desde el 1 nov 2026');
  });

  it('is «No disponible» once inactive, with the day it was deactivated, and offers to reactivate it', () => {
    const row = toRow(
      environmentOf({ status: 'INACTIVE', deactivatedAt: '2026-09-02T15:00:00Z', freeSince: null }),
    );

    expect(row).toEqual(
      expect.objectContaining({
        occupancyTitle: 'No disponible',
        occupancyDetail: 'desactivado el 2 sep 2026',
        action: 'reactivate',
        actionName: 'Reactivar Habitación 109',
      }),
    );
    expect(toRow(environmentOf()).action).toBe('deactivate');
  });
});

describe('the filters and the order of the environments', () => {
  const rows = [
    toRow(
      environmentOf({ id: 'a', code: '201', occupant: contractOf({ guestName: 'Ana Quispe' }) }),
    ),
    toRow(environmentOf({ id: 'b', code: '109' })),
    toRow(environmentOf({ id: 'c', code: 'C1', type: 'CABIN', occupant: stayOf() })),
    toRow(environmentOf({ id: 'd', code: '20' })),
  ];
  const codes = (list: typeof rows) => list.map((row) => row.code);

  it('orders by code with numbers as numbers, and turns it around', () => {
    expect(codes(visibleEnvironments(rows, NO_FILTERS, DEFAULT_SORT))).toEqual([
      '20',
      '109',
      '201',
      'C1',
    ]);
    expect(
      codes(visibleEnvironments(rows, NO_FILTERS, { key: 'code', direction: 'desc' }))[0],
    ).toBe('C1');
  });

  it('puts the free ones first when ordering by occupancy', () => {
    expect(
      codes(visibleEnvironments(rows, NO_FILTERS, { key: 'occupancy', direction: 'asc' })),
    ).toEqual(['20', '109', '201', 'C1']);
  });

  it('keeps a type, an occupancy, or what the search finds in the code or the occupant', () => {
    const only = (filters: Partial<typeof NO_FILTERS>) =>
      codes(visibleEnvironments(rows, { ...NO_FILTERS, ...filters }, DEFAULT_SORT));

    expect(only({ type: 'CABIN' })).toEqual(['C1']);
    expect(only({ occupancy: 'FREE' })).toEqual(['20', '109']);
    expect(only({ occupancy: 'BUSY' })).toEqual(['201', 'C1']);
    expect(only({ search: 'quispe' })).toEqual(['201']);
    expect(only({ search: ' c1 ' })).toEqual(['C1']);
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, occupancy: 'FREE' })).toBe(true);
  });
});

describe('«Lo que toca ahora» of A2', () => {
  it('is empty when nothing is free', () => {
    expect(freePanel(0, [environmentOf({ occupant: contractOf() })])).toBeNull();
  });

  it('names the free ones and the one that is free only for a while', () => {
    const panel = freePanel(2, [
      environmentOf({ id: 'a', code: '109' }),
      environmentOf({ id: 'b', code: 'C3', type: 'CABIN' }),
      environmentOf({
        id: 'c',
        code: 'C4',
        type: 'CABIN',
        nextOccupant: stayOf({ startDate: '2026-11-05', endDate: '2026-11-12' }),
      }),
    ]);

    expect(panel).toEqual({
      figure: 2,
      label: 'ambientes libres',
      text: 'Habitación 109 y cabaña C3: listos para un contrato o una estadía. La cabaña C4 está libre solo hasta el 5 nov 2026.',
    });
  });

  it('does not name them when the loaded ones are not all of them', () => {
    expect(freePanel(5, [environmentOf()])?.text).toBe('Listos para un contrato o una estadía.');
    expect(freePanel(1, [environmentOf()])?.label).toBe('ambiente libre');
  });
});

describe('the form of an environment', () => {
  it('checks the code as the BFF does, trimmed', () => {
    expect(codeProblem('  201 ')).toBeNull();
    expect(codeProblem('109-A/2_b.1')).toBeNull();
    expect(codeProblem('   ')).toBe('Escribe el código del ambiente.');
    expect(codeProblem('1@3')).toBe('Usa solo letras, números, espacio y . _ / -');
    expect(codeProblem('a'.repeat(51))).toBe('Usa solo letras, números, espacio y . _ / -');
  });

  it('sends only what changed, and knows when nothing did', () => {
    const loaded = environmentOf();

    expect(isDirty(loaded, { code: '109', type: 'ROOM' })).toBe(false);
    expect(isDirty(loaded, { code: ' 109 ', type: 'ROOM' })).toBe(false);
    expect(changesOf(loaded, { code: '109-A', type: 'ROOM' })).toEqual({ code: '109-A' });
    expect(changesOf(loaded, { code: '109', type: 'CABIN' })).toEqual({ type: 'CABIN' });
    expect(changesOf(loaded, { code: 'C9', type: 'CABIN' })).toEqual({ code: 'C9', type: 'CABIN' });
  });

  it('shows what will be created, and how an environment is today', () => {
    expect(draftFacts({ code: '', type: '' }).map((fact) => fact.value)).toEqual([
      'Falta el código',
      'Falta elegirlo',
    ]);
    expect(draftFacts({ code: ' C6 ', type: 'CABIN' }).map((fact) => fact.value)).toEqual([
      'C6',
      'Cabaña',
    ]);
    expect(loadedFacts(environmentOf()).map((fact) => fact.value)).toEqual([
      'Activo',
      'Habitación',
      'Libre desde el 15 oct 2026',
    ]);
  });
});

describe('why an environment cannot be deactivated (RN-12)', () => {
  const today = '2026-10-29';

  it('says what to do for a contract now or later', () => {
    expect(busyText(contractOf(), today)).toBe(
      'Este ambiente está ocupado: finaliza primero su contrato. Hoy lo ocupa Lucía Paredes.',
    );
    expect(busyText(contractOf({ startDate: '2026-11-01' }), today)).toBe(
      'Lucía Paredes tiene un contrato aquí que empieza el 1 nov 2026. Para desactivarlo, finaliza primero ese contrato.',
    );
  });

  it('says what to do for a stay now or later', () => {
    expect(busyText(stayOf(), today)).toBe(
      'Diego Rojas está aquí con una estadía del 25 oct al 2 nov. Para desactivarlo, espera a que termine o cambia la estadía a otro ambiente.',
    );
    expect(busyText(stayOf({ startDate: '2026-11-05', endDate: '2026-11-12' }), today)).toBe(
      'Diego Rojas tiene una estadía aquí del 5 al 12 nov. Para desactivarlo, cambia la estadía a otro ambiente.',
    );
  });

  it('still says it is occupied when the BFF did not say by whom', () => {
    expect(busyText(undefined, today)).toBe('Este ambiente está ocupado: libéralo primero.');
  });
});
