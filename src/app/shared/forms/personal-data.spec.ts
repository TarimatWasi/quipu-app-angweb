import { Injector, runInInjectionContext, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import {
  EMPTY_PERSONAL_DATA,
  personalDataRules,
  toEmergencyContact,
  toPersonalData,
} from './personal-data';
import type { PersonalData } from './personal-data';

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

  it('checks the phone, the email and the emergency phone when they are filled in', () => {
    expect(errorsOf({ phone: '12', contactEmail: 'no-es-correo', emergencyPhone: '12' })).toEqual({
      phone: 'Revisa el teléfono.',
      contactEmail: 'Escribe un correo válido.',
      emergencyPhone: 'Revisa el teléfono.',
    });
    expect(errorsOf({ contactEmail: 'ana@correo.pe', emergencyPhone: '+51 951 234 567' })).toEqual(
      {},
    );
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
    expect(
      toPersonalData({ name: 'Ana', phone: null, contactEmail: null, emergencyContact: null }),
    ).toEqual({ ...EMPTY_PERSONAL_DATA, name: 'Ana' });
    expect(
      toPersonalData({
        name: 'Ana',
        phone: '987 654 321',
        contactEmail: 'ana@correo.pe',
        emergencyContact: { name: 'Rosa', relationship: 'Madre', phone: '+51 951 234 567' },
      }),
    ).toEqual({
      name: 'Ana',
      phone: '987 654 321',
      contactEmail: 'ana@correo.pe',
      emergencyName: 'Rosa',
      emergencyRelationship: 'Madre',
      emergencyPhone: '+51 951 234 567',
    });
  });
});
