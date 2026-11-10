import type { GuestDetail, PeriodStatus, Stay } from '@core/api/clients/admin-guests.service';
import { detailPanel, owesAnything } from './detail-panel';
import type { PanelInput } from './detail-panel';

type Contract = NonNullable<GuestDetail['contract']>;

function contractOf(status: Contract['status']): Contract {
  return {
    id: 'c1',
    environmentId: 'e1',
    guestId: 'g1',
    guestName: 'Luis Huamán',
    documentType: 'DNI',
    documentNumber: '70412233',
    environmentCode: '201',
    environmentType: 'ROOM',
    monthlyAmount: 800,
    paymentDay: 5,
    graceDays: 3,
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    status,
    expiringSoon: false,
    terminatedAt: null,
    file: { name: 'contrato.pdf', sizeBytes: 1, uploadedAt: '2026-07-01T10:00:00Z' },
    fileUrl: null,
  };
}

// 15:47 in Lima on Thursday 5 November 2026.
const NOW = new Date('2026-11-05T20:47:00Z');

function guestOf(fields: Record<string, unknown> = {}): GuestDetail {
  return {
    id: 'g1',
    documentType: 'DNI',
    documentNumber: '70412233',
    name: 'Luis Huamán',
    type: 'CONTRACT',
    hasLoginAccess: true,
    phone: '987 654 321',
    documentCount: 1,
    paymentHistory: [],
    status: 'ACTIVE',
    onboardingProgress: 'COMPLETED',
    contract: contractOf('ACTIVE'),
    ...fields,
  };
}

function period(p: string, status: PeriodStatus['status'], extra: Partial<PeriodStatus> = {}) {
  return {
    period: p,
    status,
    dueDate: `${p}-05`,
    amount: 800,
    creditApplied: 0,
    amountDue: 800,
    contractId: 'c1',
    paymentId: null,
    rejectionReason: null,
    ...extra,
  };
}

function stay(start: string, end: string, status: Stay['paymentStatus'], paymentId: string | null) {
  return {
    id: `s-${start}`,
    environmentId: 'e1',
    environmentCode: 'C1',
    startDate: start,
    endDate: end,
    agreedAmount: 480,
    paymentStatus: status,
    paymentId,
    version: 1,
  };
}

function panel(input: Partial<PanelInput>) {
  return detailPanel({
    guest: guestOf(),
    periods: [],
    stays: [],
    now: NOW,
    reactivated: false,
    ...input,
  });
}

describe('A3.2 «Lo que toca ahora»', () => {
  it('1. an access that expired while inactive comes first, with «Generar otro acceso»', () => {
    const guest = guestOf({
      status: 'PENDING_ACTIVATION',
      onboardingProgress: 'NOT_STARTED',
      name: null,
      accessExpiresAt: '2026-10-11T16:00:00Z',
    });

    expect(panel({ guest, reactivated: true })).toEqual({
      figure: 'Vencido',
      alarm: true,
      label: 'su acceso',
      badge: null,
      text: 'Venció mientras estaba inactivo. Genera otro y entrégaselo: el anterior ya no sirve.',
      action: { kind: 'generate-access', label: 'Generar otro acceso' },
    });
    expect(panel({ guest }).text).toBe(
      'Nadie lo usó a tiempo. Genera otro y entrégaselo: el anterior ya no sirve.',
    );
    expect(panel({ guest: guestOf({ ...guest, accessExpiresAt: null }) }).figure).toBe('Vencido');
  });

  it('2. pending activation: the countdown left and when it expires', () => {
    const guest = guestOf({
      status: 'PENDING_ACTIVATION',
      onboardingProgress: 'NOT_STARTED',
      accessExpiresAt: '2026-11-05T21:05:00Z',
    });

    expect(panel({ guest })).toEqual({
      figure: '18:00',
      alarm: false,
      label: 'para que use su acceso',
      badge: null,
      text: 'El acceso que generaste vence hoy a las 16:05 (vale 30 minutos). Si no le llegó o venció, genera otro: el anterior deja de servir.',
      action: { kind: 'generate-access', label: 'Generar otro acceso' },
    });
    const later = guestOf({ ...guest, accessExpiresAt: '2026-11-07T15:00:00Z' });
    expect(panel({ guest: later }).figure).toBe('1 día');
    expect(panel({ guest: later }).text).toContain('vence el 7 nov 2026 a las 10:00');
  });

  it('3. onboarding: how many steps it took and what is missing, without an action', () => {
    const guest = guestOf({ status: 'ONBOARDING', onboardingProgress: 'PERSONAL_DATA_SAVED' });

    expect(panel({ guest })).toEqual({
      figure: '2 de 4',
      alarm: false,
      label: 'pasos de su registro',
      badge: null,
      text: 'Ya entró y está completando su registro. Le faltan documentos (opcional) y consentimiento; al aceptar queda Activo.',
      action: null,
    });
    const almost = guestOf({ status: 'ONBOARDING', onboardingProgress: 'DOCUMENTS_DONE' });
    expect(panel({ guest: almost }).text).toContain('Le falta el consentimiento;');
    const first = guestOf({ status: 'ONBOARDING', onboardingProgress: 'PASSWORD_SET' });
    expect(panel({ guest: first }).text).toContain(
      'Le faltan datos personales, documentos (opcional) y consentimiento;',
    );
  });

  it('4. inactive and owing: the total, since when, and «Registrar pago»', () => {
    const guest = guestOf({
      status: 'INACTIVE',
      deactivatedAt: '2026-09-06T15:00:00Z',
      contract: contractOf('TERMINATED'),
    });
    const periods = [
      period('2026-08', 'PAID'),
      period('2026-09', 'OVERDUE'),
      period('2026-10', 'OVERDUE', { amountDue: 750 }),
    ];

    expect(panel({ guest, periods })).toEqual({
      figure: 'S/ 1,550.00',
      alarm: true,
      label: '2 meses por pagar',
      badge: null,
      text: 'Su cuenta está inactiva desde el 6 sep 2026. Para reactivarla, primero salda septiembre 2026 y octubre 2026 con un pago directo.',
      action: {
        kind: 'link',
        label: 'Registrar pago',
        link: ['/admin/payments/new'],
        query: { guestId: 'g1' },
      },
    });
    const temporary = guestOf({ ...guest, type: 'TEMPORARY', deactivatedAt: null });
    const owed = panel({
      guest: temporary,
      stays: [stay('2026-08-20', '2026-08-27', 'OVERDUE', null)],
    });
    expect(owed.label).toBe('1 estadía por pagar');
    expect(owed.text).toBe(
      'Su cuenta está inactiva. Para reactivarla, primero salda la estadía del 20 – 27 ago 2026 con un pago directo.',
    );
  });

  it('5. inactive without debt: «Reactivar huésped»', () => {
    const guest = guestOf({ status: 'INACTIVE', contract: undefined });

    expect(panel({ guest, periods: [period('2026-09', 'PAID')] })).toEqual({
      figure: 'Inactivo',
      alarm: false,
      label: '',
      badge: null,
      text: 'No puede entrar a Quipu. Sus datos y su historial se conservan.',
      action: { kind: 'reactivate', label: 'Reactivar huésped' },
    });
  });

  it('6. owing with a rejected payment: the reason and «Corregir pago» on that payment', () => {
    const periods = [
      period('2026-09', 'PAID', { paymentId: 'p1' }),
      period('2026-10', 'OVERDUE', {
        paymentId: 'p2',
        amountDue: 750,
        rejectionReason: 'El voucher no se lee',
      }),
      period('2026-11', 'UNDER_REVIEW', { paymentId: 'p3' }),
    ];

    expect(panel({ periods })).toEqual({
      figure: 'S/ 750.00',
      alarm: true,
      label: 'por pagar',
      badge: { label: 'Atrasado', tone: 'overdue' },
      text: 'Octubre 2026: venció el 5 oct y su pago fue rechazado («El voucher no se lee»). Corrígelo o agrega lo que falte en la revisión del pago.',
      action: {
        kind: 'link',
        label: 'Corregir pago',
        link: ['/admin/payments', 'p2'],
        query: null,
      },
    });
  });

  it('7. owing without a payment: the months, the first due date and «Registrar pago»', () => {
    const periods = [period('2026-09', 'OVERDUE'), period('2026-10', 'OVERDUE')];

    const owed = panel({ periods });
    expect(owed.figure).toBe('S/ 1,600.00');
    expect(owed.badge).toEqual({ label: 'Atrasado', tone: 'overdue' });
    expect(owed.text).toBe(
      'Septiembre 2026 y Octubre 2026: venció el 5 sep. Si te pagó en persona, regístralo como pago directo.',
    );
    expect(owed.action).toEqual({
      kind: 'link',
      label: 'Registrar pago',
      link: ['/admin/payments/new'],
      query: { guestId: 'g1' },
    });
  });

  it('8. under review: the amount, when it was sent and «Revisar pago»', () => {
    const guest = guestOf({
      paymentHistory: [{ id: 'p3', submittedAt: '2026-11-02T14:00:00Z' }],
    });
    const periods = [
      period('2026-10', 'PAID'),
      period('2026-11', 'UNDER_REVIEW', { paymentId: 'p3' }),
    ];

    expect(panel({ guest, periods })).toEqual({
      figure: 'S/ 800.00',
      alarm: false,
      label: 'por revisar',
      badge: { label: 'Pendiente de revisión', tone: 'review' },
      text: 'Noviembre 2026: envió su pago hace 3 días.',
      action: { kind: 'link', label: 'Revisar pago', link: ['/admin/payments', 'p3'], query: null },
    });
    const temporary = guestOf({ type: 'TEMPORARY', paymentHistory: [] });
    const stays = [stay('2026-11-02', '2026-11-09', 'UNDER_REVIEW', 'p4')];
    expect(panel({ guest: temporary, stays }).text).toBe(
      'Estadía del 2 – 9 nov 2026: envió su pago.',
    );
  });

  it('9. active with a contract type but no contract: «Sin contrato», with the way to load one', () => {
    const guest = guestOf({ contract: undefined });

    expect(panel({ guest })).toEqual({
      figure: 'Sin contrato',
      alarm: false,
      label: '',
      badge: null,
      text: 'Su cuenta está activa, pero aún no tiene contrato: cárgalo para empezar a cobrarle.',
      action: {
        kind: 'link',
        label: 'Cargar contrato',
        link: ['/admin/contracts/new'],
        query: { guestId: guest.id },
      },
    });
  });

  it('9. a contract that ended is not «aún no tiene»: it says when, with the way to load another (TAR-361)', () => {
    const expired = guestOf({ contract: { ...contractOf('EXPIRED'), endDate: '2026-08-31' } });
    expect(panel({ guest: expired })).toMatchObject({
      figure: 'Sin contrato',
      text: 'Su contrato venció el 31 ago 2026: carga uno nuevo para seguir cobrándole.',
      action: { kind: 'link', label: 'Cargar contrato', query: { guestId: expired.id } },
    });

    const ended = guestOf({
      contract: { ...contractOf('TERMINATED'), terminatedAt: '2026-10-15' },
    });
    expect(panel({ guest: ended })).toMatchObject({
      figure: 'Sin contrato',
      text: 'Su contrato se finalizó el 15 oct 2026: carga uno nuevo para seguir cobrándole.',
      action: { kind: 'link', label: 'Cargar contrato' },
    });
  });

  it('10. up to date: nothing to do, with the last month or stay it paid', () => {
    const periods = [period('2026-09', 'PAID'), period('2026-10', 'PAID')];

    expect(panel({ periods })).toEqual({
      figure: '0',
      alarm: false,
      label: 'meses por pagar',
      badge: null,
      text: 'Está al día: pagó octubre. No hay nada por hacer.',
      action: null,
    });
    const temporary = guestOf({ type: 'TEMPORARY' });
    const paid = panel({
      guest: temporary,
      stays: [stay('2026-10-20', '2026-10-27', 'PAID', 'p1')],
    });
    expect(paid.label).toBe('estadías por pagar');
    expect(paid.text).toBe(
      'Está al día: pagó su estadía del 20 – 27 oct 2026. No hay nada por hacer.',
    );
    expect(panel({ guest: temporary }).text).toBe('Está al día. No hay nada por hacer.');
  });

  it('a rejected payment not yet overdue still asks to correct it, before the review', () => {
    const periods = [
      period('2026-10', 'PAID'),
      period('2026-11', 'UNPAID', { paymentId: 'p11', rejectionReason: 'Falta el voucher' }),
    ];

    expect(panel({ periods })).toEqual({
      figure: 'S/ 800.00',
      alarm: false,
      label: 'por pagar',
      badge: { label: 'No pagado', tone: 'unpaid' },
      text: 'Noviembre 2026: vence el 5 nov y su pago fue rechazado («Falta el voucher»). Corrígelo o agrega lo que falte en la revisión del pago.',
      action: {
        kind: 'link',
        label: 'Corregir pago',
        link: ['/admin/payments', 'p11'],
        query: null,
      },
    });
  });

  it('up to date with a month still to come says when it is due, not that nothing is left', () => {
    const periods = [period('2026-10', 'PAID'), period('2026-11', 'UNPAID')];

    expect(panel({ periods }).text).toBe(
      'Está al día: pagó octubre. Noviembre 2026 vence el 5 nov.',
    );
    expect(panel({ periods }).figure).toBe('0');
  });

  it('says whether the guest owes', () => {
    expect(
      owesAnything({ guest: guestOf(), periods: [period('2026-10', 'OVERDUE')], stays: [] }),
    ).toBe(true);
    expect(
      owesAnything({ guest: guestOf(), periods: [period('2026-10', 'UNPAID')], stays: [] }),
    ).toBe(false);
  });
});
