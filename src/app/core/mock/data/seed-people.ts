// Seeded environments, guests and contracts. Every name, document, phone and email is made up;
// emails use the reserved example.com domain.
import { GUEST_IDS } from './demo-users';
import { addDays, addMonths, instantOn, today } from './mock-dates';
import { ID_KIND, mockId } from './mock-db';
import type { Contract, Environment, GuestRecord } from './mock-db';

export const ENVIRONMENT_IDS = {
  room201: mockId(ID_KIND.environment, 1),
  room202: mockId(ID_KIND.environment, 2),
  cabinC1: mockId(ID_KIND.environment, 3),
  cabinC2: mockId(ID_KIND.environment, 4),
  room203: mockId(ID_KIND.environment, 5),
  cabinC3: mockId(ID_KIND.environment, 6),
  room204: mockId(ID_KIND.environment, 7),
} as const;

export const CONTRACT_IDS = {
  luis: mockId(ID_KIND.contract, 1),
  maria: mockId(ID_KIND.contract, 2),
} as const;

function environment(id: string, code: string, type: Environment['type']): Environment {
  return {
    id,
    code,
    type,
    status: 'ACTIVE',
    occupant: null,
    nextOccupant: null,
    freeSince: addDays(today(), -60),
    deactivatedAt: null,
    version: 1,
  };
}

export function seedEnvironments(): Environment[] {
  return [
    environment(ENVIRONMENT_IDS.room201, '201', 'ROOM'),
    environment(ENVIRONMENT_IDS.room202, '202', 'ROOM'),
    environment(ENVIRONMENT_IDS.cabinC1, 'C1', 'CABIN'),
    environment(ENVIRONMENT_IDS.cabinC2, 'C2', 'CABIN'),
    environment(ENVIRONMENT_IDS.room203, '203', 'ROOM'),
    environment(ENVIRONMENT_IDS.cabinC3, 'C3', 'CABIN'),
    {
      ...environment(ENVIRONMENT_IDS.room204, '204', 'ROOM'),
      status: 'INACTIVE',
      deactivatedAt: instantOn(addDays(today(), -30)),
    },
  ];
}

type GuestFields = Pick<GuestRecord, 'id' | 'documentType' | 'documentNumber' | 'name' | 'type'> &
  Partial<GuestRecord>;

function guest(fields: GuestFields): GuestRecord {
  return {
    version: 1,
    status: 'ACTIVE',
    phone: null,
    contactEmail: null,
    accountEmail: null,
    hasLoginAccess: true,
    accessExpiresAt: null,
    deactivatedAt: null,
    documentCount: 1,
    ...fields,
  };
}

function contractGuests(): GuestRecord[] {
  return [
    guest({
      id: GUEST_IDS.luis,
      documentType: 'DNI',
      documentNumber: '70000002',
      name: 'Luis Alberto Huamán Ccori',
      type: 'CONTRACT',
      phone: '987 654 321',
      contactEmail: 'luis.huaman@example.com',
      accountEmail: 'luis.huaman@example.com',
      documentCount: 2,
    }),
    guest({
      id: GUEST_IDS.maria,
      documentType: 'DNI',
      documentNumber: '70000003',
      name: 'María Fernanda Ccahuana Rojas',
      type: 'CONTRACT',
      phone: '976 543 210',
      contactEmail: 'maria.ccahuana@example.com',
    }),
    guest({
      id: GUEST_IDS.pending,
      documentType: 'DNI',
      documentNumber: '70000006',
      name: null,
      type: 'CONTRACT',
      status: 'PENDING_ACTIVATION',
      hasLoginAccess: false,
      documentCount: 0,
      accessExpiresAt: instantOn(addDays(today(), 1)),
    }),
  ];
}

function temporaryGuests(): GuestRecord[] {
  return [
    guest({
      id: GUEST_IDS.ana,
      documentType: 'CE',
      documentNumber: '001234567',
      name: 'Ana Lucía Torres Vela',
      type: 'TEMPORARY',
      phone: '965 432 109',
      accountEmail: 'ana.torres@example.com',
    }),
    guest({
      id: GUEST_IDS.jorge,
      documentType: 'DNI',
      documentNumber: '70000005',
      name: 'Jorge Quispe Apaza',
      type: 'TEMPORARY',
      phone: '954 321 098',
    }),
    guest({
      id: GUEST_IDS.pedro,
      documentType: 'PASSPORT',
      documentNumber: 'PX0012345',
      name: 'Pedro Mamani Condori',
      type: 'TEMPORARY',
      status: 'INACTIVE',
      phone: '943 210 987',
      deactivatedAt: instantOn(addDays(today(), -90)),
    }),
  ];
}

export function seedGuests(): GuestRecord[] {
  return [...contractGuests(), ...temporaryGuests()];
}

interface ContractFields {
  readonly id: string;
  readonly guest: GuestRecord;
  readonly environment: Environment;
  readonly monthlyAmount: number;
  readonly paymentDay: number;
  /** Months between the start of the contract and the current month. */
  readonly monthsAgo: number;
}

function contract(fields: ContractFields): Contract {
  const startDate = `${addMonths(today(), -fields.monthsAgo)}-01`;
  const endDate = addDays(`${addMonths(startDate, 12)}-01`, -1);
  return {
    id: fields.id,
    environmentId: fields.environment.id,
    guestId: fields.guest.id,
    guestName: fields.guest.name,
    documentType: fields.guest.documentType,
    documentNumber: fields.guest.documentNumber,
    environmentCode: fields.environment.code,
    environmentType: fields.environment.type,
    monthlyAmount: fields.monthlyAmount,
    paymentDay: fields.paymentDay,
    graceDays: 3,
    startDate,
    endDate,
    status: 'ACTIVE',
    expiringSoon: false,
    terminatedAt: null,
    file: {
      name: `contrato-${fields.environment.code}.pdf`,
      sizeBytes: 182_400,
      uploadedAt: instantOn(startDate, 9),
    },
    fileUrl: null,
  };
}

export function seedContracts(
  guests: readonly GuestRecord[],
  environments: readonly Environment[],
): Contract[] {
  const byGuest = (id: string) => guests.find((item) => item.id === id);
  const byEnvironment = (id: string) => environments.find((item) => item.id === id);
  const luis = byGuest(GUEST_IDS.luis);
  const maria = byGuest(GUEST_IDS.maria);
  const room201 = byEnvironment(ENVIRONMENT_IDS.room201);
  const room202 = byEnvironment(ENVIRONMENT_IDS.room202);
  if (!luis || !maria || !room201 || !room202) {
    return [];
  }
  return [
    contract({
      id: CONTRACT_IDS.luis,
      guest: luis,
      environment: room201,
      monthlyAmount: 750,
      paymentDay: 5,
      monthsAgo: 4,
    }),
    contract({
      id: CONTRACT_IDS.maria,
      guest: maria,
      environment: room202,
      monthlyAmount: 680,
      paymentDay: 10,
      monthsAgo: 6,
    }),
  ];
}
