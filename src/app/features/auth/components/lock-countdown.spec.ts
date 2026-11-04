import { LockCountdown } from './lock-countdown';

// 15:42 in Lima (UTC-5): the time of day the lock ends.
const LOCK = { retryAfterSeconds: 900, lockedUntil: new Date('2026-10-07T20:42:00Z') };

describe('LockCountdown', () => {
  let countdown: LockCountdown;

  beforeEach(() => {
    vi.useFakeTimers();
    countdown = new LockCountdown();
  });
  afterEach(() => {
    countdown.stop();
    vi.useRealTimers();
  });

  it('is not active until a lock starts', () => {
    expect(countdown.active()).toBe(false);
    expect(countdown.display()).toBe('00:00');
    expect(countdown.announcement()).toBe('');
  });

  it('starts from the seconds the server gave and shows the time of day in Lima', () => {
    countdown.start(LOCK);

    expect(countdown.active()).toBe(true);
    expect(countdown.display()).toBe('15:00');
    expect(countdown.clockTime()).toBe('15:42');
    expect(countdown.announcement()).toBe(
      'Cuenta bloqueada. Podrás intentarlo de nuevo a las 15:42 (hora de Lima).',
    );
  });

  it('counts down one second at a time, with minutes and seconds', () => {
    countdown.start(LOCK);

    vi.advanceTimersByTime(1_000);
    expect(countdown.display()).toBe('14:59');
    vi.advanceTimersByTime(59_000);
    expect(countdown.display()).toBe('14:00');
    vi.advanceTimersByTime(13 * 60_000 + 55_000);
    expect(countdown.display()).toBe('00:05');
  });

  it('is not skewed when the clock of the device changes while it counts', () => {
    countdown.start(LOCK);

    vi.advanceTimersByTime(7_000);
    vi.setSystemTime(Date.now() + 120_000);
    vi.advanceTimersByTime(1_000);

    expect(countdown.display()).toBe('14:52');
  });

  it('announces only at the start, with 10, 5 and 1 minutes left and at the end', () => {
    const heard: string[] = [];
    countdown.start(LOCK);
    heard.push(countdown.announcement());

    for (let second = 1; second <= 900; second++) {
      vi.advanceTimersByTime(1_000);
      const now = countdown.announcement();
      if (now !== heard[heard.length - 1]) {
        heard.push(now);
      }
    }

    expect(heard).toEqual([
      'Cuenta bloqueada. Podrás intentarlo de nuevo a las 15:42 (hora de Lima).',
      'Faltan 10 minutos para poder intentarlo de nuevo.',
      'Faltan 5 minutos para poder intentarlo de nuevo.',
      'Falta 1 minuto para poder intentarlo de nuevo.',
      'Ya puedes intentarlo de nuevo.',
    ]);
  });

  it('ends at zero: no longer active, and the end callback runs once', () => {
    const onEnd = vi.fn();
    countdown.start(LOCK, onEnd);

    vi.advanceTimersByTime(899_000);
    expect(countdown.active()).toBe(true);
    expect(onEnd).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1_000);
    expect(countdown.active()).toBe(false);
    expect(onEnd).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(60_000);
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('a new lock replaces the one in progress', () => {
    const first = vi.fn();
    countdown.start(LOCK, first);
    vi.advanceTimersByTime(100_000);

    countdown.start({ retryAfterSeconds: 300, lockedUntil: new Date('2026-10-07T20:30:00Z') });

    expect(countdown.display()).toBe('05:00');
    vi.advanceTimersByTime(300_000);
    expect(first).not.toHaveBeenCalled();
    expect(countdown.active()).toBe(false);
  });

  it('stop() cancels the countdown without ending it', () => {
    const onEnd = vi.fn();
    countdown.start(LOCK, onEnd);

    countdown.stop();
    vi.advanceTimersByTime(900_000);

    expect(countdown.active()).toBe(false);
    expect(onEnd).not.toHaveBeenCalled();
  });
});
