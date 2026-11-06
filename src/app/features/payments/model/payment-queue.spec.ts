import type { components } from '@core/api/bff.generated';
import {
  countText,
  DEFAULT_SORT,
  hasFilters,
  NO_FILTERS,
  queueNowPanel,
  toQueueRow,
  visiblePayments,
} from './payment-queue';
import { nextSort } from '@shared/ui/data-table/list-sort';
import type { QueueSummary } from './payment-queue';

type PaymentQueueItem = components['schemas']['PaymentQueueItem'];

const NOW = new Date('2026-10-29T15:00:00Z');

function item(overrides: Partial<PaymentQueueItem> = {}): PaymentQueueItem {
  return {
    id: 'pay_a',
    guestId: 'g_a',
    guestName: 'Luis Mamani',
    documentNumber: '45678912',
    guestType: 'CONTRACT',
    environmentCode: '104',
    period: '2026-10',
    stayStartDate: null,
    stayEndDate: null,
    status: 'PENDING',
    proofCount: 2,
    voucherCount: 2,
    hasCash: false,
    reviewedBy: null,
    submittedAt: '2026-10-26T14:14:00Z',
    createdAt: '2026-10-26T14:14:00Z',
    ...overrides,
  } as PaymentQueueItem;
}

const PEDRO = item({
  id: 'pay_p',
  guestName: 'Pedro Ccori',
  documentNumber: '41239876',
  environmentCode: '105',
  period: '2026-09',
  submittedAt: '2026-10-01T02:40:00Z',
  voucherCount: 1,
});
const CARMEN = item({
  id: 'pay_c',
  guestName: 'Carmen Huamán',
  documentNumber: '001234567',
  guestType: 'TEMPORARY',
  environmentCode: 'C1',
  period: null,
  stayStartDate: '2026-10-20',
  stayEndDate: '2026-10-31',
  submittedAt: '2026-10-27T23:02:00Z',
});
const LUIS = item();

function summary(overrides: Partial<QueueSummary> = {}): QueueSummary {
  return {
    pendingTotal: 4,
    oldestPending: PEDRO,
    rejected: { count: 0, oldest: null },
    ...overrides,
  };
}

describe('A5 queue model', () => {
  it('shows a payment with its columns, the badge of its state and its action', () => {
    expect(toQueueRow(CARMEN, NOW)).toEqual({
      id: 'pay_c',
      name: 'Carmen Huamán',
      document: '001234567',
      type: 'Temporal',
      environment: 'C1',
      period: '20 – 31 oct',
      submitted: '27 oct 2026, 18:02',
      ago: 'hace 2 días',
      reason: null,
      proofs: '2 vouchers',
      badge: { label: 'Pendiente de revisión', tone: 'review' },
      resolvedBy: null,
      action: 'Revisar pago',
      actionName: 'Revisar pago de Carmen Huamán',
      primary: true,
    });
  });

  it('says why a payment was rejected and how long ago (TAR-296)', () => {
    const row = toQueueRow(
      item({
        status: 'REJECTED',
        rejectionReason: 'No se lee el voucher.',
        reviewedAt: '2026-10-21T18:31:00Z',
      }),
      NOW,
    );
    expect(row).toMatchObject({
      reason: 'Motivo: No se lee el voucher.',
      ago: 'rechazado hace 8 días',
    });
    expect(toQueueRow(item({ status: 'APPROVED', rejectionReason: 'x' }), NOW).reason).toBeNull();
  });

  it('says who resolved it, and offers «Corregir pago» or a «Ver pago» link', () => {
    const rejected = toQueueRow(
      item({ status: 'REJECTED', reviewedBy: { id: 'a1', name: 'Rosa Quispe' } }),
      NOW,
    );
    expect(rejected).toMatchObject({
      badge: { label: 'Rechazado', tone: 'rejected' },
      resolvedBy: 'Rechazado por Rosa Quispe',
      action: 'Corregir pago',
      primary: true,
    });
    const approved = toQueueRow(item({ status: 'APPROVED', environmentCode: null }), NOW);
    expect(approved).toMatchObject({ environment: '—', action: 'Ver pago', primary: false });
  });

  it('searches the loaded payments by name without accents, document or environment, and filters by type', () => {
    const all = [LUIS, PEDRO, CARMEN];
    const names = (filters: typeof NO_FILTERS) =>
      visiblePayments(all, filters, DEFAULT_SORT).map((p) => p.guestName);

    expect(names(NO_FILTERS)).toEqual(['Pedro Ccori', 'Luis Mamani', 'Carmen Huamán']);
    expect(names({ search: 'huaman', type: 'ALL' })).toEqual(['Carmen Huamán']);
    expect(names({ search: '4123', type: 'ALL' })).toEqual(['Pedro Ccori']);
    expect(names({ search: 'c1', type: 'ALL' })).toEqual(['Carmen Huamán']);
    expect(names({ search: '', type: 'CONTRACT' })).toEqual(['Pedro Ccori', 'Luis Mamani']);
    expect(hasFilters(NO_FILTERS)).toBe(false);
    expect(hasFilters({ search: ' ', type: 'TEMPORARY' })).toBe(true);
  });

  it('sorts by a column and turns it around when pressed again', () => {
    const all = [LUIS, PEDRO, CARMEN];
    const byGuest = nextSort(DEFAULT_SORT, 'guest');
    expect(byGuest).toEqual({ key: 'guest', direction: 'asc' });
    expect(visiblePayments(all, NO_FILTERS, byGuest).map((p) => p.id)).toEqual([
      'pay_c',
      'pay_a',
      'pay_p',
    ]);
    const back = nextSort(byGuest, 'guest');
    expect(back.direction).toBe('desc');
    expect(visiblePayments(all, NO_FILTERS, back).map((p) => p.id)).toEqual([
      'pay_p',
      'pay_a',
      'pay_c',
    ]);
    const byPeriod = nextSort(DEFAULT_SORT, 'period');
    expect(visiblePayments(all, NO_FILTERS, byPeriod).map((p) => p.id)).toEqual([
      'pay_p',
      'pay_a',
      'pay_c',
    ]);
  });

  it('says how many are shown of the loaded ones', () => {
    expect(countText(2, 4, false)).toBe('Mostrando 2 de 4');
    expect(countText(20, 20, true)).toBe('Mostrando 20 de 20 cargados');
  });

  it('counts every pending payment and names the oldest with its month and how long it waits', () => {
    expect(queueNowPanel('PENDING', summary(), NOW)).toEqual({
      figure: 4,
      label: 'pagos por revisar',
      text: 'El más antiguo es de Pedro Ccori (septiembre 2026), subido hace 29 días.',
      action: { label: 'Revisar el más antiguo', paymentId: 'pay_p' },
    });
    const one = queueNowPanel('PENDING', summary({ pendingTotal: 1, oldestPending: CARMEN }), NOW);
    expect(one).toMatchObject({
      label: 'pago por revisar',
      text: 'El más antiguo es de Carmen Huamán (estadía del 20 – 31 oct), subido hace 2 días.',
    });
  });

  it('says nothing waits, without an action, when the queue is empty', () => {
    expect(
      queueNowPanel('PENDING', summary({ pendingTotal: 0, oldestPending: null }), NOW),
    ).toEqual({
      figure: 0,
      label: 'pagos por revisar',
      text: 'No hay pagos esperando. Cuando un huésped envíe uno, aparecerá aquí.',
      action: null,
    });
  });

  it('counts the rejected payments not yet corrected and offers the oldest one', () => {
    const rejected = summary({
      rejected: {
        count: 2,
        oldest: {
          paymentId: 'pay_r',
          guestName: 'Ana Quispe',
          period: '2026-10',
          stayStartDate: null,
          stayEndDate: null,
          rejectedAt: '2026-10-05T03:17:00Z',
        },
      },
    });
    expect(queueNowPanel('REJECTED', rejected, NOW)).toEqual({
      figure: 2,
      label: 'pagos rechazados sin corregir',
      text: 'El huésped los corrige y los envía de nuevo; si te pagó la diferencia en persona, agrégala tú y apruébalo. El más antiguo es el de Ana Quispe (octubre 2026), rechazado hace 25 días.',
      action: { label: 'Corregir el más antiguo', paymentId: 'pay_r' },
    });
    expect(queueNowPanel('REJECTED', summary(), NOW)?.action).toBeNull();
  });

  it('has no panel in «Aprobados»', () => {
    expect(queueNowPanel('APPROVED', summary(), NOW)).toBeNull();
  });
});
