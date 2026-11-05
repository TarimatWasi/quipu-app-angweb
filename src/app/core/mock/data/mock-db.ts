import type { components } from '@core/api/bff.generated';

type Schemas = components['schemas'];
export type DocumentType = Schemas['DocumentType'];
export type Environment = Schemas['Environment'];
export type Contract = Schemas['Contract'];
export type AdminProof = Schemas['AdminProof'];
export type PaymentReview = Schemas['PaymentReview'];
export type ReviewerRef = Schemas['ReviewerRef'];
export type PaymentSurplus = Schemas['PaymentSurplus'];
export type GuestRefund = Schemas['GuestRefund'];
export type GuestCredit = Schemas['GuestCredit'];
export type PaymentStatus = Schemas['Payment']['status'];

/** A guest as the simulated BFF keeps it; the detail and the summary are derived from it. */
export interface GuestRecord {
  readonly id: string;
  version: number;
  documentType: DocumentType;
  documentNumber: string;
  readonly name: string | null;
  readonly type: 'CONTRACT' | 'TEMPORARY';
  readonly status: Schemas['GuestStatus'];
  readonly phone: string | null;
  readonly contactEmail: string | null;
  readonly accountEmail: string | null;
  readonly hasLoginAccess: boolean;
  readonly accessExpiresAt: string | null;
  readonly deactivatedAt: string | null;
  readonly documentCount: number;
}

/** A stay without what is derived from its payment (`paymentStatus`, `paymentId`). */
export interface StayRecord {
  readonly id: string;
  readonly guestId: string;
  environmentId: string | null;
  startDate: string;
  endDate: string;
  agreedAmount: number;
  version: number;
}

/** A payment without what is derived from its guest, contract or stay. */
export interface PaymentRecord {
  readonly id: string;
  readonly guestId: string;
  readonly contractId: string | null;
  readonly stayId: string | null;
  readonly period: string | null;
  status: PaymentStatus;
  proofs: AdminProof[];
  reviews: PaymentReview[];
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: ReviewerRef | null;
  surplus: PaymentSurplus | null;
  submittedAt: string;
  readonly createdAt: string;
  readonly creditApplied: number;
}

/** An administrator account as the simulated BFF keeps it, with its whole document (RF-22). */
export interface AdministratorRecord {
  readonly id: string;
  readonly name: string | null;
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly email: string;
  status: Schemas['AdministratorSummary']['status'];
  readonly createdAt: string;
}

export type RefundRecord = GuestRefund & { readonly guestId: string };

export interface CreditRecord {
  balance: number;
  lastRefund: GuestCredit['lastRefund'];
}

/** Everything the simulated BFF knows; each scenario seeds its own copy. */
export interface MockDbData {
  readonly environments: Environment[];
  readonly guests: GuestRecord[];
  readonly contracts: Contract[];
  readonly stays: StayRecord[];
  readonly payments: PaymentRecord[];
  readonly refunds: RefundRecord[];
  readonly credits: Map<string, CreditRecord>;
  readonly administrators: AdministratorRecord[];
}

/** The kinds of record, used in the opaque ids so a mixed-up id never finds the wrong record. */
export const ID_KIND = {
  guest: 1,
  environment: 2,
  contract: 3,
  stay: 4,
  payment: 5,
  proof: 6,
  refund: 7,
  admin: 8,
} as const;

/** An opaque id shaped like the uuids of the BFF, stable for the seeded data. */
export function mockId(kind: number, n: number): string {
  return `${String(kind).padStart(8, '0')}-0000-4000-8000-${String(n).padStart(12, '0')}`;
}

/** The data in memory, with its lookups. Mutations change what the next reads answer. */
export class MockDb {
  private sequence = 1000;

  constructor(readonly data: MockDbData) {}

  newId(kind: number): string {
    this.sequence += 1;
    return mockId(kind, this.sequence);
  }

  administrator(id: string): AdministratorRecord | undefined {
    return this.data.administrators.find((administrator) => administrator.id === id);
  }

  guest(id: string): GuestRecord | undefined {
    return this.data.guests.find((guest) => guest.id === id);
  }

  environment(id: string | null): Environment | undefined {
    return this.data.environments.find((environment) => environment.id === id);
  }

  contract(id: string | null): Contract | undefined {
    return this.data.contracts.find((contract) => contract.id === id);
  }

  /** The contract of a guest in force, else its latest one. */
  contractOf(guestId: string): Contract | undefined {
    const own = this.data.contracts.filter((contract) => contract.guestId === guestId);
    return own.find((contract) => contract.status === 'ACTIVE') ?? own.at(-1);
  }

  stay(id: string | null): StayRecord | undefined {
    return this.data.stays.find((stay) => stay.id === id);
  }

  /** The stays of a guest, newest first (RN-13). */
  staysOf(guestId: string): StayRecord[] {
    return this.data.stays
      .filter((stay) => stay.guestId === guestId)
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }

  payment(id: string): PaymentRecord | undefined {
    return this.data.payments.find((payment) => payment.id === id);
  }

  paymentsOf(guestId: string): PaymentRecord[] {
    return this.data.payments.filter((payment) => payment.guestId === guestId);
  }

  /** The live payment of a period or a stay: the approved one, else the latest sent. */
  paymentFor(
    target: { contractId: string; period: string } | { stayId: string },
  ): PaymentRecord | undefined {
    const matches = this.data.payments
      .filter((payment) =>
        'stayId' in target
          ? payment.stayId === target.stayId
          : payment.contractId === target.contractId && payment.period === target.period,
      )
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
    return matches.find((payment) => payment.status === 'APPROVED') ?? matches[0];
  }

  credit(guestId: string): CreditRecord {
    let credit = this.data.credits.get(guestId);
    if (credit === undefined) {
      credit = { balance: 0, lastRefund: null };
      this.data.credits.set(guestId, credit);
    }
    return credit;
  }
}
