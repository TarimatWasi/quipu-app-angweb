import type { GuestDetail } from '@core/api/clients/admin-guests.service';
import {
  contractFacts,
  contractStatusBadge,
  contractTitle,
  dataFacts,
  dataNote,
  emergencyText,
  joinWords,
  onboardingSteps,
} from './detail-side';
import type { Contract } from './detail-side';
import { documentsHint, moreActions } from './more-actions';

function guestOf(fields: Record<string, unknown> = {}): GuestDetail {
  return {
    id: 'g1',
    documentType: 'DNI',
    documentNumber: '70412233',
    name: 'Luis Huamán',
    type: 'CONTRACT',
    hasLoginAccess: true,
    phone: '987 654 321',
    email: 'luis@example.com',
    documentCount: 2,
    paymentHistory: [],
    status: 'ACTIVE',
    onboardingProgress: 'COMPLETED',
    ...fields,
  };
}

function contractOf(fields: Partial<Contract> = {}): Contract {
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
    status: 'ACTIVE',
    expiringSoon: false,
    terminatedAt: null,
    file: { name: 'contrato.pdf', sizeBytes: 1, uploadedAt: '2026-07-01T10:00:00Z' },
    fileUrl: null,
    ...fields,
  };
}

const plain = (facts: readonly { label: string; value: string }[]) =>
  facts.map(({ label, value }) => [label, value]);

describe('A3.2 «Sus datos», «Contrato» and «Su registro»', () => {
  it('lists the data of an active guest, the emergency contact included', () => {
    const facts = dataFacts(
      guestOf({
        emergencyContact: { name: 'Rosa Ccori', relationship: 'madre', phone: '984 112 233' },
      }),
    );

    expect(plain(facts.before)).toEqual([['Documento', 'DNI 70412233']]);
    expect(plain(facts.after)).toEqual([
      ['Tipo', 'Con contrato'],
      ['Teléfono', '987 654 321'],
      ['Correo', 'luis@example.com'],
      ['Contacto de emergencia', 'Rosa Ccori (madre) · 984 112 233'],
    ]);
    expect(facts.after.map((fact) => fact.wide)).toEqual([false, false, true, true]);
    // Every value of 8 or more characters goes one step smaller (TAR-331).
    expect(facts.after.map((fact) => fact.long)).toEqual([true, true, true, true]);
  });

  it('says what is missing, and leaves out the emergency contact before the onboarding ends', () => {
    const pending = dataFacts(
      guestOf({
        status: 'PENDING_ACTIVATION',
        onboardingProgress: 'NOT_STARTED',
        name: null,
        phone: null,
        email: null,
      }),
    );
    expect(plain(pending.after)).toEqual([
      ['Tipo', 'Con contrato'],
      ['Teléfono', 'Sin teléfono'],
      ['Correo', 'Sin correo'],
    ]);
    const inactive = dataFacts(guestOf({ status: 'INACTIVE', emergencyContact: {} }));
    expect(inactive.after.at(-1)).toEqual({
      label: 'Contacto de emergencia',
      value: 'Sin registrar',
      wide: true,
      long: true,
    });
    expect(emergencyText({ name: 'Ana', phone: ' ' })).toBe('Ana');
    expect(emergencyText({ relationship: 'tía', phone: '999' })).toBe('999');
    expect(emergencyText(undefined)).toBeNull();
  });

  it('notes who changes the data', () => {
    expect(dataNote(guestOf({ status: 'PENDING_ACTIVATION' }))).toBe(
      'Su nombre y sus datos los completa el huésped al activar su acceso.',
    );
    expect(dataNote(guestOf())).toBe(
      'Sus datos de contacto los cambia el huésped desde Mis datos; el correo también puedes cambiarlo tú.',
    );
  });

  it('words the contract in force and the last one', () => {
    expect(contractTitle(contractOf())).toBe('Contrato');
    const facts = contractFacts(contractOf());
    expect(plain(facts.before)).toEqual([['Ambiente', 'Habitación 201']]);
    expect(plain(facts.after)).toEqual([
      ['Cuota', 'S/ 800.00'],
      ['Día de pago', '5 de cada mes'],
      ['Vigencia', '1 jul 2026 – 30 jun 2027'],
    ]);
    expect(contractStatusBadge(contractOf())).toEqual({ label: 'Activo', tone: 'paid' });
    const ended = contractOf({
      status: 'TERMINATED',
      terminatedAt: '2026-10-15',
      environmentType: 'CABIN',
      environmentCode: 'C3',
    });
    expect(contractTitle(ended)).toBe('Último contrato');
    expect(plain(contractFacts(ended).before)).toEqual([['Ambiente', 'Cabaña C3']]);
    expect(contractFacts(ended).after.at(-1)?.value).toBe('1 jul 2026 – 15 oct 2026');
    expect(contractStatusBadge(ended)).toEqual({ label: 'Finalizado', tone: 'unpaid' });
    expect(contractFacts(contractOf({ endDate: null })).after.at(-1)?.value).toBe(
      'Desde 1 jul 2026',
    );
  });

  it('marks the steps of the registration taken so far', () => {
    expect(onboardingSteps('PERSONAL_DATA_SAVED')).toEqual([
      { label: 'Contraseña', inSentence: 'contraseña', optional: false, done: true },
      { label: 'Datos personales', inSentence: 'datos personales', optional: false, done: true },
      { label: 'Documentos', inSentence: 'documentos (opcional)', optional: true, done: false },
      { label: 'Consentimiento', inSentence: 'consentimiento', optional: false, done: false },
    ]);
    expect(onboardingSteps('NOT_STARTED').every((step) => !step.done)).toBe(true);
    expect(onboardingSteps('COMPLETED').every((step) => step.done)).toBe(true);
    expect(joinWords(['a', 'b', 'c'])).toBe('a, b y c');
    expect(joinWords(['a'])).toBe('a');
  });
});

describe('A3.2 «Más acciones»', () => {
  const labels = (actions: ReturnType<typeof moreActions>) =>
    actions.map((action) => [action.kind, action.label, action.hint]);

  it('offers an active guest a new access, the account email, its documents and deactivating', () => {
    expect(labels(moreActions({ guest: guestOf(), panelGenerates: false, owes: false }))).toEqual([
      ['generate-access', 'Generar otro acceso', 'si olvidó su contraseña'],
      ['account-email', 'Cambiar correo', 'al que llega la recuperación de contraseña'],
      ['link', 'Ver documentos', '2 documentos'],
      ['deactivate', 'Desactivar huésped', null],
    ]);
  });

  it('leaves out the access the panel offers and corrects the document while pending', () => {
    const guest = guestOf({ status: 'PENDING_ACTIVATION', documentCount: 0 });
    const actions = moreActions({ guest, panelGenerates: true, owes: false });

    expect(labels(actions)).toEqual([
      ['account-email', 'Cambiar correo', 'al que llega la recuperación de contraseña'],
      ['link', 'Ver documentos', 'no subió documentos'],
      ['link', 'Corregir documento', 'solo hasta que active su acceso'],
      ['deactivate', 'Desactivar huésped', null],
    ]);
    expect(actions[1]).toEqual(
      expect.objectContaining({ link: ['/admin/guests', 'g1', 'documents'] }),
    );
    expect(actions[2]).toEqual(
      expect.objectContaining({ link: ['/admin/guests', 'g1', 'document'] }),
    );
  });

  it('offers an inactive guest only its documents and reactivating, after its debt', () => {
    const guest = guestOf({ status: 'INACTIVE', documentCount: 1 });

    expect(labels(moreActions({ guest, panelGenerates: false, owes: true }))).toEqual([
      ['link', 'Ver documentos', '1 documento'],
      ['reactivate', 'Reactivar huésped', 'después de saldar su deuda'],
    ]);
    expect(moreActions({ guest, panelGenerates: false, owes: false }).at(-1)?.hint).toBeNull();
    expect(documentsHint(5)).toBe('5 documentos');
  });
});
