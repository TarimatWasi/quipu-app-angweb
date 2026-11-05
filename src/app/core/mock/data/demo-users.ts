import type { components } from '@core/api/bff.generated';
import { ID_KIND, mockId } from './mock-db';
import type { DocumentType } from './mock-db';

type AdminSession = components['schemas']['AdminSession'];
type GuestActiveSession = components['schemas']['GuestActiveSession'];

/** The roles the scenario panel offers; each one is a demo account. */
export const DEMO_USER_KEYS = [
  'admin',
  'contract-guest',
  'temporary-guest',
  'temporary-password',
] as const;
export type DemoUserKey = (typeof DEMO_USER_KEYS)[number];

/** A demo account of the simulated BFF. Every name and document is made up. */
export interface DemoUser {
  readonly key: DemoUserKey;
  /** The role as the panel and the pull request describe it. */
  readonly label: string;
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  /** The guest of the account; null for the administration. */
  readonly guestId: string | null;
  readonly session: AdminSession | GuestActiveSession;
}

/** The «clave» of every demo account: not a secret, the backend is simulated and runs in the browser. */
export const DEMO_CLAVE = 'Quipu2026';

export const ADMIN_REVIEWER = { id: mockId(ID_KIND.admin, 1), name: 'Rosa Elvira Quispe Mamani' };

export const GUEST_IDS = {
  luis: mockId(ID_KIND.guest, 1),
  maria: mockId(ID_KIND.guest, 2),
  ana: mockId(ID_KIND.guest, 3),
  jorge: mockId(ID_KIND.guest, 4),
  pending: mockId(ID_KIND.guest, 5),
  pedro: mockId(ID_KIND.guest, 6),
  expired: mockId(ID_KIND.guest, 7),
  onboarding: mockId(ID_KIND.guest, 8),
  owing: mockId(ID_KIND.guest, 9),
} as const;

export const DEMO_USERS: Readonly<Record<DemoUserKey, DemoUser>> = {
  admin: {
    key: 'admin',
    label: 'Administración',
    documentType: 'DNI',
    documentNumber: '40000001',
    guestId: null,
    session: { role: 'ADMIN', name: ADMIN_REVIEWER.name, mustChangePassword: false },
  },
  'contract-guest': {
    key: 'contract-guest',
    label: 'Huésped con contrato',
    documentType: 'DNI',
    documentNumber: '70000002',
    guestId: GUEST_IDS.luis,
    session: {
      role: 'GUEST',
      guestType: 'CONTRACT',
      name: 'Luis Alberto Huamán Ccori',
      mustChangePassword: false,
      guestStatus: 'ACTIVE',
    },
  },
  'temporary-guest': {
    key: 'temporary-guest',
    label: 'Huésped temporal',
    documentType: 'CE',
    documentNumber: '001234567',
    guestId: GUEST_IDS.ana,
    session: {
      role: 'GUEST',
      guestType: 'TEMPORARY',
      name: 'Ana Lucía Torres Vela',
      mustChangePassword: false,
      guestStatus: 'ACTIVE',
    },
  },
  'temporary-password': {
    key: 'temporary-password',
    label: 'Huésped con clave temporal',
    documentType: 'DNI',
    documentNumber: '70000003',
    guestId: GUEST_IDS.maria,
    session: {
      role: 'GUEST',
      guestType: 'CONTRACT',
      name: 'María Fernanda Ccahuana Rojas',
      mustChangePassword: true,
      guestStatus: 'ACTIVE',
    },
  },
};

export function isDemoUserKey(value: string | null): value is DemoUserKey {
  return (DEMO_USER_KEYS as readonly (string | null)[]).includes(value);
}

/**
 * The temporary password of the «temporary-password» account once its 30 minutes are over (RN-32):
 * the login answers AUTH_TEMPORARY_PASSWORD_EXPIRED. Not a secret either.
 */
export const DEMO_EXPIRED_CLAVE = 'Vencida2026';

/** The demo account with that document, whatever the password, or undefined. */
export function findDemoUserByDocument(
  documentType: unknown,
  documentNumber: unknown,
): DemoUser | undefined {
  return Object.values(DEMO_USERS).find(
    (user) => user.documentType === documentType && user.documentNumber === documentNumber,
  );
}

/** The demo account with that document and password, or undefined. */
export function findDemoUser(
  documentType: unknown,
  documentNumber: unknown,
  password: unknown,
): DemoUser | undefined {
  return password === DEMO_CLAVE ? findDemoUserByDocument(documentType, documentNumber) : undefined;
}
