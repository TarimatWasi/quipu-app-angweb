import { vi } from 'vitest';

/**
 * The timers a component left behind, under fake timers. Angular's zoneless scheduler races a
 * setTimeout(0) against requestAnimationFrame for each change detection; with jsdom 31 that pair
 * is still pending when the test counts. It is let run first (0 ms, so no timer of the component
 * under test, like the 8 s slow notice, moves), and what remains is the component's.
 */
export function pendingTimers(): number {
  vi.advanceTimersByTime(0);
  return vi.getTimerCount();
}
