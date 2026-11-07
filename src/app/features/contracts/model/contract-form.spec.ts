import {
  conflictOf,
  dayProblem,
  draftFacts,
  EMPTY_FIELDS,
  endProblem,
  environmentOptions,
  exactMonths,
  feeProblem,
  fileProblem,
  graceProblem,
  graceText,
  guestOptions,
  guestProblem,
  MAX_FILE_BYTES,
  sideNote,
  startProblem,
  toNewContract,
} from './contract-form';
import type { ContractDraft, Environment, GuestSummary } from './contract-form';

const pdf = (name = 'contrato.pdf', type = 'application/pdf') => new File(['pdf'], name, { type });

const READY: ContractDraft = {
  guestId: 'g1',
  environmentId: 'e1',
  fee: '650',
  day: '5',
  grace: '3',
  start: '2026-11-01',
  end: '2027-10-31',
  file: pdf(),
};

describe('the form of A4.1 «Cargar contrato»', () => {
  it('says what is wrong with each field, or nothing when it is right', () => {
    expect(guestProblem('')).toBe('Elige al huésped.');
    expect(guestProblem('g1')).toBeNull();
    expect(feeProblem('')).toBe('Escribe la cuota mensual.');
    expect(feeProblem('0')).toContain('mayor que 0');
    expect(feeProblem('650.555')).toContain('mayor que 0');
    expect(feeProblem('650,50')).toBeNull();
    expect(dayProblem('')).toBe('Escribe el día de pago.');
    expect(dayProblem('35')).toBe('El día de pago va del 1 al 31.');
    expect(dayProblem('0')).toBe('El día de pago va del 1 al 31.');
    expect(dayProblem('31')).toBeNull();
    expect(graceProblem('')).toContain('0');
    expect(graceProblem('32')).toBe('Los días de gracia van de 0 a 31.');
    expect(graceProblem('0')).toBeNull();
    expect(startProblem('')).toBe('Elige la fecha de inicio.');
    expect(startProblem('2026-11-01')).toBeNull();
  });

  it('wants the end after the start, and none is fine', () => {
    expect(endProblem('2026-11-01', '2026-10-31')).toBe(
      'La fecha de fin debe ser posterior a la de inicio.',
    );
    expect(endProblem('2026-11-01', '2026-11-01')).not.toBeNull();
    expect(endProblem('2026-11-01', '2026-11-02')).toBeNull();
    expect(endProblem('2026-11-01', '')).toBeNull();
    expect(endProblem('', '2026-10-31')).toBeNull();
  });

  it('wants a PDF of 10 MB at most', () => {
    expect(fileProblem(null)).toBe('Elige el PDF del contrato.');
    expect(fileProblem(pdf())).toBeNull();
    expect(fileProblem(pdf('contrato.PDF', ''))).toBeNull();
    expect(fileProblem(pdf('foto.jpg', 'image/jpeg'))).toBe(
      'El archivo debe ser un PDF de 10 MB como máximo.',
    );
    const heavy = pdf();
    Object.defineProperty(heavy, 'size', { value: MAX_FILE_BYTES + 1 });
    expect(fileProblem(heavy)).toContain('10 MB');
  });

  it('turns a valid draft into what the BFF takes, with no end date as null', () => {
    expect(toNewContract(READY)).toEqual({
      file: READY.file,
      environmentId: 'e1',
      guestId: 'g1',
      monthlyAmount: 650,
      paymentDay: 5,
      graceDays: 3,
      startDate: '2026-11-01',
      endDate: '2027-10-31',
    });
    expect(toNewContract({ ...READY, end: '' })?.endDate).toBeNull();
    expect(toNewContract({ ...READY, fee: '650,50' })?.monthlyAmount).toBe(650.5);
  });

  it('sends nothing while something is wrong or missing', () => {
    for (const wrong of [
      { file: null },
      { guestId: '' },
      { environmentId: '' },
      { fee: '0' },
      { day: '40' },
      { grace: '' },
      { start: '' },
      { end: '2026-10-31' },
    ]) {
      expect(toNewContract({ ...READY, ...wrong })).toBeNull();
    }
  });

  it('offers the guests and the environments free today, with since when', () => {
    const guest = (fields: Partial<GuestSummary>) =>
      ({
        id: 'g1',
        documentType: 'DNI',
        documentNumber: '72310458',
        name: 'Julia Mendoza',
        type: 'CONTRACT',
        status: 'ACTIVE',
        ...fields,
      }) as GuestSummary;
    expect(guestOptions([guest({}), guest({ id: 'g2', name: null, documentNumber: '1' })])).toEqual(
      [
        { value: 'g1', label: 'Julia Mendoza · DNI 72310458' },
        { value: 'g2', label: 'Huésped sin nombre · DNI 1' },
      ],
    );
    const environment = (fields: Partial<Environment>): Environment => ({
      id: 'e1',
      code: '109',
      type: 'ROOM',
      status: 'ACTIVE',
      occupant: null,
      nextOccupant: null,
      freeSince: '2026-10-15',
      deactivatedAt: null,
      version: 1,
      ...fields,
    });
    expect(
      environmentOptions([
        environment({}),
        environment({ id: 'e2', code: 'C4', type: 'CABIN', freeSince: null }),
        environment({
          id: 'e3',
          code: '201',
          freeSince: null,
          occupant: { kind: 'CONTRACT' } as never,
        }),
        environment({ id: 'e4', code: '204', status: 'INACTIVE' }),
      ]),
    ).toEqual([
      { value: 'e1', label: 'Habitación 109 · libre desde el 15 oct 2026' },
      { value: 'e2', label: 'Cabaña C4 · libre' },
    ]);
  });

  it('counts whole months only when the end is the eve of the same day', () => {
    expect(exactMonths('2026-11-01', '2027-10-31')).toBe(12);
    expect(exactMonths('2026-11-01', '2026-11-30')).toBe(1);
    expect(exactMonths('2026-11-05', '2027-11-04')).toBe(12);
    expect(exactMonths('2026-11-01', '2027-10-15')).toBeNull();
  });

  it('says until when there is no delay', () => {
    expect(graceText(5, 3)).toBe('Sin atraso hasta el 8.');
    expect(graceText(30, 3)).toBe('Sin atraso hasta 3 días después.');
    expect(graceText(5, 0)).toBe('Sin días de gracia: desde el 6 cuenta como atrasado.');
  });

  it('tells what is still missing in the facts and what is ready', () => {
    const empty = draftFacts({ ...EMPTY_FIELDS, file: null }, null, null);
    expect(empty.map((fact) => fact.value)).toEqual([
      'Falta elegirlo',
      'Falta elegirlo',
      'Falta la cuota',
      'Falta el día',
      'Falta la fecha de inicio',
    ]);
    const facts = draftFacts(READY, 'Julia Mendoza', 'Habitación 109');
    expect(facts).toEqual([
      { label: 'Huésped', value: 'Julia Mendoza', wide: true },
      { label: 'Ambiente', value: 'Habitación 109', wide: false },
      { label: 'Cuota mensual', value: 'S/ 650.00', wide: false },
      { label: 'Día de pago', value: '5 de cada mes', wide: true, hint: 'Sin atraso hasta el 8.' },
      {
        label: 'Vigencia',
        value: '1 nov 2026 – 31 oct 2027',
        wide: true,
        hint: '12 meses',
      },
    ]);
  });

  it('says «Revisa…» for what was typed wrong and the way a contract without an end reads', () => {
    const facts = draftFacts(
      { ...READY, fee: '0', day: '99', start: '2026-11-01', end: '2026-10-01' },
      null,
      null,
    );
    expect(facts.map((fact) => fact.value).slice(2)).toEqual([
      'Revisa la cuota',
      'Revisa el día',
      'Revisa las fechas',
    ]);
    const open = draftFacts({ ...READY, end: '' }, null, null).at(-1);
    expect(open).toEqual(
      expect.objectContaining({
        value: '1 nov 2026 – sin fecha de fin',
        hint: 'Sigue hasta que lo finalices.',
      }),
    );
    expect(draftFacts({ ...READY, end: '2027-10-15' }, null, null).at(-1)?.hint).toBeUndefined();
  });

  it('says what loading does, with the names when it knows them', () => {
    expect(sideNote(null, null)).toBe(
      'Al cargarlo, el ambiente queda ocupado y el huésped verá su contrato y sus cobros en Quipu.',
    );
    expect(sideNote('Julia Mendoza', 'Habitación 109')).toBe(
      'Al cargarlo, la habitación 109 queda ocupada y Julia Mendoza verá su contrato y sus cobros en Quipu.',
    );
  });

  it('turns each 409 into a notice with what to do next, and leaves any other alone', () => {
    const names = { guest: 'Julia Mendoza', environment: 'Habitación 109' };
    expect(conflictOf('ENVIRONMENT_OCCUPIED', names, 'x')).toEqual(
      expect.objectContaining({
        title: 'Habitación 109 ya tiene un contrato vigente',
        buttonLabel: 'Elegir otro ambiente',
        then: 'environment',
      }),
    );
    expect(conflictOf('ENVIRONMENT_INACTIVE', names, 'x')?.then).toBe('environment');
    expect(conflictOf('GUEST_NOT_ACTIVE', names, 'x')?.title).toBe('Julia Mendoza no está activo');
    expect(conflictOf('GUEST_NOT_CONTRACT', names, 'x')?.then).toBe('guest');
    expect(conflictOf('GUEST_HAS_PENDING_DEBT', names, 'Tiene deuda')?.message).toBe('Tiene deuda');
    expect(conflictOf('GUEST_NOT_ACTIVE', { guest: null, environment: null }, 'x')?.title).toBe(
      'El huésped no está activo',
    );
    expect(conflictOf('VALIDATION_ERROR', names, 'x')).toBeNull();
  });
});
