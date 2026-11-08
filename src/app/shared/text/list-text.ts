/**
 * The sentences every list says in the same way (TAR-321). The screen gives the subject and the
 * sentence is written once, so a change of wording is a change in one place.
 */

/** «Mostrando 3 de 17 cargados»; an empty `qualifier` leaves it out («Mostrando 3 de 5»). */
export function countText(shown: number, total: number, qualifier = 'cargados'): string {
  return `Mostrando ${String(shown)} de ${String(total)}${qualifier === '' ? '' : ` ${qualifier}`}`;
}

/** «Ningún contrato coincide con los filtros.»: `subject` is a masculine noun in the singular. */
export function noMatchHeading(subject: string): string {
  return `Ningún ${subject} coincide con los filtros.`;
}

/** «No se pudo cargar el contrato.» / «No se pudieron cargar los contratos.» */
export function loadErrorText(subject: string, plural = false): string {
  return `No se ${plural ? 'pudieron' : 'pudo'} cargar ${subject}.`;
}
