import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { AuthService } from '@core/auth/auth.service';
import { firstValueFrom } from 'rxjs';
import { ChangeResourcesService } from './change-resources.service';
import { parseChange, parseClosing, parseReady } from './change-events';
import type { ChangeRole } from './change-events';

export type ChangeEventSource = Pick<
  EventSource,
  'addEventListener' | 'removeEventListener' | 'onerror' | 'close'
>;
export type ChangeEventSourceFactory = (url: string, init: EventSourceInit) => ChangeEventSource;
export const CHANGE_EVENT_SOURCE_FACTORY = new InjectionToken<ChangeEventSourceFactory>(
  'CHANGE_EVENT_SOURCE_FACTORY',
  { providedIn: 'root', factory: () => (url, init) => new EventSource(url, init) },
);

export const CHANGES_ENABLED = new InjectionToken<boolean>('CHANGES_ENABLED', {
  providedIn: 'root',
  factory: () => typeof EventSource !== 'undefined',
});

const MAX_UNREADY_ATTEMPTS = 5;
const BACKOFF_MS = [1000, 2000, 4000, 8000, 16000] as const;
const OPAQUE_ERROR_FLOOR_MS = 30_000;

/** One authenticated SSE connection per shell/tab, with controlled recovery and mounted resync. */
@Injectable({ providedIn: 'root' })
export class ChangeStreamService {
  private readonly enabled = inject(CHANGES_ENABLED);
  private generation = 0;
  private readonly auth = inject(AuthService);
  private readonly resources = inject(ChangeResourcesService);
  private readonly router = inject(Router);
  private readonly base = inject(BFF_BASE_URL);
  private readonly factory = inject(CHANGE_EVENT_SOURCE_FACTORY);
  private source: ChangeEventSource | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private attemptsWithoutReady = 0;
  private stopped = true;
  private waitingForVisible = false;
  private role: ChangeRole | null = null;
  private readonly active = signal(false);
  private readonly needsRetry = signal(false);

  readonly connected = this.active.asReadonly();
  readonly retryRequired = this.needsRetry.asReadonly();

  start(): void {
    if (!this.stopped) return;
    if (!this.enabled) return;
    this.stopped = false;
    this.needsRetry.set(false);
    this.attemptsWithoutReady = 0;
    this.waitingForVisible = document.visibilityState === 'hidden';
    this.role = this.auth.session()?.role === 'ADMIN' ? 'ADMIN' : 'GUEST';
    const session = this.auth.session();
    if (!session || session.guestStatus === 'ONBOARDING') {
      this.stop();
      return;
    }
    document.addEventListener('visibilitychange', this.onVisibility);
    this.open();
  }

  stop(): void {
    this.stopped = true;
    this.generation++;
    this.needsRetry.set(false);
    this.waitingForVisible = false;
    this.clearTimer();
    this.detach();
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.active.set(false);
  }

  retry(): void {
    if (!this.needsRetry()) return;
    this.needsRetry.set(false);
    this.attemptsWithoutReady = 0;
    this.stopped = false;
    this.open();
  }

  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'hidden') {
      this.waitingForVisible = !this.stopped && !this.needsRetry();
      this.generation++;
      this.clearTimer();
      this.detach();
      this.active.set(false);
    } else if (this.waitingForVisible && !this.stopped) {
      this.waitingForVisible = false;
      this.resources.ready();
      this.open();
    }
  };

  private open(): void {
    if (this.stopped || document.visibilityState === 'hidden' || this.source !== null) return;
    if (this.attemptsWithoutReady >= MAX_UNREADY_ATTEMPTS) {
      this.needsRetry.set(true);
      this.active.set(false);
      return;
    }
    this.attemptsWithoutReady++;
    const path = this.role === 'ADMIN' ? '/admin/changes/stream' : '/guest/changes/stream';
    const source = this.factory(`${this.base}/bff${path}`, { withCredentials: true });
    this.source = source;
    source.addEventListener('ready', this.onReady);
    source.addEventListener('changed', this.onChanged);
    source.addEventListener('closing', this.onClosing);
    source.onerror = () => {
      this.onError(source);
    };
    // A proxy may accept the connection but never deliver ready. Recovery is bounded here too.
    this.timer = setTimeout(() => {
      this.onError(source);
    }, 90_000);
  }

  private readonly onReady: EventListener = (event) => {
    const payload = parseReady((event as MessageEvent<string>).data);
    if (!payload) return;
    this.clearTimer();
    this.attemptsWithoutReady = 0;
    this.needsRetry.set(false);
    this.active.set(true);
    this.resources.ready();
  };

  private readonly onChanged: EventListener = (event) => {
    if (this.role === null) return;
    const payload = parseChange((event as MessageEvent<string>).data, this.role);
    if (payload) this.resources.changed(payload.invalidate);
  };

  private readonly onClosing: EventListener = (event) => {
    const payload = parseClosing((event as MessageEvent<string>).data);
    if (!payload) return;
    this.clearTimer();
    this.detach();
    this.active.set(false);
    if (payload.reason === 'session-revoked') {
      this.endSession();
    } else if (payload.reason === 'access-token-expired' || payload.reason === 'session-updated') {
      void this.checkAndReconnect(false);
    } else {
      this.schedule(this.opaqueDelay());
    }
  };

  private onError(source: ChangeEventSource): void {
    if (this.source !== source) return;
    this.clearTimer();
    this.detach(); // Prevent EventSource's native retry loop and duplicate streams.
    this.active.set(false);
    void this.checkAndReconnect(true);
  }

  private async checkAndReconnect(opaque: boolean): Promise<void> {
    const generation = ++this.generation;
    try {
      const session = await firstValueFrom(this.auth.verifySession());
      if (generation !== this.generation || this.stopped) return;
      if (!session) {
        this.endSession();
        return;
      }
      this.role = session.role === 'ADMIN' ? 'ADMIN' : 'GUEST';
      this.schedule(
        Math.max(
          opaque ? this.opaqueDelay() : 0,
          BACKOFF_MS[Math.min(Math.max(this.attemptsWithoutReady - 1, 0), BACKOFF_MS.length - 1)] ??
            16000,
        ),
      );
    } catch (error: unknown) {
      if (generation !== this.generation || this.stopped) return;
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.endSession();
      } else if (error instanceof HttpErrorResponse && error.status === 403) {
        this.needsRetry.set(true);
      } else {
        this.schedule(this.opaqueDelay());
      }
    }
  }

  private opaqueDelay(): number {
    return Math.min(
      120_000,
      OPAQUE_ERROR_FLOOR_MS * 2 ** Math.max(this.attemptsWithoutReady - 1, 0),
    );
  }

  private endSession(): void {
    this.stop();
    this.auth.clear();
    void this.router.navigate(['/login'], {
      queryParams: { expired: '1', returnUrl: this.router.url },
    });
  }

  private schedule(delay: number): void {
    if (this.stopped) return;
    if (document.visibilityState === 'hidden') {
      this.waitingForVisible = true;
      return;
    }
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      this.open();
    }, delay);
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  private detach(): void {
    const source = this.source;
    if (!source) return;
    source.removeEventListener('ready', this.onReady);
    source.removeEventListener('changed', this.onChanged);
    source.removeEventListener('closing', this.onClosing);
    source.onerror = null;
    source.close();
    this.source = null;
  }
}
