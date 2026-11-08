import type { components } from '@core/api/bff.generated';
import { EMPTY_PERSONAL_DATA } from '@shared/forms/personal-data';
import type { PersonalData } from '@shared/forms/personal-data';
import {
  clearsSaved,
  contractDeal,
  isDirty,
  openProblem,
  stayDeal,
  toProfileUpdate,
} from './own-profile';

type Contract = components['schemas']['Contract'];

const failure = (status: number, code: string | null = null, field: string | null = null) => ({
  status,
  code,
  field,
  body: {},
});

const SAVED: PersonalData = {
  name: 'Ana Quispe',
  phone: '987 654 321',
  contactEmail: 'ana@correo.pe',
  emergencyName: 'Rosa Mamani',
  emergencyRelationship: 'Madre',
  emergencyPhone: '+51 951 234 567',
};
const edited = (fields: Partial<PersonalData>): PersonalData => ({ ...SAVED, ...fields });

const IDENTITY = {
  documentType: 'DNI',
  documentNumber: '12345678',
  accountEmail: 'ana@correo.pe',
} as const;

const CONTRACT = {
  environmentType: 'ROOM',
  environmentCode: '201',
  monthlyAmount: 800,
  paymentDay: 5,
  startDate: '2026-03-01',
  endDate: '2027-02-28',
} as Contract;

describe('H5 and T3 what the administration keeps, read only', () => {
  it('lists the contract of the guest and offers to see it', () => {
    const deal = contractDeal(IDENTITY, CONTRACT);

    expect(deal.title).toBe('Tu contrato');
    expect(deal.contractLink).toBe(true);
    expect(deal.facts).toEqual([
      { label: 'Ambiente', value: 'Habitación 201', wide: false },
      { label: 'Cuota', value: 'S/ 800.00', wide: false },
      { label: 'Contrato', value: '1 mar 2026 – 28 feb 2027', wide: true },
      { label: 'Día de pago', value: '5 de cada mes', wide: false },
      { label: 'Documento', value: 'DNI 12345678', wide: true },
      expect.objectContaining({ value: 'ana@correo.pe', wide: true }),
    ]);
  });

  it('says a contract without end and shows only the document without a contract', () => {
    const open = contractDeal(IDENTITY, { ...CONTRACT, endDate: null });
    const none = contractDeal(IDENTITY, null);

    expect(open.facts[2]?.value).toBe('1 mar 2026 – sin fecha de fin');
    expect(none.contractLink).toBe(false);
    expect(none.facts.map((fact) => fact.label)).toEqual([
      'Documento',
      'Correo de tu cuenta (para recuperar tu contraseña; lo cambia la administración)',
    ]);
  });

  it('says there is no account email and how to get an access', () => {
    const deal = contractDeal({ ...IDENTITY, accountEmail: null }, null);

    expect(deal.facts.at(-1)?.value).toBe(
      'Sin correo: si olvidas tu contraseña, pídele a la administración un acceso nuevo',
    );
  });

  it('lists the stay of the temporary guest, with the environment only when it is known', () => {
    const stay = { startDate: '2026-10-20', endDate: '2026-10-31', agreedAmount: 380 };

    expect(stayDeal(IDENTITY, stay).facts.slice(0, 2)).toEqual([
      { label: 'Acordado', value: 'S/ 380.00', wide: false },
      { label: 'Estadía', value: '20 – 31 oct', wide: true },
    ]);
    const withEnvironment = stayDeal(IDENTITY, {
      ...stay,
      environment: { type: 'CABIN', code: 'C1' },
    });
    expect(withEnvironment.title).toBe('Tu estadía');
    expect(withEnvironment.contractLink).toBe(false);
    expect(withEnvironment.facts[0]).toEqual({
      label: 'Ambiente',
      value: 'Cabaña C1',
      wide: false,
    });
    expect(stayDeal(IDENTITY, null).facts).toHaveLength(2);
  });
});

describe('H5 and T3 the documents', () => {
  it('says why a document does not open, and reloads the list when it is gone', () => {
    expect(openProblem(failure(404))).toEqual({
      message: 'Ese documento ya no está disponible.',
      reload: true,
    });
    expect(openProblem(failure(503)).reload).toBe(false);
    expect(openProblem(failure(503)).message).toContain('No se pudo acceder al archivo');
    expect(openProblem(failure(0)).message).toContain('No se pudo conectar');
    expect(openProblem(failure(500)).message).toBe(
      'No se pudo abrir el documento. Inténtalo de nuevo.',
    );
  });
});

describe('H5 and T3 saving the data', () => {
  it('is not dirty until something differs, ignoring spaces at the ends', () => {
    expect(isDirty(SAVED, SAVED)).toBe(false);
    expect(isDirty(edited({ name: '  Ana Quispe ' }), SAVED)).toBe(false);
    expect(isDirty(edited({ phone: '912 345 678' }), SAVED)).toBe(true);
  });

  it('sends only what changed, trimmed', () => {
    expect(toProfileUpdate(edited({ phone: ' 912 345 678 ' }), SAVED)).toEqual({
      phone: '912 345 678',
    });
    expect(
      toProfileUpdate(edited({ name: 'Ana M. Quispe', contactEmail: 'a@b.pe' }), SAVED),
    ).toEqual({
      name: 'Ana M. Quispe',
      contactEmail: 'a@b.pe',
    });
    expect(toProfileUpdate(SAVED, SAVED)).toBeNull();
  });

  it('sends the whole emergency contact filled in when a piece of it changed', () => {
    expect(toProfileUpdate(edited({ emergencyPhone: '+51 900 000 000' }), SAVED)).toEqual({
      emergencyContact: { name: 'Rosa Mamani', relationship: 'Madre', phone: '+51 900 000 000' },
    });
    const none = { ...EMPTY_PERSONAL_DATA, name: 'Carmen', phone: '+34 612 345 678' };
    expect(toProfileUpdate({ ...none, emergencyName: 'Luis' }, none)).toEqual({
      emergencyContact: { name: 'Luis' },
    });
  });

  it('notices when something saved was emptied, which the BFF cannot do', () => {
    expect(clearsSaved(edited({ contactEmail: '  ' }), SAVED)).toBe(true);
    expect(clearsSaved(edited({ emergencyName: '' }), SAVED)).toBe(true);
    expect(clearsSaved(edited({ phone: '912 345 678' }), SAVED)).toBe(false);
    expect(clearsSaved({ ...SAVED, contactEmail: '' }, { ...SAVED, contactEmail: '' })).toBe(false);
    // Something emptied is not sent: the rest of the change still is.
    expect(toProfileUpdate(edited({ contactEmail: '' }), SAVED)).toBeNull();
  });
});
