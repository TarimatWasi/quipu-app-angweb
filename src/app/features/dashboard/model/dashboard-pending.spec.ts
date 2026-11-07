import { chargeOf, dashboardOf, NOW, stayVoucherOf, voucherOf } from './dashboard.testing';
import { FIRST_STEPS, isFirstUse, nowOf, pendingOf } from './dashboard-pending';
import type { AdminDashboard } from './dashboard-charges';

const TODAY = '2026-10-29';

const ANA_REF = {
  guestId: 'g1',
  guestName: 'Ana Quispe',
  environmentCode: '201',
  period: '2026-10',
  stayStartDate: null,
  stayEndDate: null,
  dueDate: '2026-10-05',
  amount: 800,
};
const PEDRO_REF = {
  ...ANA_REF,
  guestId: 'g2',
  guestName: 'Pedro Ccori',
  environmentCode: '105',
  dueDate: '2026-10-10',
  amount: 650,
};

const overdueDashboard = (): AdminDashboard =>
  dashboardOf({
    charges: [
      chargeOf({ status: 'OVERDUE', paymentId: 'p9', paymentRejected: true }),
      chargeOf({
        guestId: 'g2',
        guestName: 'Pedro Ccori',
        environmentCode: '105',
        contractId: 'c2',
        status: 'OVERDUE',
        dueDate: '2026-10-10',
        amount: 650,
      }),
    ],
    overdue: { count: 2, total: 1450, first: [ANA_REF, PEDRO_REF] },
  });

describe('what waits for the administrator (A1 «Lo que toca ahora»)', () => {
  it('lists nothing when nothing waits', () => {
    expect(pendingOf(dashboardOf(), NOW)).toEqual([]);
  });

  it('puts the vouchers to review first, with the oldest one and a link to its review', () => {
    const [review] = pendingOf(
      dashboardOf({ pendingVouchersTotal: 4, pendingVouchers: [voucherOf()] }),
      NOW,
    );

    expect(review).toEqual(
      expect.objectContaining({
        key: 'review',
        tone: 'warning',
        figure: '4',
        label: 'pagos por revisar',
        meta: 'El más antiguo es el de Pedro Ccori (septiembre), enviado hace 29 días.',
        cta: {
          label: 'Revisar el más antiguo',
          to: { kind: 'route', link: ['/admin/payments', 'p1'], query: { vista: 'por-revisar' } },
        },
        head: '4 pagos por revisar:',
        text: 'el más antiguo, de septiembre, hace 29 días.',
      }),
    );
    expect(review?.link?.label).toBe('Ir a Pagos');
  });

  it('speaks in the singular for one voucher and names a stay by its dates', () => {
    const [review] = pendingOf(
      dashboardOf({
        pendingVouchersTotal: 1,
        pendingVouchers: [stayVoucherOf()],
      }),
      NOW,
    );

    expect(review?.label).toBe('pago por revisar');
    expect(review?.head).toBe('1 pago por revisar:');
    expect(review?.meta).toContain('Es el de Pedro Ccori (20 – 31 oct)');
  });

  it('says the total overdue in soles, who is late and offers a direct payment for the first without one', () => {
    const [overdue] = pendingOf(overdueDashboard(), NOW);

    expect(overdue).toEqual(
      expect.objectContaining({
        key: 'overdue',
        tone: 'danger',
        figure: 'S/ 1,450.00',
        label: 'en cobros atrasados',
        head: '2 cobros atrasados:',
        text: 'Ana Quispe (201) y Pedro Ccori (105), S/ 1,450.00.',
      }),
    );
    expect(overdue?.meta).toBe(
      'Ana Quispe (201) venció el 5 oct 2026 y tiene un pago rechazado por corregir; Pedro Ccori (105) venció el 10 oct 2026. Si Pedro te pagó en persona, regístralo como pago directo.',
    );
    expect(overdue?.cta).toEqual({
      label: 'Registrar pago de Pedro Ccori',
      to: { kind: 'route', link: ['/admin/payments', 'new'], query: { guestId: 'g2' } },
    });
    expect(overdue?.link).toEqual({ label: 'Ver atrasados', to: { kind: 'overdue' } });
  });

  it('offers to correct the payment when every overdue charge has one rejected', () => {
    const dashboard = dashboardOf({
      charges: [chargeOf({ status: 'OVERDUE', paymentId: 'p9', paymentRejected: true })],
      overdue: { count: 1, total: 800, first: [ANA_REF] },
    });

    const [overdue] = pendingOf(dashboard, NOW);

    expect(overdue?.cta).toEqual({
      label: 'Corregir pago de Ana Quispe',
      to: { kind: 'route', link: ['/admin/payments', 'p9'], query: { vista: 'rechazados' } },
    });
    expect(overdue?.meta).not.toContain('pago directo');
  });

  it('counts the rejected payments not corrected and leads to them', () => {
    const [rejected] = pendingOf(
      dashboardOf({
        rejected: {
          count: 2,
          oldest: {
            paymentId: 'p3',
            guestName: 'Ana Quispe',
            period: '2026-10',
            stayStartDate: null,
            stayEndDate: null,
            rejectedAt: '2026-10-05T15:00:00Z',
          },
        },
      }),
      NOW,
    );

    expect(rejected).toEqual(
      expect.objectContaining({
        key: 'rejected',
        figure: '2',
        label: 'pagos rechazados sin corregir',
        meta: 'El más antiguo es el de Ana Quispe (octubre), rechazado hace 24 días.',
        cta: {
          label: 'Ver rechazados',
          to: { kind: 'route', link: ['/admin/payments'], query: { vista: 'rechazados' } },
        },
      }),
    );
  });

  it('says what is owed back in soles, and has no link while Finanzas does not exist', () => {
    const [refunds] = pendingOf(dashboardOf({ refunds: { count: 2, total: 85 } }), NOW);

    expect(refunds).toEqual(
      expect.objectContaining({
        key: 'refunds',
        figure: 'S/ 85.00',
        label: 'por devolver a 2 huéspedes',
        meta: 'Pagaron de más y ya no tienen un mes donde usarlo.',
        head: '2 devoluciones por registrar:',
        text: 'S/ 85.00 que pagaron de más.',
        cta: null,
        link: null,
      }),
    );
  });

  it('names the contract that ends first, with no link while Contratos does not exist', () => {
    const first = {
      contractId: 'c5',
      guestName: 'Rocío Apaza',
      environmentCode: '202',
      endDate: '2026-11-25',
    };

    const [one] = pendingOf(dashboardOf({ expiringContracts: { count: 1, first } }), NOW);
    const [two] = pendingOf(dashboardOf({ expiringContracts: { count: 2, first } }), NOW);

    expect(one?.label).toBe('contrato vence en 30 días o menos');
    expect(one?.meta).toBe(
      'Rocío Apaza (202) vence el 25 nov 2026. Si renueva, carga el contrato nuevo antes de esa fecha.',
    );
    expect(two?.label).toBe('contratos vencen en 30 días o menos');
    expect(two?.meta).toContain('El primero en vencer es el de Rocío Apaza (202), el 25 nov 2026.');
    expect(one?.cta).toBeNull();
  });

  it('says who has an expired access first, and leads to their page', () => {
    const first = {
      guestId: 'g8',
      documentType: 'DNI' as const,
      documentNumber: '71844520',
      accessExpiresAt: '2026-10-28T21:00:00Z',
    };

    const [one] = pendingOf(
      dashboardOf({ guestsNotActivated: { count: 2, expired: 1, first } }),
      NOW,
    );
    const [many] = pendingOf(
      dashboardOf({ guestsNotActivated: { count: 3, expired: 2, first } }),
      NOW,
    );
    const [none] = pendingOf(
      dashboardOf({ guestsNotActivated: { count: 1, expired: 0, first } }),
      NOW,
    );

    expect(one?.meta).toBe(
      'Al DNI 71844520 se le venció el acceso sin entrar: genera otro y entrégaselo.',
    );
    expect(one?.cta).toEqual({
      label: 'Ver huésped',
      to: { kind: 'route', link: ['/admin/guests', 'g8'], query: null },
    });
    expect(many?.meta).toContain('A 2 se les venció el acceso');
    expect(none?.meta).toBe('El acceso del DNI 71844520 vence el 28 oct 2026, 16:00.');
  });

  it('orders them: review, overdue, rejected, refunds, expiring, not activated', () => {
    const everything = dashboardOf({
      ...overdueDashboard(),
      pendingVouchersTotal: 1,
      pendingVouchers: [voucherOf()],
      rejected: { count: 1, oldest: null },
      refunds: { count: 1, total: 10 },
      expiringContracts: { count: 1, first: null },
      guestsNotActivated: { count: 1, expired: 0, first: null },
    });

    expect(pendingOf(everything, NOW).map((item) => item.key)).toEqual([
      'review',
      'overdue',
      'rejected',
      'refunds',
      'expiring',
      'inactive',
    ]);
  });
});

describe('the panel of A1', () => {
  it('is the first thing that waits, in red ink when it is late or rejected', () => {
    const late = overdueDashboard();
    const review = dashboardOf({ pendingVouchersTotal: 1, pendingVouchers: [voucherOf()] });

    expect(nowOf(late, pendingOf(late, NOW), TODAY)).toEqual(
      expect.objectContaining({ figure: 'S/ 1,450.00', urgent: true }),
    );
    expect(nowOf(review, pendingOf(review, NOW), TODAY)).toEqual(
      expect.objectContaining({ figure: '1', urgent: false }),
    );
  });

  it('says «Nada pendiente» with the next due date when charges exist and nothing waits', () => {
    const calm = dashboardOf({
      charges: [
        chargeOf({ status: 'PAID' }),
        chargeOf({
          guestName: 'Miguel Torres',
          environmentCode: '106',
          contractId: 'c6',
          status: 'UNPAID',
          dueDate: '2026-10-30',
        }),
        chargeOf({
          guestName: 'Elena Choque',
          contractId: 'c7',
          status: 'UNPAID',
          dueDate: '2026-10-31',
        }),
      ],
    });

    expect(nowOf(calm, pendingOf(calm, NOW), TODAY)).toEqual({
      figure: 'Al día',
      label: 'Nada pendiente',
      meta: 'No hay pagos por revisar ni cobros atrasados. El próximo vencimiento es el de Miguel Torres (106), el 30 oct 2026.',
      cta: null,
      urgent: false,
    });
  });

  it('welcomes the first use: no charge and nothing pending, with its three steps', () => {
    const empty = dashboardOf();

    expect(isFirstUse(empty, [])).toBe(true);
    expect(nowOf(empty, [], TODAY)).toEqual(
      expect.objectContaining({ figure: 'Bienvenida', label: 'Quipu aún no tiene datos' }),
    );
    expect(isFirstUse(dashboardOf({ charges: [chargeOf()] }), [])).toBe(false);
    expect(FIRST_STEPS.map((step) => step.title)).toEqual([
      'Crea tus ambientes',
      'Registra a tus huéspedes',
      'Carga los contratos',
    ]);
  });
});
