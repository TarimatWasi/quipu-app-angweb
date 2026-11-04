const LIMA_DAY = new Intl.DateTimeFormat('es-PE', {
  timeZone: 'America/Lima',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

/**
 * P-02: the time context of a page, «Hoy, jueves 29 de octubre», for the day the instant falls on
 * in America/Lima (not the browser's zone). Pure: the caller passes the instant.
 */
export function formatLimaToday(instant: Date): string {
  const parts = LIMA_DAY.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';
  return `Hoy, ${part('weekday')} ${part('day')} de ${part('month')}`;
}
