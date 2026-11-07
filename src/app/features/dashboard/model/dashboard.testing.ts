import type { AdminDashboard, DashboardCharge } from './dashboard-charges';

type Voucher = AdminDashboard['pendingVouchers'][number];

/** Thursday 29 October 2026, 10:00 in Lima: the day of the canvas «Inicio». */
export const NOW = new Date('2026-10-29T15:00:00Z');

export function chargeOf(fields: Partial<DashboardCharge> = {}): DashboardCharge {
  return {
    guestId: 'g1',
    guestName: 'Ana Quispe',
    documentType: 'DNI',
    documentNumber: '12345678',
    guestType: 'CONTRACT',
    environmentCode: '201',
    contractId: 'c1',
    stayId: null,
    period: '2026-10',
    stayStartDate: null,
    stayEndDate: null,
    amount: 800,
    dueDate: '2026-10-05',
    status: 'PAID',
    paymentId: null,
    paymentRejected: false,
    ...fields,
  };
}

interface VoucherFields {
  readonly id?: string;
  readonly guestName?: string | null;
  readonly submittedAt?: string;
}

const VOUCHER = {
  id: 'p1',
  guestId: 'g2',
  guestName: 'Pedro Ccori',
  documentNumber: '41239876',
  status: 'PENDING',
  proofCount: 1,
  voucherCount: 1,
  hasCash: false,
  reviewedBy: null,
  rejectionReason: null,
  reviewedAt: null,
  submittedAt: '2026-09-30T15:00:00Z',
  createdAt: '2026-09-30T15:00:00Z',
} as const;

/** A voucher of the month of a contract, waiting for its review. */
export function voucherOf(fields: VoucherFields = {}): Voucher {
  return {
    ...VOUCHER,
    guestType: 'CONTRACT',
    environmentCode: '105',
    period: '2026-09',
    stayStartDate: null,
    stayEndDate: null,
    ...fields,
  };
}

/** A voucher of a stay of a temporary guest, waiting for its review. */
export function stayVoucherOf(fields: VoucherFields = {}): Voucher {
  return {
    ...VOUCHER,
    guestType: 'TEMPORARY',
    environmentCode: 'C1',
    period: null,
    stayStartDate: '2026-10-20',
    stayEndDate: '2026-10-31',
    ...fields,
  };
}

/** A residence with nothing pending and no charge: every block of the answer, empty. */
export function dashboardOf(fields: Partial<AdminDashboard> = {}): AdminDashboard {
  return {
    paymentsUpToDate: 0,
    paymentsUnderReview: 0,
    paymentsPending: 0,
    paymentsOverdue: 0,
    pendingVouchers: [],
    pendingVouchersTotal: 0,
    charges: [],
    overdue: { count: 0, total: 0, first: [] },
    rejected: { count: 0, oldest: null },
    refunds: { count: 0, total: 0 },
    expiringContracts: { count: 0, first: null },
    guestsNotActivated: { count: 0, expired: 0, first: null },
    ...fields,
  };
}
