import { LoadTiming, SKELETON_DELAY_MS, SLOW_NOTICE_MS } from './load-timing';

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
