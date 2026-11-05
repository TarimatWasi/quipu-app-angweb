import {
  compareGuests,
  DEFAULT_SORT,
  guestQuery,
  hasFilters,
  matchesSearch,
  nextSort,
  NO_FILTERS,
  sameQuery,
  toGuestRow,
  visibleGuests,
} from './guest-list';
import type { GuestSummary } from './guest-list';
import { accessText, countText, environmentText, nowPanel } from './guest-list-texts';

// 2026-11-05 12:00 in Lima (UTC-5).
const NOW = new Date('2026-11-05T17:00:00Z');

function guest(overrides: Partial<GuestSummary>): GuestSummary {
  return {
    id: 'g1',
    documentType: 'DNI',
    documentNumber: '43219087',
    name: 'Rosa Quispe',
    type: 'CONTRACT',
    status: 'ACTIVE',
    hasLoginAccess: true,
    environment: null,
    accessExpiresAt: null,
    ...overrides,
  };
}

const ROSA = guest({
  id: 'rosa',
  environment: {
    code: '101',
    type: 'ROOM',
    kind: 'CONTRACT',
    startDate: '2026-04-01',
    endDate: '2027-03-31',
  },
});
const ANA = guest({
  id: 'ana',
  name: 'Ána Torres',
  documentType: 'CE',
  documentNumber: '001234567',
  type: 'TEMPORARY',
  environment: {
    code: 'C1',
    type: 'CABIN',
    kind: 'STAY',
    startDate: '2026-10-20',
    endDate: '2026-10-31',
  },
});
const PENDING = guest({
  id: 'pending',
  name: null,
  documentNumber: '71844520',
  status: 'PENDING_ACTIVATION',
  hasLoginAccess: false,
  accessExpiresAt: '2026-11-05T21:05:00Z',
});
const EXPIRED = guest({
  id: 'expired',
  name: null,
  documentType: 'PASSPORT',
  documentNumber: '548210',
  type: 'TEMPORARY',
  status: 'PENDING_ACTIVATION',
  hasLoginAccess: false,
  accessExpiresAt: '2026-11-05T16:00:00Z',
});
const LUIS = guest({ id: 'luis', name: 'Luis Huamán', status: 'ONBOARDING' });

describe('guest list (A3) model', () => {
  it('asks the BFF the view with the type and state filters, never the search', () => {
    expect(guestQuery('CURRENT', NO_FILTERS)).toEqual({ status: 'CURRENT', type: null });
    expect(
      guestQuery('CURRENT', { search: 'rosa', type: 'TEMPORARY', state: 'ONBOARDING' }),
    ).toEqual({ status: 'ONBOARDING', type: 'TEMPORARY' });
    expect(guestQuery('INACTIVE', { search: '', type: 'CONTRACT', state: 'ACTIVE' })).toEqual({
      status: 'INACTIVE',
      type: 'CONTRACT',
    });
    expect(sameQuery({ status: 'CURRENT', type: null }, { status: 'CURRENT', type: null })).toBe(
      true,
    );
    expect(sameQuery({ status: 'CURRENT', type: null }, { status: 'INACTIVE', type: null })).toBe(
      false,
    );
  });

  it('knows when a filter narrows the list', () => {
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, search: '   ' })).toBe(false);
    expect(hasFilters({ ...NO_FILTERS, search: 'x' })).toBe(true);
    expect(hasFilters({ ...NO_FILTERS, type: 'CONTRACT' })).toBe(true);
    expect(hasFilters({ ...NO_FILTERS, state: 'ACTIVE' })).toBe(true);
  });

  it('searches the name without accents, the document and the environment', () => {
    expect(matchesSearch(ANA, 'ana')).toBe(true);
    expect(matchesSearch(LUIS, 'HUAMAN')).toBe(true);
    expect(matchesSearch(PENDING, '71844')).toBe(true);
    expect(matchesSearch(ANA, 'ce 0012')).toBe(true);
    expect(matchesSearch(ANA, 'cabaña c1')).toBe(true);
    expect(matchesSearch(ROSA, '101')).toBe(true);
    expect(matchesSearch(ROSA, 'cabaña')).toBe(false);
    expect(matchesSearch(ROSA, '  ')).toBe(true);
  });

  it('puts the not activated first by default, then by name, the unnamed after the named', () => {
    const order = visibleGuests([ROSA, ANA, LUIS, EXPIRED, PENDING], '', DEFAULT_SORT);

    expect(order.map(({ id }) => id)).toEqual(['pending', 'expired', 'luis', 'ana', 'rosa']);
  });

  it('sorts by each column both ways and filters by the search first', () => {
    const all = [ROSA, ANA, PENDING];
    const ids = (key: 'guest' | 'type' | 'environment', direction: 'asc' | 'desc') =>
      [...all].sort(compareGuests({ key, direction })).map(({ id }) => id);

    expect(ids('guest', 'asc')).toEqual(['ana', 'rosa', 'pending']);
    expect(ids('guest', 'desc')).toEqual(['pending', 'rosa', 'ana']);
    expect(ids('type', 'asc')).toEqual(['rosa', 'pending', 'ana']);
    expect(ids('environment', 'asc')).toEqual(['rosa', 'ana', 'pending']);
    expect(visibleGuests(all, 'quispe', DEFAULT_SORT).map(({ id }) => id)).toEqual(['rosa']);
  });

  it('turns the same column around and starts another one ascending', () => {
    expect(nextSort(DEFAULT_SORT, 'status')).toEqual({ key: 'status', direction: 'desc' });
    expect(nextSort({ key: 'status', direction: 'desc' }, 'status')).toEqual(DEFAULT_SORT);
    expect(nextSort({ key: 'guest', direction: 'desc' }, 'type')).toEqual({
      key: 'type',
      direction: 'asc',
    });
  });

  it('builds a row with the document, the type, the badge and the access', () => {
    expect(toGuestRow(ROSA, NOW)).toEqual({
      id: 'rosa',
      name: 'Rosa Quispe',
      document: 'DNI 43219087',
      type: 'Con contrato',
      environment: { main: 'Habitación 101', detail: 'contrato hasta 31 mar 2027' },
      badge: { label: 'Activo', tone: 'paid' },
      access: null,
    });
    expect(toGuestRow(EXPIRED, NOW)).toEqual(
      expect.objectContaining({
        name: null,
        document: 'Pasaporte 548210',
        type: 'Temporal',
        badge: { label: 'Pendiente de activación', tone: 'review' },
        access: { text: 'Acceso vencido', expired: true },
      }),
    );
    expect(toGuestRow(LUIS, NOW).badge).toEqual({ label: 'En onboarding', tone: 'review' });
    expect(toGuestRow({ ...ROSA, status: 'INACTIVE' }, NOW).badge).toEqual({
      label: 'Inactivo',
      tone: 'unpaid',
    });
  });
});

describe('guest list (A3) texts', () => {
  it('names the environment by its own type and says what keeps it', () => {
    expect(environmentText(ROSA)).toEqual({
      main: 'Habitación 101',
      detail: 'contrato hasta 31 mar 2027',
    });
    const open = { ...ROSA.environment, endDate: null } as GuestSummary['environment'];
    expect(environmentText({ ...ROSA, environment: open })).toEqual({
      main: 'Habitación 101',
      detail: 'contrato sin fecha de fin',
    });
    expect(environmentText(ANA)).toEqual({ main: 'Cabaña C1', detail: 'estadía 20 – 31 oct' });
    expect(environmentText(PENDING)).toEqual({
      main: 'Sin ambiente',
      detail: 'se asigna con el contrato o la estadía',
    });
  });

  it('gives an inactive guest its last environment or stay', () => {
    const room = {
      code: '208',
      type: 'ROOM',
      kind: 'CONTRACT',
      startDate: '2025-01-01',
      endDate: null,
    } as const;
    const stay = {
      code: 'C4',
      type: 'CABIN',
      kind: 'STAY',
      startDate: '2026-07-03',
      endDate: '2026-07-12',
    } as const;

    expect(environmentText({ ...ROSA, status: 'INACTIVE', environment: room })).toEqual({
      main: 'último ambiente: 208',
      detail: null,
    });
    expect(environmentText({ ...ANA, status: 'INACTIVE', environment: stay })).toEqual({
      main: 'última estadía: C4, 3 – 12 jul',
      detail: null,
    });
    expect(environmentText({ ...ROSA, status: 'INACTIVE', environment: null })).toEqual({
      main: 'Sin ambiente',
      detail: null,
    });
  });

  it('says when the access expires in Lima time, or that it expired', () => {
    expect(accessText('2026-11-05T21:05:00Z', NOW)).toEqual({
      text: 'Acceso vence hoy a las 16:05',
      expired: false,
    });
    expect(accessText('2026-11-06T15:00:00Z', NOW)).toEqual({
      text: 'Acceso vence el 6 nov 2026 a las 10:00',
      expired: false,
    });
    expect(accessText('2026-11-05T17:00:00Z', NOW)).toEqual({
      text: 'Acceso vencido',
      expired: true,
    });
    expect(accessText(null, NOW)).toBeNull();
    expect(accessText('no es fecha', NOW)).toBeNull();
  });

  it('counts what is shown of what is loaded', () => {
    expect(countText(3, 20)).toBe('Mostrando 3 de 20 cargados');
  });
});

describe('«Lo que toca ahora» (A3)', () => {
  const STILL = ' Hasta que terminen no se les puede cargar un contrato ni una estadía.';

  it('is not there while nobody is pending', () => {
    expect(nowPanel({ pendingActivationCount: 0, onboardingCount: 3 }, [], NOW)).toBeNull();
  });

  it('one pending guest, with its expired access by document and one in onboarding', () => {
    expect(
      nowPanel({ pendingActivationCount: 1, onboardingCount: 1 }, [EXPIRED, ROSA], NOW),
    ).toEqual({
      figure: 1,
      label: 'huésped sin activar',
      text:
        'Aún no abre su acceso. Al Pasaporte 548210 se le venció: genera otro desde su ficha.' +
        ' Además, 1 está completando sus datos.' +
        STILL,
    });
  });

  it('several pending guests, several expired and several in onboarding', () => {
    const other = { ...EXPIRED, id: 'other', documentNumber: '1' };
    expect(
      nowPanel({ pendingActivationCount: 4, onboardingCount: 2 }, [EXPIRED, other, PENDING], NOW),
    ).toEqual({
      figure: 4,
      label: 'huéspedes sin activar',
      text:
        'Aún no abren su acceso. A 2 se les venció: genera otro desde su ficha.' +
        ' Además, 2 están completando sus datos.' +
        STILL,
    });
  });

  it('without expired accesses nor onboarding it only says what waits', () => {
    expect(nowPanel({ pendingActivationCount: 2, onboardingCount: 0 }, [PENDING], NOW)?.text).toBe(
      `Aún no abren su acceso.${STILL}`,
    );
  });
});
