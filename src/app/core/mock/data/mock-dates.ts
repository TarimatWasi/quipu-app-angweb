// Dates of the simulated data, relative to today in Lima so the demo always looks current.
// Days are ISO strings (yyyy-mm-dd), months yyyy-mm and instants ISO date-times in UTC.

const LIMA_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Lima',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today in America/Lima, yyyy-mm-dd. */
export function today(): string {
  return LIMA_DAY.format(new Date());
}

export function nowInstant(): string {
  return new Date().toISOString();
}

function utc(day: string): Date {
  return new Date(`${day}T00:00:00Z`);
}

export function addDays(day: string, days: number): string {
  const date = utc(day);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** The month `months` away from the month of `day` (negative goes back), yyyy-mm. */
export function addMonths(day: string, months: number): string {
  const date = utc(`${day.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 7);
}

/** The payment day of `period`, or the last day of the month when the month is shorter (RN-10). */
export function dueDay(period: string, paymentDay: number): string {
  const [year = 0, month = 1] = period.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${period}-${String(Math.min(paymentDay, lastDay)).padStart(2, '0')}`;
}

/** A moment of `day` at `hour` in Lima (UTC-5), as an instant. */
export function instantOn(day: string, hour = 10): string {
  return new Date(`${day}T${String(hour).padStart(2, '0')}:00:00-05:00`).toISOString();
}

/** The months from `first` to `last`, both included, oldest first. */
export function monthsBetween(first: string, last: string): string[] {
  const months: string[] = [];
  for (let month = first; month <= last; month = addMonths(`${month}-01`, 1)) {
    months.push(month);
  }
  return months;
}

/** Whether two ranges of days share at least one day. */
export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
