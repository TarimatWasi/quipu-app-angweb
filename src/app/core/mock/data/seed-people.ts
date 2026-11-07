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
  // A3.2: the rooms of the contracts of Carmen and Julia, always occupied.
  room205: mockId(ID_KIND.environment, 8),
  room206: mockId(ID_KIND.environment, 9),
} as const;

export const CONTRACT_IDS = {
  luis: mockId(ID_KIND.contract, 1),
  maria: mockId(ID_KIND.contract, 2),
  reviewing: mockId(ID_KIND.contract, 3),
  upToDate: mockId(ID_KIND.contract, 4),
} as const;

/** How long the access of the guest pending activation still lasts when the data is seeded. */
const PENDING_ACCESS_MINUTES = 18;

export function environment(id: string, code: string, type: Environment['type']): Environment {
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
    environment(ENVIRONMENT_IDS.room205, '205', 'ROOM'),
    environment(ENVIRONMENT_IDS.room206, '206', 'ROOM'),
    {
      ...environment(ENVIRONMENT_IDS.room204, '204', 'ROOM'),
      status: 'INACTIVE',
      deactivatedAt: instantOn(addDays(today(), -30)),
    },
  ];
}

type GuestFields = Pick<GuestRecord, 'id' | 'documentType' | 'documentNumber' | 'name' | 'type'> &
  Partial<GuestRecord>;

export function guest(fields: GuestFields): GuestRecord {
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
      emergencyContact: { name: 'Rosa Ccori', relationship: 'madre', phone: '984 112 233' },
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
      accessExpiresAt: new Date(Date.now() + PENDING_ACCESS_MINUTES * 60_000).toISOString(),
    }),
    // A3 and A3.2: one in onboarding, who saved its data (2 of 4 steps) but not its consent yet.
    guest({
      id: GUEST_IDS.onboarding,
      documentType: 'DNI',
      documentNumber: '70000008',
      name: 'Carlos Ttito Huallpa',
      type: 'CONTRACT',
      status: 'ONBOARDING',
      phone: '921 098 765',
      documentCount: 0,
      onboardingProgress: 'PERSONAL_DATA_SAVED',
    }),
    ...detailContractGuests(),
  ];
}

/** A3.2: a payment under review, a guest up to date and an active guest still without a contract. */
function detailContractGuests(): GuestRecord[] {
  return [
    guest({
      id: GUEST_IDS.reviewing,
      documentType: 'DNI',
      documentNumber: '70000010',
      name: 'Carmen Rosa Quispe Huamán',
      type: 'CONTRACT',
      phone: '910 987 654',
      contactEmail: 'carmen.quispe@example.com',
    }),
    guest({
      id: GUEST_IDS.upToDate,
      documentType: 'CE',
      documentNumber: '002345678',
      name: 'Julia Condori Pari',
      type: 'CONTRACT',
      phone: '909 876 543',
      documentCount: 3,
      emergencyContact: { name: 'Mario Condori', relationship: 'hermano', phone: '908 765 432' },
    }),
    guest({
      id: GUEST_IDS.noContract,
      documentType: 'DNI',
      documentNumber: '70000012',
      name: 'Diego Huanca Flores',
      type: 'CONTRACT',
      phone: '907 654 321',
      documentCount: 0,
    }),
    // Deactivated before it ever used its access, which expired meanwhile (CU-28).
    guest({
      id: GUEST_IDS.lapsed,
      documentType: 'DNI',
      documentNumber: '70000013',
      name: null,
      type: 'CONTRACT',
      status: 'INACTIVE',
      hasLoginAccess: false,
      documentCount: 0,
      accessExpiresAt: instantOn(addDays(today(), -25), 11),
      deactivatedAt: instantOn(addDays(today(), -20)),
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
    // A3: its access expired without being used (RN-32), so the administrator generates another.
    guest({
      id: GUEST_IDS.expired,
      documentType: 'DNI',
      documentNumber: '70000007',
      name: null,
      type: 'TEMPORARY',
      status: 'PENDING_ACTIVATION',
      hasLoginAccess: false,
      documentCount: 0,
      accessExpiresAt: instantOn(addDays(today(), -1), 16),
    }),
  ];
}

/** A3.1: inactive and owing its last stay (RN-35), so «Reactivar huésped» asks to pay it first. */
function owingGuest(): GuestRecord {
  return guest({
    id: GUEST_IDS.owing,
    documentType: 'DNI',
    documentNumber: '70000009',
    name: 'Rocío Layme Ccori',
    type: 'TEMPORARY',
    status: 'INACTIVE',
    phone: '932 109 876',
    deactivatedAt: instantOn(addDays(today(), -60)),
  });
}

export function seedGuests(): GuestRecord[] {
  return [...contractGuests(), ...temporaryGuests(), owingGuest()];
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
    ...seedMainContracts(luis, maria, room201, room202),
    ...detailContracts(guests, environments),
  ];
}

function seedMainContracts(
  luis: GuestRecord,
  maria: GuestRecord,
  room201: Environment,
  room202: Environment,
): Contract[] {
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

/** A3.2: the contracts of the guest with a payment under review and of the one up to date. */
function detailContracts(
  guests: readonly GuestRecord[],
  environments: readonly Environment[],
): Contract[] {
  const reviewing = guests.find((item) => item.id === GUEST_IDS.reviewing);
  const upToDate = guests.find((item) => item.id === GUEST_IDS.upToDate);
  const room205 = environments.find((item) => item.id === ENVIRONMENT_IDS.room205);
  const room206 = environments.find((item) => item.id === ENVIRONMENT_IDS.room206);
  if (!reviewing || !upToDate || !room205 || !room206) {
    return [];
  }
  return [
    contract({
      id: CONTRACT_IDS.reviewing,
      guest: reviewing,
      environment: room205,
      monthlyAmount: 820,
      paymentDay: 5,
      monthsAgo: 2,
    }),
    contract({
      id: CONTRACT_IDS.upToDate,
      guest: upToDate,
      environment: room206,
      monthlyAmount: 800,
      paymentDay: 1,
      monthsAgo: 3,
    }),
  ];
}
