import type { Environment, Occupant } from './environment';

export function environmentOf(fields: Partial<Environment> = {}): Environment {
  return {
    id: 'e1',
    code: '109',
    type: 'ROOM',
    status: 'ACTIVE',
    occupant: null,
    nextOccupant: null,
    freeSince: '2026-10-15',
    deactivatedAt: null,
    version: 3,
    ...fields,
  };
}

export function contractOf(fields: Partial<Occupant> = {}): Occupant {
  return {
    kind: 'CONTRACT',
    guestId: 'g1',
    guestName: 'Lucía Paredes',
    contractId: 'c1',
    stayId: null,
    startDate: '2026-03-01',
    endDate: '2027-03-31',
    ...fields,
  };
}

export function stayOf(fields: Partial<Occupant> = {}): Occupant {
  return {
    kind: 'STAY',
    guestId: 'g2',
    guestName: 'Diego Rojas',
    contractId: null,
    stayId: 's1',
    startDate: '2026-10-25',
    endDate: '2026-11-02',
    ...fields,
  };
}
