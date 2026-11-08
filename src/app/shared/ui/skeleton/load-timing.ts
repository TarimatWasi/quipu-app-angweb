import { InjectionToken, signal } from '@angular/core';

/** The skeleton shows at once: a screen goes from nothing to the skeleton to the data, never through a blank step. */
export const SKELETON_DELAY_MS = 0;
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
    if (this.timing.showAfterMs <= 0) this.skeleton.set(true);
    this.timers = [
      ...(this.timing.showAfterMs > 0
        ? [
            setTimeout(() => {
              this.skeleton.set(true);
            }, this.timing.showAfterMs),
          ]
        : []),
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
