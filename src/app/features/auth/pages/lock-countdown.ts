import { computed, signal } from '@angular/core';
import type { AccountLock } from '@core/services/bff-error';

const LIMA_CLOCK = new Intl.DateTimeFormat('es-PE', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'America/Lima',
});

// Seconds left at which a screen reader is told how long is left (never every second).
const ANNOUNCE_AT = [600, 300, 60] as const;

function minutesLeft(seconds: number): string {
  const minutes = seconds / 60;
  return minutes === 1
    ? 'Falta 1 minuto para poder intentarlo de nuevo.'
    : `Faltan ${String(minutes)} minutos para poder intentarlo de nuevo.`;
}

/**
 * The countdown of a locked account (TAR-131). It counts from the seconds the server gave
 * (`Retry-After`) on a monotonic clock, so a wrong or changing clock on the device cannot skew
 * it. `announcement` is the only text a screen reader is told about the time left: the digits
 * that change every second are meant to be hidden from it.
 */
export class LockCountdown {
  private readonly remaining = signal(0);
  private readonly until = signal<Date | null>(null);
  private readonly spoken = new Set<number>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private endsAt = 0;
  private onEnd: (() => void) | undefined;

  /** True while the lock lasts. */
  readonly active = computed(() => this.until() !== null);
  /** Time left as mm:ss. */
  readonly display = computed(() => {
    const seconds = this.remaining();
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  });
  /** The time of day the lock ends, in Lima (hh:mm, 24 hours). */
  readonly clockTime = computed(() => {
    const until = this.until();
    return until ? LIMA_CLOCK.format(until) : '';
  });
  /** What to tell a screen reader; changes only at the milestones. */
  readonly announcement = signal('');

  /** Starts counting; a lock already counting is replaced and its end callback is dropped. */
  start(lock: AccountLock, onEnd?: () => void): void {
    this.stop();
    this.onEnd = onEnd;
    this.endsAt = performance.now() + lock.retryAfterSeconds * 1000;
    this.until.set(lock.lockedUntil);
    this.remaining.set(lock.retryAfterSeconds);
    this.spoken.clear();
    // A lock found with little time left must not announce the milestones already behind it.
    ANNOUNCE_AT.filter((at) => at >= lock.retryAfterSeconds).forEach((at) => this.spoken.add(at));
    this.announcement.set(
      `Cuenta bloqueada. Podrás intentarlo de nuevo a las ${this.clockTime()} (hora de Lima).`,
    );
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
    this.until.set(null);
    this.remaining.set(0);
  }

  private tick(): void {
    const seconds = Math.max(0, Math.ceil((this.endsAt - performance.now()) / 1000));
    this.remaining.set(seconds);
    if (seconds === 0) {
      this.finish();
      return;
    }
    for (const at of ANNOUNCE_AT) {
      if (seconds <= at && !this.spoken.has(at)) {
        this.spoken.add(at);
        this.announcement.set(minutesLeft(at));
      }
    }
  }

  private finish(): void {
    const done = this.onEnd;
    this.stop();
    this.announcement.set('Ya puedes intentarlo de nuevo.');
    done?.();
  }
}
