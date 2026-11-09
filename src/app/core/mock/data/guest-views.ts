import type { components } from '@core/api/bff.generated';
import { currentStay, paymentHistory } from './account-views';
import type { DocumentRecord, GuestRecord, MockDb } from './mock-db';

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
    email: guest.email,
    documentCount: db.documentsOf(guest.id).length,
    accessExpiresAt: guest.accessExpiresAt,
    ...(guest.emergencyContact && { emergencyContact: guest.emergencyContact }),
    paymentHistory: paymentHistory(db, guest.id),
    ...(stay && {
      stayStartDate: stay.startDate,
      stayEndDate: stay.endDate,
      agreedAmount: stay.agreedAmount,
    }),
    ...(contract && { contract }),
  };
}

/** Where the onboarding of a guest goes: its own, else none without a name and all with one. */
function progressOf(guest: GuestRecord): Schemas['OnboardingProgress'] {
  return guest.onboardingProgress ?? (guest.name === null ? 'NOT_STARTED' : 'COMPLETED');
}

/** An onboarding guest, with or without its personal data saved (RN-33). */
function onboardingDetail(
  base: ReturnType<typeof detailBase>,
  guest: GuestRecord,
): Schemas['GuestDetail'] {
  // An onboarding guest has at least chosen its password.
  const progress = guest.onboardingProgress ?? 'PASSWORD_SET';
  if (
    (progress === 'PERSONAL_DATA_SAVED' || progress === 'DOCUMENTS_DONE') &&
    guest.name !== null &&
    guest.phone !== null
  ) {
    return {
      ...base,
      name: guest.name,
      phone: guest.phone,
      status: 'ONBOARDING',
      onboardingProgress: progress,
    };
  }
  return {
    ...base,
    name: guest.name,
    phone: guest.phone,
    status: 'ONBOARDING',
    onboardingProgress: progress === 'NOT_STARTED' ? 'NOT_STARTED' : 'PASSWORD_SET',
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
      return onboardingDetail(base, guest);
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
        onboardingProgress: progressOf(guest),
        deactivatedAt: guest.deactivatedAt,
      };
  }
}

/** The sample file the simulated storage «signs» for a contract or a document (public/mock-assets). */
const SAMPLE_FILE = '/mock-assets/voucher-muestra.pdf';

/** A contract with the signed link the simulated storage gives it (A4.2, H2). */
export function signedContract(contract: Schemas['Contract']): Schemas['Contract'] {
  return { ...contract, fileUrl: SAMPLE_FILE };
}

/**
 * H2: the contract in force (or the latest) of the guest with its sample file, and the next one
 * if a renewal is already loaded, that is, a contract that starts after it (RN-20).
 */
export function ownContracts(
  db: MockDb,
  guestId: string,
): { current: Schemas['Contract']; next: Schemas['Contract'] | null } | undefined {
  const current = db.contractOf(guestId);
  if (current === undefined) return undefined;
  const next = db.data.contracts
    .filter((item) => item.guestId === guestId && item.startDate > current.startDate)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  return {
    current: signedContract(current),
    next: next === undefined ? null : signedContract(next),
  };
}

/** The signed links last 15 minutes (RN-37). */
const LINK_MS = 15 * 60 * 1000;

/**
 * A document with the signed link the BFF would give: here it points at the sample file that the
 * simulated storage «signs» (public/mock-assets), and ends 15 minutes from now.
 */
export function signedDocument(document: DocumentRecord): Schemas['GuestDocument'] {
  const expires = Date.now() + LINK_MS;
  return {
    id: document.id,
    originalName: document.originalName,
    contentType: document.contentType,
    sizeBytes: document.sizeBytes,
    uploadedAt: document.uploadedAt,
    url: `${SAMPLE_FILE}?expira=${String(expires)}`,
    urlExpiresAt: new Date(expires).toISOString(),
  };
}
