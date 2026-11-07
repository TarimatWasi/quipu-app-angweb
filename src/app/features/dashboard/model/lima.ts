const LIMA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The day of an instant in America/Lima, yyyy-mm-dd: the day of the residence, not the browser. */
export function limaDay(instant: Date): string {
  return LIMA_DAY.format(instant);
}

/** The month of an instant in America/Lima, yyyy-mm. */
export function limaMonth(instant: Date): string {
  return limaDay(instant).slice(0, 7);
}
