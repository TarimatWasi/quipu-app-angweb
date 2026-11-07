/** The limit of the BFF for the name of an administrator (RF-22). */
export const MAX_ADMIN_NAME_LENGTH = 100;

// The pattern of `name` in the contract (v0.23.0, TAR-294): no control characters (line break, tab,
// NUL…: `\p{Cc}` is \x00-\x1f and \x7f-\x9f) and at least one that is not whitespace.
const ADMIN_NAME = /^\P{Cc}*[^\s\p{Cc}]\P{Cc}*$/u;

/**
 * What is wrong with the name an administrator writes in A0.5, as the BFF checks it: the name is
 * trimmed first, then it needs 1 to 100 characters that are not only spaces and none of control.
 * Null when it is valid.
 */
export function adminNameProblem(name: string): { kind: string; message: string } | null {
  const trimmed = name.trim();
  if (trimmed === '') return { kind: 'required', message: 'Escribe tu nombre completo' };
  if (trimmed.length > MAX_ADMIN_NAME_LENGTH) {
    return { kind: 'maxLength', message: 'Máximo 100 caracteres' };
  }
  return ADMIN_NAME.test(trimmed)
    ? null
    : { kind: 'pattern', message: 'El nombre no admite saltos de línea ni tabulaciones' };
}
