import { computed, signal } from '@angular/core';
import type { Signal } from '@angular/core';

export type RefreshState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'error'; readonly message: string };

export type AsyncContent<T> =
  | { readonly status: 'initial-loading' }
  | { readonly status: 'initial-error'; readonly message: string; readonly retrying: boolean }
  | { readonly status: 'ready'; readonly data: T; readonly refresh: RefreshState };

export type ActionState =
  | { readonly status: 'idle' }
  | { readonly status: 'submitting' }
  | { readonly status: 'error'; readonly message: string };

/**
 * What a screen reads of an {@link AsyncContent}, written once for every source of that state
 * (`AsyncContentState` and `ResourceContent`, TAR-355).
 */
export function contentSignals<T>(state: Signal<AsyncContent<T>>) {
  return {
    /** The initial load failed and «Reintentar» is asking again (TAR-325). */
    retrying: computed(() => {
      const now = state();
      return now.status === 'initial-error' && now.retrying;
    }),
    /** The data is on screen and a refresh is going on. */
    refreshing: computed(() => {
      const now = state();
      return now.status === 'ready' && now.refresh.status === 'loading';
    }),
    /** What a refresh that failed says, while the data it had stays on screen. */
    refreshError: computed(() => {
      const now = state();
      return now.status === 'ready' && now.refresh.status === 'error' ? now.refresh.message : null;
    }),
  };
}

/**
 * State of ONE read that yields a single value (a summary, a detail): initial load, initial error
 * and a refresh that keeps the data on screen. For a paged list with a cursor use `PageLoadState`.
 * Transport, error translation and empty semantics belong to the caller.
 */
export class AsyncContentState<T> {
  private readonly value = signal<AsyncContent<T>>({ status: 'initial-loading' });
  private sequence = 0;
  private pending = false;
  private disposed = false;
  readonly state = this.value.asReadonly();
  readonly data = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.data : null;
  });

  private readonly signals = contentSignals(this.state);
  readonly retrying = this.signals.retrying;
  readonly refreshing = this.signals.refreshing;
  readonly refreshError = this.signals.refreshError;

  /** Refresh retains usable data; changing identity explicitly starts a new initial load. */
  begin(newContext = false): number | null {
    if (this.disposed || (this.pending && !newContext)) return null;
    this.pending = true;
    const state = this.state();
    if (newContext || state.status === 'initial-loading') {
      this.value.set({ status: 'initial-loading' });
    } else if (state.status === 'initial-error') {
      this.value.set({ ...state, retrying: true });
    } else {
      this.value.set({ ...state, refresh: { status: 'loading' } });
    }
    return ++this.sequence;
  }

  succeed(request: number, data: T): boolean {
    if (!this.current(request)) return false;
    this.pending = false;
    this.value.set({ status: 'ready', data, refresh: { status: 'idle' } });
    return true;
  }

  fail(request: number, message: string): boolean {
    if (!this.current(request)) return false;
    this.pending = false;
    const state = this.state();
    this.value.set(
      state.status === 'ready'
        ? { ...state, refresh: { status: 'error', message } }
        : { status: 'initial-error', message, retrying: false },
    );
    return true;
  }

  dispose(): void {
    this.disposed = true;
    this.pending = false;
    this.sequence++;
  }

  private current(request: number): boolean {
    return !this.disposed && this.pending && request === this.sequence;
  }
}
