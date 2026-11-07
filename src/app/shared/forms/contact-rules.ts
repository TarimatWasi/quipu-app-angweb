// Client checks of a phone and a contact email, the same as the BFF's (FE-ANG-FRM-03): the form of
// a new guest (A3.1) and the guest's own data (H5, T3, O1) share them.

export const PHONE_TEXT = 'Revisa el teléfono.';
export const EMAIL_TEXT = 'Escribe un correo válido.';
export const MAX_PHONE_LENGTH = 30;
export const MAX_EMAIL_LENGTH = 200;
const PHONE_SHAPE = /^\+?[0-9][0-9 -]{5,28}$/;
// The shape the BFF accepts as `format: email`, without spaces and with a dot in the domain.
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** The phone is optional here: empty is fine, anything else follows the pattern of the BFF. */
export function phoneError(phone: string): string | null {
  const value = phone.trim();
  if (value === '') return null;
  return value.length <= MAX_PHONE_LENGTH && PHONE_SHAPE.test(value) ? null : PHONE_TEXT;
}

/** The email is optional too: empty is fine, otherwise a whole address of up to 200 characters. */
export function contactEmailError(email: string): string | null {
  const value = email.trim();
  if (value === '') return null;
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_SHAPE.test(value) ? null : EMAIL_TEXT;
}
