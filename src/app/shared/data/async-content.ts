import { computed } from '@angular/core';
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
 * (`ResourceContent`, TAR-355; `AsyncContentState` was retired in TAR-357).
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
