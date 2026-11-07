import { contactEmailError, EMAIL_TEXT, PHONE_TEXT, phoneError } from '@shared/forms/contact-rules';
import {
  ACCOUNT_EMAIL_TAKEN_TEXT,
  callFailure,
  createProblem,
  DOCUMENT_INVALID_TEXT,
  DOCUMENT_TAKEN_TEXT,
  EMPTY_NEW_GUEST,
  GUEST_EMAIL_TAKEN_TEXT,
  inactiveGuestId,
  NETWORK_TEXT,
  newGuestFacts,
  noticeChannels,
  pendingDebt,
  RATE_LIMITED_TEXT,
  reactivateProblem,
  REACTIVATE_CONFLICT_TEXT,
  REACTIVATE_FAILED_TEXT,
  REACTIVATE_NOT_FOUND_TEXT,
  toGuestInput,
  UNEXPECTED_TEXT,
} from './new-guest';

const failureOf = (status: number, body: unknown) =>
  callFailure({ status, error: body, message: 'ignored' });

describe('A3.1 model', () => {
  it('accepts an empty phone or one shaped as GuestInput, and nothing else', () => {
    expect(phoneError('')).toBeNull();
    expect(phoneError('   ')).toBeNull();
    expect(phoneError('987 654 321')).toBeNull();
    expect(phoneError('+34 612-345-678')).toBeNull();
    expect(phoneError('12345')).toBe(PHONE_TEXT);
    expect(phoneError('+ 987654321')).toBe(PHONE_TEXT);
    expect(phoneError('987a654321')).toBe(PHONE_TEXT);
    expect(phoneError(`9${'8'.repeat(30)}`)).toBe(PHONE_TEXT);
  });

  it('accepts an empty email or a whole address of up to 200 characters', () => {
    expect(contactEmailError('')).toBeNull();
    expect(contactEmailError('ana@example.com')).toBeNull();
    expect(contactEmailError('ana@example')).toBe(EMAIL_TEXT);
    expect(contactEmailError('ana example.com')).toBe(EMAIL_TEXT);
    expect(contactEmailError(`${'a'.repeat(190)}@example.com`)).toBe(EMAIL_TEXT);
  });

  it('builds the body trimmed and without the optional fields left empty', () => {
    expect(
      toGuestInput({
        ...EMPTY_NEW_GUEST,
        documentNumber: ' 70412233 ',
        phone: ' ',
        contactEmail: '',
      }),
    ).toStrictEqual({
      documentType: 'DNI',
      documentNumber: '70412233',
      type: 'CONTRACT',
      accessMode: 'LINK',
    });
    expect(
      toGuestInput({
        type: 'TEMPORARY',
        documentType: 'PASSPORT',
        documentNumber: 'PX-1',
        phone: ' +34 612 ',
        contactEmail: ' ana@example.com ',
        accessMode: 'TEMPORARY_PASSWORD',
      }),
    ).toStrictEqual({
      documentType: 'PASSPORT',
      documentNumber: 'PX-1',
      type: 'TEMPORARY',
      phone: '+34 612',
      contactEmail: 'ana@example.com',
      accessMode: 'TEMPORARY_PASSWORD',
    });
  });

  it('says how the guest will hear of its access', () => {
    expect(noticeChannels('987', 'a@b.co')).toBe('WhatsApp y correo');
    expect(noticeChannels('987', '')).toBe('WhatsApp');
    expect(noticeChannels('', 'a@b.co')).toBe('Correo');
    expect(noticeChannels(' ', ' ')).toBe('El mensaje que copies');
  });

  it('summarises what will be created, following what is typed', () => {
    expect(newGuestFacts(EMPTY_NEW_GUEST)).toEqual([
      { label: 'Documento', value: 'Falta el número', wide: true },
      { label: 'Tipo', value: 'Con contrato', wide: false },
      { label: 'Acceso', value: 'Link', wide: false },
      { label: 'Se le avisa por', value: 'El mensaje que copies', wide: true },
    ]);
    const facts = newGuestFacts({
      ...EMPTY_NEW_GUEST,
      type: 'TEMPORARY',
      documentType: 'CE',
      documentNumber: '001234',
      accessMode: 'TEMPORARY_PASSWORD',
      phone: '987654321',
    });
    expect(facts.map((fact) => fact.value)).toEqual([
      'CE 001234',
      'Temporal',
      'Clave temporal',
      'WhatsApp',
    ]);
  });

  it('places each failure of createGuest by its code and field, never by its text', () => {
    const field = (fieldName: string, message: string) => ({
      place: 'field',
      field: fieldName,
      message,
    });
    expect(createProblem(failureOf(409, { code: 'GUEST_DOCUMENT_TAKEN', message: 'x' }))).toEqual(
      field('documentNumber', DOCUMENT_TAKEN_TEXT),
    );
    expect(createProblem(failureOf(409, { code: 'ACCOUNT_DOCUMENT_TAKEN' }))).toEqual(
      field('documentNumber', DOCUMENT_TAKEN_TEXT),
    );
    expect(createProblem(failureOf(409, { code: 'GUEST_EMAIL_TAKEN' }))).toEqual(
      field('contactEmail', GUEST_EMAIL_TAKEN_TEXT),
    );
    expect(createProblem(failureOf(409, { code: 'ACCOUNT_EMAIL_TAKEN' }))).toEqual(
      field('contactEmail', ACCOUNT_EMAIL_TAKEN_TEXT),
    );
    expect(
      createProblem(failureOf(400, { code: 'VALIDATION_ERROR', field: 'documentNumber' })),
    ).toEqual(field('documentNumber', DOCUMENT_INVALID_TEXT));
    expect(createProblem(failureOf(400, { code: 'VALIDATION_ERROR', field: 'phone' }))).toEqual(
      field('phone', PHONE_TEXT),
    );
    expect(
      createProblem(failureOf(400, { code: 'VALIDATION_ERROR', field: 'contactEmail' })),
    ).toEqual(field('contactEmail', EMAIL_TEXT));
    expect(createProblem(failureOf(400, { code: 'VALIDATION_ERROR', field: 'type' }))).toEqual({
      place: 'general',
      message: UNEXPECTED_TEXT,
    });
    expect(createProblem(failureOf(429, { code: 'RATE_LIMITED', message: 'otro' }))).toEqual({
      place: 'general',
      message: RATE_LIMITED_TEXT,
    });
    expect(createProblem(failureOf(0, null))).toEqual({ place: 'general', message: NETWORK_TEXT });
    expect(createProblem(callFailure(new Error('boom')))).toEqual({
      place: 'general',
      message: UNEXPECTED_TEXT,
    });
  });

  it('reads the id of an inactive guest only from a 409 GUEST_INACTIVE', () => {
    expect(inactiveGuestId(failureOf(409, { code: 'GUEST_INACTIVE', guestId: 'g9' }))).toBe('g9');
    expect(inactiveGuestId(failureOf(409, { code: 'GUEST_INACTIVE' }))).toBeNull();
    expect(inactiveGuestId(failureOf(400, { code: 'GUEST_INACTIVE', guestId: 'g9' }))).toBeNull();
    expect(
      inactiveGuestId(failureOf(409, { code: 'GUEST_EMAIL_TAKEN', guestId: 'g9' })),
    ).toBeNull();
  });

  it('lists what is owed with its amounts and total, or only the periods', () => {
    const debts = [
      { period: '2026-07', stayId: null, stayStartDate: null, stayEndDate: null, amountDue: 650 },
      {
        period: null,
        stayId: 's1',
        stayStartDate: '2026-08-20',
        stayEndDate: '2026-08-31',
        amountDue: 0.1,
      },
    ];
    expect(
      pendingDebt(failureOf(409, { code: 'GUEST_HAS_PENDING_DEBT', periods: [], debts })),
    ).toEqual({
      lines: [
        { label: 'Julio 2026', amount: 'S/ 650.00' },
        { label: '20 – 31 ago', amount: 'S/ 0.10' },
      ],
      total: 'S/ 650.10',
    });
    expect(
      pendingDebt(failureOf(409, { code: 'GUEST_HAS_PENDING_DEBT', periods: ['2026-07', 3] })),
    ).toEqual({ lines: [{ label: 'Julio 2026', amount: null }], total: null });
    expect(pendingDebt(failureOf(409, { code: 'CONCURRENT_MODIFICATION' }))).toBeNull();
  });

  it('says inside the dialog why a reactivation failed', () => {
    expect(reactivateProblem(failureOf(0, null))).toBe(NETWORK_TEXT);
    expect(reactivateProblem(failureOf(429, { code: 'RATE_LIMITED' }))).toBe(RATE_LIMITED_TEXT);
    expect(reactivateProblem(failureOf(404, { code: 'RESOURCE_NOT_FOUND' }))).toBe(
      REACTIVATE_NOT_FOUND_TEXT,
    );
    expect(reactivateProblem(failureOf(409, { code: 'CONCURRENT_MODIFICATION' }))).toBe(
      REACTIVATE_CONFLICT_TEXT,
    );
    expect(reactivateProblem(failureOf(500, {}))).toBe(REACTIVATE_FAILED_TEXT);
  });
});
