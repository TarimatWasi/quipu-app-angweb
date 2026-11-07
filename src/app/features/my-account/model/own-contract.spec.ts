import type { components } from '@core/api/bff.generated';
import { currentBlock, isLinkStale, nextBlock } from './own-contract';

type Contract = components['schemas']['Contract'];
type PeriodStatus = components['schemas']['PeriodStatus'];

// 15:00 UTC of 2026-10-29 is the same day in Lima.
const NOW = new Date('2026-10-29T15:00:00Z');

function contractOf(fields: Partial<Contract> = {}): Contract {
  return {
    id: 'c1',
    environmentId: 'e1',
    guestId: 'g1',
    guestName: 'Ana Quispe',
    documentType: 'DNI',
    documentNumber: '12345678',
    environmentCode: '201',
    environmentType: 'ROOM',
    monthlyAmount: 800,
    paymentDay: 5,
    graceDays: 3,
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    status: 'ACTIVE',
    expiringSoon: false,
    terminatedAt: null,
    file: { name: 'contrato-201.pdf', sizeBytes: 880_640, uploadedAt: '2026-03-01T15:00:00Z' },
    fileUrl: 'https://files.example/c1',
    ...fields,
  };
}

function month(period: string, status: PeriodStatus['status'], amountDue = 800): PeriodStatus {
  return {
    period,
    status,
    dueDate: `${period}-05`,
    amount: 800,
    creditApplied: 0,
    amountDue,
    contractId: 'c1',
    paymentId: null,
    rejectionReason: null,
  };
}

const context = (periods: PeriodStatus[] = []) => ({ now: NOW, periods });
const block = (fields: Partial<Contract> = {}, periods: PeriodStatus[] = []) =>
  currentBlock(contractOf(fields), null, context(periods));

describe('H2 the state of the contract', () => {
  it('says «Vigente» with when it ends, counted from today in Lima', () => {
    const view = block();

    expect(view.state).toEqual({ tone: 'paid', label: 'Vigente' });
    expect(view.text).toBe('Vence el 28 de febrero de 2027, en 4 meses.');
    expect(view.notice).toBeNull();
  });

  it('leaves the year out when it is this one, and counts days up to 45', () => {
    const view = block({ endDate: '2026-11-28', expiringSoon: true });

    expect(view.state).toEqual({ tone: 'review', label: 'Próximo a vencer' });
    expect(view.text).toBe('Vence el 28 de noviembre, en 30 días.');
    expect(view.notice).toEqual({
      tone: 'info',
      heading: '¿Quieres seguir?',
      text: 'Habla con la administración antes del 28 de noviembre para renovar.',
      accountLink: false,
    });
  });

  it('says there is no end date instead of counting to one', () => {
    expect(block({ endDate: null }).text).toBe(
      'No tiene fecha de fin: sigue hasta que tú o la administración lo terminen.',
    );
  });

  it('says when a contract that has not started does, with its first payment from the account', () => {
    const view = block({ startDate: '2026-11-01' }, [month('2026-11', 'UNPAID')]);

    expect(view.state.label).toBe('Vigente');
    expect(view.text).toBe(
      'Empieza el 1 de noviembre, en 3 días. Tu primer pago vence el 5 de noviembre.',
    );
    // Without the account the first payment is not guessed.
    expect(block({ startDate: '2026-11-01' }).text).toBe('Empieza el 1 de noviembre, en 3 días.');
  });

  it('tells an expired contract and a terminated one apart, and keeps the account readable', () => {
    const expired = block({ status: 'EXPIRED', endDate: '2026-09-30' });
    const terminated = block({ status: 'TERMINATED', terminatedAt: '2026-10-15T15:00:00Z' });

    expect(expired.state).toEqual({ tone: 'unpaid', label: 'Vencido' });
    expect(expired.text).toBe('Terminó el 30 de septiembre.');
    expect(terminated.state).toEqual({ tone: 'unpaid', label: 'Finalizado' });
    expect(terminated.text).toBe('La administración lo finalizó el 15 de octubre.');
    for (const view of [expired, terminated]) {
      expect(view.notice).toEqual({
        tone: 'info',
        heading: 'Puedes seguir entrando.',
        text: 'Tu cuenta queda en solo lectura para que veas tus pagos y este contrato.',
        accountLink: false,
      });
    }
  });

  it('warns about what is still owed on an ended contract, and links to the account', () => {
    const view = block({ status: 'TERMINATED', terminatedAt: '2026-10-15T15:00:00Z' }, [
      month('2026-08', 'PAID'),
      month('2026-09', 'OVERDUE'),
      month('2026-10', 'UNPAID'),
      month('2026-11', 'UNDER_REVIEW'),
    ]);

    expect(view.notice).toEqual({
      tone: 'error',
      heading: 'Quedó por pagar septiembre y octubre: S/ 1,600.00.',
      text: 'Coordina el pago con la administración.',
      accountLink: true,
    });
    const one = block({ status: 'EXPIRED', endDate: '2026-09-30' }, [month('2026-09', 'UNPAID')]);
    expect(one.notice?.heading).toBe('Quedó por pagar septiembre: S/ 800.00.');
  });

  it('does not count what the guest owes on another contract', () => {
    const other = { ...month('2026-09', 'UNPAID'), contractId: 'c0' };

    expect(block({ status: 'EXPIRED', endDate: '2026-09-30' }, [other]).notice?.tone).toBe('info');
  });

  it('announces a renewal already loaded', () => {
    const next = contractOf({ id: 'c2', startDate: '2027-03-01', endDate: '2028-02-29' });
    const view = currentBlock(
      contractOf({ expiringSoon: true, endDate: '2026-11-28' }),
      next,
      context(),
    );

    expect(view.notice).toEqual({
      tone: 'success',
      heading: 'Tu renovación ya está cargada.',
      text: 'Empieza el 1 de marzo de 2027; la ves abajo, en Tu próximo contrato.',
      accountLink: false,
    });
  });
});

describe('H2 the facts and the file', () => {
  it('lists what was agreed, with the day after which a payment is late', () => {
    expect(block().facts).toEqual([
      { label: 'Ambiente', value: 'Habitación 201', hint: '' },
      { label: 'Cuota mensual', value: 'S/ 800.00', hint: '' },
      { label: 'Día de pago', value: '5 de cada mes', hint: 'Sin atraso hasta el 8.' },
      { label: 'Días de gracia', value: '3 días', hint: '' },
      { label: 'Desde', value: '1 mar 2026', hint: '' },
      { label: 'Hasta', value: '28 feb 2027', hint: '' },
    ]);
  });

  it('words no grace, one day of grace and no end date', () => {
    const none = block({ graceDays: 0, endDate: null }).facts;

    expect(none[2]?.hint).toBe('Desde el 6 cuenta como atrasado.');
    expect(none[3]?.value).toBe('Ninguno');
    expect(none[5]?.value).toBe('Sin fecha de fin');
    expect(block({ graceDays: 1 }).facts[3]?.value).toBe('1 día');
  });

  it('does not name a date that a short month could not have', () => {
    expect(block({ paymentDay: 30, graceDays: 3 }).facts[2]?.hint).toBe(
      'Tienes 3 días de gracia desde el día de pago.',
    );
    expect(block({ paymentDay: 30, graceDays: 0 }).facts[2]?.hint).toBe(
      'Cuenta como atrasado desde el día siguiente al de pago.',
    );
  });

  it('describes the file as a PDF, with its size and the day it was loaded', () => {
    expect(block().file).toEqual({
      name: 'contrato-201.pdf',
      meta: 'PDF · 860 KB · cargado el 1 de marzo',
      url: 'https://files.example/c1',
    });
    expect(block({ fileUrl: null }).file.url).toBeNull();
  });

  it('shows the next contract with its own dates and what the fee was before', () => {
    const current = contractOf();
    const next = contractOf({
      id: 'c2',
      monthlyAmount: 850,
      startDate: '2026-11-29',
      endDate: '2027-11-30',
    });

    const view = nextBlock(next, current, context());

    expect(view.state).toEqual({ tone: 'paid', label: 'Vigente' });
    expect(view.text).toBe('Empieza el 29 de noviembre de 2026.');
    expect(view.facts[1]).toEqual({
      label: 'Cuota mensual',
      value: 'S/ 850.00',
      hint: 'Antes S/ 800.00.',
    });
    expect(nextBlock(contractOf({ id: 'c2' }), current, context()).facts[1]?.hint).toBe('');
  });
});

describe('H2 the signed link', () => {
  it('goes stale a minute before the 15 it lasts', () => {
    expect(isLinkStale(0, 13 * 60_000)).toBe(false);
    expect(isLinkStale(0, 14 * 60_000)).toBe(true);
  });
});
