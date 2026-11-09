import { computed, signal } from '@angular/core';

/**
 * Seconds left of a wait the server set (a lock, the wait before asking for another code). It
 * counts on a monotonic clock, so a wrong or changing clock on the device cannot skew it; the
 * screen words what it shows, this only counts.
 */
export class Countdown {
  private readonly left = signal(0);
  private timer: ReturnType<typeof setInterval> | undefined;
  private endsAt = 0;
  private onEnd: (() => void) | undefined;

  /** Whole seconds left; 0 when it is not counting. */
  readonly remaining = this.left.asReadonly();
  /** True while it counts. */
  readonly active = computed(() => this.left() > 0);

  /** Starts counting; a countdown already running is replaced and its end callback is dropped. */
  start(seconds: number, onEnd?: () => void): void {
    this.stop();
    if (seconds < 1) return;
    this.onEnd = onEnd;
    this.endsAt = performance.now() + seconds * 1000;
    this.left.set(seconds);
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);
  }

  /** Cancels the countdown without ending it. */
  stop(): void {
    if (this.timer !== undefined) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.onEnd = undefined;
    this.left.set(0);
  }

  private tick(): void {
    const seconds = Math.max(0, Math.ceil((this.endsAt - performance.now()) / 1000));
    if (seconds > 0) {
      this.left.set(seconds);
      return;
    }
    const done = this.onEnd;
    this.stop();
    done?.();
  }
}
