import { InjectionToken, signal } from '@angular/core';

/** P-12: an answer faster than this shows no skeleton, so nothing flickers. */
export const SKELETON_DELAY_MS = 300;
/** P-12: after this long without an answer, the notice of the server waking up. */
export const SLOW_NOTICE_MS = 8000;

export interface SkeletonTiming {
  readonly showAfterMs: number;
  readonly slowNoticeAfterMs: number;
}

const DEFAULT_TIMING: SkeletonTiming = {
  showAfterMs: SKELETON_DELAY_MS,
  slowNoticeAfterMs: SLOW_NOTICE_MS,
};

export const SKELETON_TIMING = new InjectionToken<SkeletonTiming>('SKELETON_TIMING', {
  providedIn: 'root',
  factory: () => DEFAULT_TIMING,
});

/**
 * When the first load of a screen shows its skeleton and when the "server waking up" notice
 * (P-12). `start` when the load begins and `stop` when it ends, fails or the screen goes away.
 */
export class LoadTiming {
  readonly skeleton = signal(false);
  readonly slow = signal(false);
  private timers: ReturnType<typeof setTimeout>[] = [];

  constructor(private readonly timing: SkeletonTiming = DEFAULT_TIMING) {}

  start(): void {
    this.stop();
    this.timers = [
      setTimeout(() => {
        this.skeleton.set(true);
      }, this.timing.showAfterMs),
      setTimeout(() => {
        this.slow.set(true);
      }, this.timing.slowNoticeAfterMs),
    ];
  }

  stop(): void {
    this.timers.forEach((timer) => {
      clearTimeout(timer);
    });
    this.timers = [];
    this.skeleton.set(false);
    this.slow.set(false);
  }
}
