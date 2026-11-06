import { computed, signal } from '@angular/core';

export interface PageRequest<Q> {
  readonly query: Q;
  readonly after: string | null;
}

/**
 * Bookkeeping of a PAGED list read with a cursor ("Mostrar más"): first page versus more, with a
 * query that can change. For a single value (a summary, a detail) use `AsyncContentState`. Pages
 * retain their data, transport and filter semantics.
 */
export class PageLoadState<Q> {
  private sequence = 0;
  private readonly pendingValue = signal<PageRequest<Q> | null>(null);
  private readonly failedValue = signal<PageRequest<Q> | null>(null);
  private readonly answered = signal(false);
  private readonly pageReady = signal(false);

  readonly pending = this.pendingValue.asReadonly();
  readonly failed = this.failedValue.asReadonly();
  readonly loading = computed(() => this.pending() !== null);
  readonly phase = computed<'loading' | 'error' | 'ready'>(() =>
    this.answered() ? 'ready' : this.failed() === null ? 'loading' : 'error',
  );
  readonly retrying = computed(() => this.failed() !== null && this.loading());
  readonly loadingFirst = computed(() => this.pending()?.after === null);
  readonly loadingMore = computed(() => this.pending() !== null && !this.loadingFirst());
  readonly firstFailed = computed(() => this.failed()?.after === null);
  readonly moreFailed = computed(() => this.failed() !== null && !this.firstFailed());
  readonly showEmpty = computed(() => this.pageReady() && !this.loading());

  begin(request: PageRequest<Q>, keepFailure = false): number {
    if (!keepFailure) this.failedValue.set(null);
    if (request.after === null) this.pageReady.set(false);
    this.pendingValue.set(request);
    return ++this.sequence;
  }

  succeed(sequence: number): boolean {
    if (!this.isCurrent(sequence)) return false;
    this.pendingValue.set(null);
    this.failedValue.set(null);
    this.answered.set(true);
    this.pageReady.set(true);
    return true;
  }

  fail(sequence: number): boolean {
    if (!this.isCurrent(sequence)) return false;
    this.failedValue.set(this.pending());
    this.pendingValue.set(null);
    return true;
  }

  isCurrent(sequence: number): boolean {
    return sequence === this.sequence && this.pending() !== null;
  }

  /** A different entity/view has no usable data from the previous context. */
  reset(): void {
    this.invalidate();
    this.failedValue.set(null);
    this.answered.set(false);
    this.pageReady.set(false);
  }

  /** A destroyed page must not accept a response or failure that is still in flight. */
  invalidate(): void {
    this.sequence++;
    this.pendingValue.set(null);
  }
}
