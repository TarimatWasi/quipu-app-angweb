/** Searching and ordering the Spanish texts of a list loaded in the page (A3, A5). */

/** Lower case and without accents, so «huaman» finds «Huamán». */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/** Whether any of the texts holds what was typed in «Buscar»; an empty search matches all. */
export function matchesAny(texts: readonly string[], search: string): boolean {
  const wanted = fold(search.trim());
  return wanted === '' || texts.some((text) => fold(text).includes(wanted));
}

/** Spanish order, without minding case or accents, with numbers by their value («C2» before «C10»). */
export const COLLATOR = new Intl.Collator('es', { sensitivity: 'base', numeric: true });
