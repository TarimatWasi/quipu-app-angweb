import type { components } from '@core/api/bff.generated';
import {
  isNext,
  refundNotice,
  rejectedStayAlert,
  stayFacts,
  stayHeading,
  stayNow,
} from './stay-status';

type Stay = components['schemas']['StayPaymentStatus'];

const NOW = new Date('2026-10-29T15:00:00Z');

function stay(overrides: Partial<Stay> = {}): Stay {
  return {
    stayId: 's1',
    startDate: '2026-10-25',
    endDate: '2026-11-02',
    environmentCode: 'C1',
    environmentType: 'CABIN',
    status: 'UNPAID',
    agreedAmount: 420,
    paymentId: null,
    rejectionReason: null,
    surplus: null,
    ...overrides,
  };
}

describe('T1 «Estado de pago»: lo que toca ahora', () => {
  it('asks for the voucher before the exit of a stay that is not paid', () => {
    expect(stayNow(stay(), NOW)).toEqual({
      figure: 'S/ 420.00',
      label: 'Estadía del 25 oct – 2 nov',
      text: 'Paga antes de tu salida, el 2 de noviembre, y sube aquí la foto o el PDF del voucher.',
      urgent: false,
      badge: { label: 'No pagado', tone: 'unpaid' },
      action: { label: 'Subir voucher', link: ['/temporary-guest/payment'], query: null },
    });
  });

  it('says the stay is over and has no approved payment, in red', () => {
    const now = stayNow(
      stay({ status: 'OVERDUE', startDate: '2026-10-20', endDate: '2026-10-27' }),
      NOW,
    );

    expect(now.text).toBe('Tu estadía terminó el 27 de octubre y aún no tiene un pago aprobado.');
    expect(now.urgent).toBe(true);
    expect(now.action?.label).toBe('Subir voucher');
  });

  it('lets the guest see the payment under review, and corrects a rejected one', () => {
    const review = stayNow(stay({ status: 'UNDER_REVIEW', paymentId: 'pay_t' }), NOW);
    expect(review.action).toEqual({
      label: 'Ver pago',
      link: ['/temporary-guest/payment', 'pay_t'],
      query: null,
    });

    const rejected = stayNow(stay({ paymentId: 'pay_t', rejectionReason: 'No se lee' }), NOW);
    expect(rejected.text).toBe(
      'Tus comprobantes siguen ahí: cambia la foto del voucher o agrega otro antes de tu salida, el 2 de noviembre.',
    );
    expect(rejected.action?.label).toBe('Corregir pago');
  });

  it('asks nothing of a paid stay, and says the next stay can be paid already', () => {
    const paid = stayNow(stay({ status: 'PAID', paymentId: 'pay_t' }), NOW);
    expect(paid.text).toBe('Tu pago está aprobado. No tienes nada pendiente.');
    expect(paid.action).toBeNull();

    const next = stay({ startDate: '2026-11-05', endDate: '2026-11-12' });
    expect(isNext(next, NOW)).toBe(true);
    expect(stayHeading(next, NOW)).toBe('Tu próxima estadía');
    expect(stayHeading(stay(), NOW)).toBe('Tu estadía');
    expect(stayNow(next, NOW).text).toBe(
      'Tu próxima estadía empieza el 5 de noviembre. Puedes pagarla desde ya.',
    );
  });
});

describe('T1: los avisos y las fichas', () => {
  it('quotes why the payment was not approved', () => {
    expect(rejectedStayAlert(stay({ paymentId: 'p', rejectionReason: 'No se lee' }))).toEqual({
      heading: 'Tu pago no se aprobó.',
      reason: 'Motivo: No se lee',
    });
    expect(rejectedStayAlert(stay())).toBeNull();
  });

  it('says the refund is pending or was made, and never keeps credit (RN-39)', () => {
    const pending = refundNotice(
      stay({
        surplus: { amount: 30, refundStatus: 'PENDING', refundedOn: null, refundMethod: null },
      }),
    );
    expect(pending).toEqual({
      heading: 'Te devolveremos S/ 30.00.',
      text: 'La administración te devolverá la diferencia de S/ 30.00 y aquí verás cuándo y por qué medio.',
      tone: 'info',
    });

    const made = refundNotice(
      stay({
        surplus: {
          amount: 30,
          refundStatus: 'REFUNDED',
          refundedOn: '2026-10-29',
          refundMethod: 'Yape',
        },
      }),
    );
    expect(made?.heading).toBe('Te devolvimos S/ 30.00 el 29 oct 2026 por Yape.');
    expect(made?.tone).toBe('success');
    expect(refundNotice(stay())).toBeNull();
  });

  it('gives the four tiles of the stay: entry, exit, nights and the agreed amount', () => {
    expect(stayFacts(stay())).toEqual([
      { label: 'Entrada', value: '25 oct' },
      { label: 'Salida', value: '2 nov' },
      { label: 'Noches', value: '8' },
      { label: 'Monto acordado', value: 'S/ 420.00' },
    ]);
  });
});
