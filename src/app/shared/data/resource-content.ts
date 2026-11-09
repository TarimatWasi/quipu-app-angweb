import { computed, signal } from '@angular/core';
import type { ResourceRef } from '@angular/core';
import { contentSignals } from './async-content';
import type { AsyncContent, RefreshState } from './async-content';

export interface ResourceContentOptions {
  /** What the screen says when the read fails (its own text, not the BFF's message). */
  readonly message: (error: Error) => string;
  /**
   * Who is being read (the :id). When it changes, nothing read for the previous one is usable:
   * the screen goes back to its first load instead of refreshing. Left out, the read has no
   * identity (a summary of the session).
   */
  readonly identity?: () => unknown;
}

/** Something kept for one identity: it stops counting once the identity changes. */
interface Kept<V> {
  readonly identity: unknown;
  readonly value: V;
}

const NO_IDENTITY = (): null => null;

/**
 * The state of ONE read made with a resource (`rxResource`, `httpResource`), said as
 * `AsyncContentState` says it (TAR-355, FE-ANG-HTTP-03): first load, first error with
 * «Reintentar», and a refresh that keeps the data on screen. A resource forgets its value when a
 * reload fails; {@link reload} keeps the data it had, so a failed refresh shows
 * `app-refresh-error` over it instead of taking it away. The screen reads again only through
 * {@link reload} and {@link retry}, never through the resource itself. Cancelling an answer that
 * no longer counts and dropping it when the page goes are the resource's own.
 */
export class ResourceContent<T> {
  private readonly identity: () => unknown;
  private readonly messageOf: (error: Error) => string;
  /** The data on screen when a refresh started. */
  private readonly beforeRefresh = signal<Kept<T> | null>(null);

  private readonly kept = computed<T | undefined>(() => {
    if (this.ref.hasValue()) return this.ref.value();
    const before = this.beforeRefresh();
    return before !== null && before.identity === this.identity() ? before.value : undefined;
  });

  /** A resource keeps the error of its last read while it reads again: «Reintentar» still says it. */
  private readonly failure = computed(() => this.ref.error());

  readonly state = computed<AsyncContent<T>>(() => {
    const data = this.kept();
    const loading = this.ref.isLoading();
    const failure = this.failure();
    if (data !== undefined) {
      let refresh: RefreshState = { status: 'idle' };
      if (loading) refresh = { status: 'loading' };
      else if (failure !== undefined)
        refresh = { status: 'error', message: this.messageOf(failure) };
      return { status: 'ready', data, refresh };
    }
    if (failure !== undefined) {
      return { status: 'initial-error', message: this.messageOf(failure), retrying: loading };
    }
    return { status: 'initial-loading' };
  });

  readonly data = computed(() => this.kept() ?? null);

  /** The failure on screen, kept while «Reintentar» asks again (a 404 that means «there is none»). */
  readonly error = this.failure;

  private readonly signals = contentSignals(this.state);
  readonly retrying = this.signals.retrying;
  readonly refreshing = this.signals.refreshing;
  readonly refreshError = this.signals.refreshError;

  constructor(
    private readonly ref: ResourceRef<T | undefined>,
    options: ResourceContentOptions,
  ) {
    this.identity = options.identity ?? NO_IDENTITY;
    this.messageOf = options.message;
  }

  /** Reads again keeping what is on screen (after a change, or a refresh asked by the person). */
  reload(): void {
    const data = this.kept();
    this.beforeRefresh.set(data === undefined ? null : { identity: this.identity(), value: data });
    this.ref.reload();
  }

  /** «Reintentar» after a first load that failed: the error stays, saying it is asking again. */
  retry(): void {
    if (!this.ref.isLoading()) this.ref.reload();
  }
}
