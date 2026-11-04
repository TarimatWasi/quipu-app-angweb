import { LoadTiming, SKELETON_DELAY_MS, SLOW_NOTICE_MS } from './load-timing';
import {
  documentNumberError,
  guestName,
  nightsBetween,
  nightsText,
  stayDatesWithYear,
  todayText,
} from './guest-texts';

describe('texts of A3.2 and A3.5', () => {
  it('names a guest by its name, or by its document while it has none', () => {
    expect(guestName({ name: 'Carmen Huamán', documentType: 'CE', documentNumber: '001' })).toBe(
      'Carmen Huamán',
    );
    expect(guestName({ name: null, documentType: 'DNI', documentNumber: '70412233' })).toBe(
      'DNI 70412233',
    );
  });

  it('counts the nights of a stay and says them in Spanish', () => {
    expect(nightsBetween('2026-10-20', '2026-10-31')).toBe(11);
    expect(nightsBetween('2026-12-28', '2027-01-03')).toBe(6);
    expect(nightsBetween('2026-10-31', '2026-10-20')).toBeNull();
    expect(nightsBetween('', '2026-10-20')).toBeNull();
    expect(nightsText(1)).toBe('1 noche');
    expect(nightsText(7)).toBe('7 noches');
  });

  it('writes the dates of a stay with the year', () => {
    expect(stayDatesWithYear('2026-10-20', '2026-10-31')).toBe('20 – 31 oct 2026');
    expect(stayDatesWithYear('2026-10-28', '2026-11-03')).toBe('28 oct – 3 nov 2026');
    expect(stayDatesWithYear('2026-12-28', '2027-01-03')).toBe('28 dic 2026 – 3 ene 2027');
  });

  it('writes today in the time of Lima', () => {
    expect(todayText(new Date('2026-10-29T15:00:00Z'))).toBe('Hoy, jueves 29 de octubre');
    // 2 a. m. in UTC is still the previous day in Lima.
    expect(todayText(new Date('2026-11-04T02:00:00Z'))).toBe('Hoy, martes 3 de noviembre');
  });

  it('checks a document number with the texts of the SRS', () => {
    expect(documentNumberError('DNI', ' ')).toBe('Escribe el número de documento.');
    expect(documentNumberError('DNI', '1234567')).toBe('El DNI tiene 8 dígitos.');
    expect(documentNumberError('DNI', '12345678')).toBeNull();
    expect(documentNumberError('PASSPORT', 'AB 12')).toBe(
      'Usa solo letras, números o guion, hasta 20.',
    );
    expect(documentNumberError('CE', 'CE-001')).toBeNull();
  });
});

describe('LoadTiming (P-12)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the skeleton only after 300 ms and the slow notice after 8 s', () => {
    const timing = new LoadTiming();
    timing.start();

    vi.advanceTimersByTime(SKELETON_DELAY_MS - 1);
    expect(timing.skeleton()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(timing.skeleton()).toBe(true);
    expect(timing.slow()).toBe(false);
    vi.advanceTimersByTime(SLOW_NOTICE_MS - SKELETON_DELAY_MS);
    expect(timing.slow()).toBe(true);
  });

  it('shows nothing when the answer arrives first, and hides everything on stop', () => {
    const timing = new LoadTiming();
    timing.start();
    vi.advanceTimersByTime(100);
    timing.stop();
    vi.advanceTimersByTime(SLOW_NOTICE_MS);
    expect(timing.skeleton()).toBe(false);
    expect(timing.slow()).toBe(false);

    timing.start();
    vi.advanceTimersByTime(SLOW_NOTICE_MS);
    timing.stop();
    expect(timing.skeleton()).toBe(false);
    expect(timing.slow()).toBe(false);
  });
});
