import { maxLength, required, SchemaPathTree, validate } from '@angular/forms/signals';
import {
  contactEmailError,
  EMAIL_TEXT,
  MAX_EMAIL_LENGTH,
  MAX_PHONE_LENGTH,
  PHONE_TEXT,
  phoneError,
} from './contact-rules';

/** The emergency contact as the contract has it (EmergencyContact): every field is optional. */
export interface EmergencyContact {
  name?: string;
  relationship?: string;
  phone?: string;
}

/**
 * The personal and contact data a guest keeps (RN-17, RN-29): «Mis datos» of the guest with a
 * contract and of the temporary guest (H5, T3) and the personal data step of the onboarding (O1)
 * share the fields, the help, the checks and the body sent to the BFF.
 */
export interface PersonalData {
  name: string;
  phone: string;
  contactEmail: string;
  emergencyName: string;
  emergencyRelationship: string;
  emergencyPhone: string;
}

export const EMPTY_PERSONAL_DATA: Readonly<PersonalData> = {
  name: '',
  phone: '',
  contactEmail: '',
  emergencyName: '',
  emergencyRelationship: '',
  emergencyPhone: '',
};

export const NAME_TEXT = 'Escribe tu nombre completo.';
export const NAME_HELP = 'Como aparece en tu documento.';
export const PHONE_HELP = 'Si es de otro país, empieza con su prefijo, por ejemplo +34.';
export const EMAIL_HELP = 'Para que la administración pueda escribirte.';
export const EMERGENCY_NAME_HELP = 'A quién llamamos si te pasa algo.';
export const RELATIONSHIPS: readonly string[] = [
  'Madre',
  'Padre',
  'Pareja',
  'Hermano o hermana',
  'Amigo o amiga',
];

// The limits of the columns (EmergencyContact, PersonalDataInput).
export const MAX_NAME_LENGTH = 200;
export const MAX_RELATIONSHIP_LENGTH = 50;
const NAME_LONG_TEXT = `El nombre admite hasta ${String(MAX_NAME_LENGTH)} caracteres.`;
const RELATIONSHIP_LONG_TEXT = `El parentesco admite hasta ${String(MAX_RELATIONSHIP_LENGTH)} caracteres.`;

/** The fields the BFF names in a VALIDATION_ERROR, mapped to the ones of the form. */
export const PERSONAL_DATA_FIELDS: Readonly<Record<string, keyof PersonalData>> = {
  name: 'name',
  phone: 'phone',
  contactEmail: 'contactEmail',
  'emergencyContact.name': 'emergencyName',
  'emergencyContact.relationship': 'emergencyRelationship',
  'emergencyContact.phone': 'emergencyPhone',
};

/** The checks before calling the BFF (FE-ANG-FRM-03): name and phone are required, the rest is not. */
export function personalDataRules(path: SchemaPathTree<PersonalData>): void {
  required(path.name, { message: NAME_TEXT });
  maxLength(path.name, MAX_NAME_LENGTH, { message: NAME_LONG_TEXT });
  // The phone is required, so an empty one is as wrong as a malformed one.
  validate(path.phone, ({ value }) =>
    value().trim() === '' || phoneError(value()) !== null
      ? { kind: 'phone', message: PHONE_TEXT }
      : undefined,
  );
  maxLength(path.phone, MAX_PHONE_LENGTH, { message: PHONE_TEXT });
  maxLength(path.contactEmail, MAX_EMAIL_LENGTH, { message: EMAIL_TEXT });
  validate(path.contactEmail, ({ value }) => {
    const message = contactEmailError(value());
    return message === null ? undefined : { kind: 'contactEmail', message };
  });
  maxLength(path.emergencyName, MAX_NAME_LENGTH, { message: NAME_LONG_TEXT });
  maxLength(path.emergencyRelationship, MAX_RELATIONSHIP_LENGTH, {
    message: RELATIONSHIP_LONG_TEXT,
  });
  maxLength(path.emergencyPhone, MAX_PHONE_LENGTH, { message: PHONE_TEXT });
  validate(path.emergencyPhone, ({ value }) => {
    const message = phoneError(value());
    return message === null ? undefined : { kind: 'phone', message };
  });
}

/** The emergency contact of the form as the BFF takes it: only what was filled in; null if nothing. */
export function toEmergencyContact(data: PersonalData): EmergencyContact | null {
  const name = data.emergencyName.trim();
  const relationship = data.emergencyRelationship.trim();
  const phone = data.emergencyPhone.trim();
  if (name === '' && relationship === '' && phone === '') return null;
  return {
    ...(name !== '' && { name }),
    ...(relationship !== '' && { relationship }),
    ...(phone !== '' && { phone }),
  };
}

/** The form filled from what the BFF has saved; what it does not have stays empty. */
export function toPersonalData(saved: {
  name: string;
  phone: string | null;
  contactEmail: string | null;
  emergencyContact: EmergencyContact | null;
}): PersonalData {
  return {
    name: saved.name,
    phone: saved.phone ?? '',
    contactEmail: saved.contactEmail ?? '',
    emergencyName: saved.emergencyContact?.name ?? '',
    emergencyRelationship: saved.emergencyContact?.relationship ?? '',
    emergencyPhone: saved.emergencyContact?.phone ?? '',
  };
}
