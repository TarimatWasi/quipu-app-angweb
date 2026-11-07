import type { Contract, ContractSummary } from './contract';

export function summaryOf(fields: Partial<ContractSummary> = {}): ContractSummary {
  return {
    id: 'c1',
    environmentId: 'e1',
    guestId: 'g1',
    guestName: 'Lucía Paredes',
    documentType: 'DNI',
    documentNumber: '43219087',
    environmentCode: '101',
    environmentType: 'ROOM',
    monthlyAmount: 650,
    paymentDay: 5,
    graceDays: 3,
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    status: 'ACTIVE',
    expiringSoon: false,
    terminatedAt: null,
    ...fields,
  };
}

export function contractOf(fields: Partial<Contract> = {}): Contract {
  return {
    ...summaryOf(),
    file: { name: 'contrato-101.pdf', sizeBytes: 860_000, uploadedAt: '2026-03-30T14:00:00Z' },
    fileUrl: 'https://files.example.com/contrato-101.pdf',
    ...fields,
  };
}
