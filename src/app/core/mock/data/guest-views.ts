import type { components } from '@core/api/bff.generated';
import { currentStay, paymentHistory } from './account-views';
import type { GuestRecord, MockDb } from './mock-db';

type Schemas = components['schemas'];

/** The environment a guest occupies or will occupy, else its last one (A3 column Ambiente). */
function environmentRef(db: MockDb, guest: GuestRecord): Schemas['EnvironmentRef'] | null {
  const contract = db.contractOf(guest.id);
  if (contract !== undefined) {
    return {
      code: contract.environmentCode,
      type: contract.environmentType,
      kind: 'CONTRACT',
      startDate: contract.startDate,
      endDate: contract.endDate ?? null,
    };
  }
  const stay = currentStay(db, guest.id);
  const environment = db.environment(stay?.environmentId ?? null);
  if (stay === undefined || environment === undefined) {
    return null;
  }
  return {
    code: environment.code,
    type: environment.type,
    kind: 'STAY',
    startDate: stay.startDate,
    endDate: stay.endDate,
  };
}

export function guestSummary(db: MockDb, guest: GuestRecord): Schemas['GuestSummary'] {
  return {
    id: guest.id,
    documentType: guest.documentType,
    documentNumber: guest.documentNumber,
    name: guest.name,
    type: guest.type,
    status: guest.status,
    hasLoginAccess: guest.hasLoginAccess,
    environment: environmentRef(db, guest),
    accessExpiresAt: guest.status === 'PENDING_ACTIVATION' ? guest.accessExpiresAt : null,
  };
}

/** What every variant of the guest 360 shares. */
function detailBase(db: MockDb, guest: GuestRecord) {
  const stay = guest.type === 'TEMPORARY' ? currentStay(db, guest.id) : undefined;
  const contract = guest.type === 'CONTRACT' ? db.contractOf(guest.id) : undefined;
  return {
    id: guest.id,
    documentType: guest.documentType,
    documentNumber: guest.documentNumber,
    type: guest.type,
    hasLoginAccess: guest.hasLoginAccess,
    contactEmail: guest.contactEmail,
    accountEmail: guest.accountEmail,
    documentCount: guest.documentCount,
    accessExpiresAt: guest.accessExpiresAt,
    paymentHistory: paymentHistory(db, guest.id),
    ...(stay && {
      stayStartDate: stay.startDate,
      stayEndDate: stay.endDate,
      agreedAmount: stay.agreedAmount,
    }),
    ...(contract && { contract }),
  };
}

/** The guest 360 (A3.2), in the variant of its status (RN-33, RN-36). */
export function guestDetail(db: MockDb, guest: GuestRecord): Schemas['GuestDetail'] {
  const base = detailBase(db, guest);
  switch (guest.status) {
    case 'PENDING_ACTIVATION':
      return {
        ...base,
        version: guest.version,
        name: guest.name,
        phone: guest.phone,
        status: 'PENDING_ACTIVATION',
        onboardingProgress: 'NOT_STARTED',
      };
    case 'ONBOARDING':
      return {
        ...base,
        name: guest.name,
        phone: guest.phone,
        status: 'ONBOARDING',
        onboardingProgress: 'PASSWORD_SET',
      };
    case 'ACTIVE':
      return {
        ...base,
        name: guest.name ?? '',
        phone: guest.phone ?? '',
        status: 'ACTIVE',
        onboardingProgress: 'COMPLETED',
      };
    case 'INACTIVE':
      return {
        ...base,
        name: guest.name,
        phone: guest.phone,
        status: 'INACTIVE',
        onboardingProgress: 'COMPLETED',
        deactivatedAt: guest.deactivatedAt,
      };
  }
}
