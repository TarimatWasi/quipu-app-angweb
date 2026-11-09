import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import {
  EMPTY_PERSONAL_DATA,
  personalDataRules,
  saveProblem,
  toEmergencyContact,
  toPersonalData,
  toPersonalDataInput,
} from './personal-data';
import type { PersonalData } from './personal-data';

const failure = (status: number, code: string | null = null, field: string | null = null) => ({
  status,
  code,
  field,
  body: {},
});

const VALID: PersonalData = {
  ...EMPTY_PERSONAL_DATA,
  name: 'Ana Quispe',
  phone: '987 654 321',
};

/** The messages of every field of a form with these values, as the user would see them. */
function errorsOf(data: Partial<PersonalData>): Partial<Record<keyof PersonalData, string>> {
  const model = signal<PersonalData>({ ...VALID, ...data });
  const fields = runInInjectionContext(TestBed.inject(Injector), () =>
    form(model, (path) => {
      personalDataRules(path);
    }),
  );
  const result: Partial<Record<keyof PersonalData, string>> = {};
  for (const key of Object.keys(model()) as (keyof PersonalData)[]) {
    const message = fields[key]().errors()[0]?.message;
    if (message !== undefined) result[key] = message;
  }
  return result;
}

describe('the personal data of a guest', () => {
  it('asks for a name and a phone, and nothing else', () => {
    expect(errorsOf({})).toEqual({});
    expect(errorsOf({ name: '', phone: '' })).toEqual({
      name: 'Escribe tu nombre completo.',
      phone: 'Revisa el teléfono.',
    });
  });

  it('checks the phone and the emergency phone when they are filled in', () => {
    expect(errorsOf({ phone: '12', emergencyPhone: '12' })).toEqual({
      phone: 'Revisa el teléfono.',
      emergencyPhone: 'Revisa el teléfono.',
    });
    expect(errorsOf({ emergencyPhone: '+51 951 234 567' })).toEqual({});
  });

  it('keeps the texts within the limits of the columns', () => {
    expect(errorsOf({ name: 'a'.repeat(201) }).name).toBe('El nombre admite hasta 200 caracteres.');
    expect(errorsOf({ emergencyName: 'a'.repeat(201) }).emergencyName).toBe(
      'El nombre admite hasta 200 caracteres.',
    );
    expect(errorsOf({ emergencyRelationship: 'a'.repeat(51) }).emergencyRelationship).toBe(
      'El parentesco admite hasta 50 caracteres.',
    );
  });

  it('sends the emergency contact only with what was filled in, and none when nothing was', () => {
    expect(toEmergencyContact(VALID)).toBeNull();
    expect(
      toEmergencyContact({
        ...VALID,
        emergencyName: ' Rosa ',
        emergencyRelationship: ' ',
        emergencyPhone: '+51 951 234 567',
      }),
    ).toEqual({ name: 'Rosa', phone: '+51 951 234 567' });
  });

  it('fills the form from what is saved, empty where the BFF has nothing', () => {
    expect(toPersonalData({ name: 'Ana', phone: null, emergencyContact: null })).toEqual({
      ...EMPTY_PERSONAL_DATA,
      name: 'Ana',
    });
    expect(
      toPersonalData({
        name: 'Ana',
        phone: '987 654 321',
        emergencyContact: { name: 'Rosa', relationship: 'Madre', phone: '+51 951 234 567' },
      }),
    ).toEqual({
      name: 'Ana',
      phone: '987 654 321',
      emergencyName: 'Rosa',
      emergencyRelationship: 'Madre',
      emergencyPhone: '+51 951 234 567',
    });
  });

  it('sends the personal data of the onboarding trimmed and only with what was filled in', () => {
    expect(toPersonalDataInput({ ...VALID, name: ' Ana Quispe ', phone: ' 987 654 321 ' })).toEqual(
      {
        name: 'Ana Quispe',
        phone: '987 654 321',
      },
    );
    expect(
      toPersonalDataInput({
        ...VALID,
        emergencyName: 'Rosa',
        emergencyRelationship: ' ',
      }),
    ).toEqual({
      name: 'Ana Quispe',
      phone: '987 654 321',
      emergencyContact: { name: 'Rosa' },
    });
  });

  it('puts what the BFF refuses of a field under it, and the rest above the buttons', () => {
    expect(saveProblem(failure(400, 'VALIDATION_ERROR', 'phone'))).toEqual({
      place: 'field',
      field: 'phone',
      message: 'Revisa el teléfono.',
    });
    expect(saveProblem(failure(400, 'VALIDATION_ERROR', 'emergencyContact.relationship'))).toEqual({
      place: 'field',
      field: 'emergencyRelationship',
      message: 'Revisa el parentesco.',
    });
    expect(saveProblem(failure(429, 'RATE_LIMITED')).place).toBe('general');
    expect(saveProblem(failure(0)).message).toContain('No se pudo conectar');
    expect(saveProblem(failure(400, 'VALIDATION_ERROR', 'otro')).place).toBe('general');
    expect(saveProblem(failure(500)).message).toBe(
      'No se pudieron guardar tus datos. Inténtalo de nuevo.',
    );
  });
});
