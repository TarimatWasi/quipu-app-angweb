import { minLength, required, SchemaPath, validate } from '@angular/forms/signals';

const MIN_LENGTH = 8;
/** bcrypt, which the backend uses, hashes at most 72 bytes; accented letters take two. */
const MAX_BYTES = 72;
const ENCODER = new TextEncoder();

/** The rules of a new password (SEG-03), the same for the first-login change and the recovery. */
export function newPasswordRules(field: SchemaPath<string>): void {
  required(field, { message: 'Ingresa tu nueva contraseña' });
  minLength(field, MIN_LENGTH, { message: 'Mínimo 8 caracteres' });
  validate(field, ({ value }) =>
    ENCODER.encode(value()).length > MAX_BYTES
      ? { kind: 'tooLong', message: 'La contraseña es demasiado larga' }
      : undefined,
  );
}
