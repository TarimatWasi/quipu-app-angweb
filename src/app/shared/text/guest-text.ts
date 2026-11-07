/** What a screen says of a guest that has not given a name yet (TAR-237). */
export const NO_NAME = 'Huésped sin nombre';

/** The name of a guest as the screens write it, or {@link NO_NAME} while it has none. */
export function guestName(name: string | null | undefined): string {
  return name === null || name === undefined || name.trim() === '' ? NO_NAME : name;
}
