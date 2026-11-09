import { Countdown } from './countdown';

describe('Countdown', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'performance'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down the seconds and calls back at the end', () => {
    const countdown = new Countdown();
    const done = vi.fn();

    countdown.start(3, done);
    expect(countdown.active()).toBe(true);
    expect(countdown.remaining()).toBe(3);

    vi.advanceTimersByTime(1000);
    expect(countdown.remaining()).toBe(2);

    vi.advanceTimersByTime(2000);
    expect(countdown.remaining()).toBe(0);
    expect(countdown.active()).toBe(false);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('stops without calling back, and a new start replaces the one running', () => {
    const countdown = new Countdown();
    const first = vi.fn();

    countdown.start(5, first);
    countdown.start(2);
    expect(countdown.remaining()).toBe(2);
    vi.advanceTimersByTime(5000);
    expect(first).not.toHaveBeenCalled();

    countdown.start(5, first);
    countdown.stop();
    vi.advanceTimersByTime(5000);
    expect(first).not.toHaveBeenCalled();
    expect(countdown.active()).toBe(false);
  });

  it('does not count a wait of less than a second', () => {
    const countdown = new Countdown();
    countdown.start(0);
    expect(countdown.active()).toBe(false);
  });
});
