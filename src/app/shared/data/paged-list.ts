import { signal } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { PageLoadState } from './page-load-state';
import type { PageRequest } from './page-load-state';

/** A page of a list read with a cursor, as the BFF answers it. */
export interface Paged<T> {
  readonly content: readonly T[];
  readonly nextCursor: string | null;
}

/**
 * The loaded items of a PAGED list with a cursor («Mostrar más») and what that read is going
 * through: its first page, more, a failure of either. `Q` is the query the BFF is asked (a state,
 * a view); filters, search and order are the screen's and never come here. A new read forgets the
 * failure of another one, and a first page forgets the cursor of the previous one, so «Mostrar
 * más» never mixes two lists. A destroyed page calls {@link dispose}: an answer in flight is dropped.
 */
export class PagedList<Q, T, P extends Paged<T> = Paged<T>> {
  private readonly load = new PageLoadState<Q>();
  private readonly loaded = signal<readonly T[]>([]);

  readonly items = this.loaded.asReadonly();
  readonly nextCursor = signal<string | null>(null);
  readonly phase = this.load.phase;
  readonly retrying = this.load.retrying;
  readonly loadingMore = this.load.loadingMore;
  readonly firstFailed = this.load.firstFailed;
  readonly moreFailed = this.load.moreFailed;

  /**
   * `fetch` asks the BFF; `received` lets a screen keep what else a page carries (a count, a panel),
   * only for a page that is still the current one.
   */
  constructor(
    private readonly fetch: (query: Q, after: string | null) => Observable<P>,
    private readonly received: (page: P, request: PageRequest<Q>) => void = () => undefined,
  ) {}

  /** The first page of a query; what was loaded stays on screen until it arrives (a refresh). */
  reload(query: Q): void {
    this.read({ query, after: null });
  }

  /** Another query: nothing of the previous one is usable, so the list starts empty and loading. */
  switchTo(query: Q): void {
    this.load.reset();
    this.loaded.set([]);
    this.read({ query, after: null });
  }

  /** The next page of `query`, unless one is already being read. */
  more(query: Q): void {
    const after = this.nextCursor();
    if (after !== null && !this.load.loading()) this.read({ query, after });
  }

  /** Asks the failed read again, unless the query changed since: then its first page. */
  retry(query: Q): void {
    if (this.load.loading()) return;
    const request = this.load.failed();
    if (request?.query === query) this.read(request, true);
    else this.read({ query, after: null });
  }

  dispose(): void {
    this.load.invalidate();
  }

  private read(request: PageRequest<Q>, retrying = false): void {
    if (request.after === null) this.nextCursor.set(null);
    const sequence = this.load.begin(request, retrying);
    firstValueFrom(this.fetch(request.query, request.after))
      .then((page) => {
        this.receive(sequence, request, page);
      })
      .catch(() => {
        this.load.fail(sequence);
      });
  }

  private receive(sequence: number, request: PageRequest<Q>, page: P): void {
    if (!this.load.succeed(sequence)) return;
    this.loaded.update((loaded) =>
      request.after === null ? page.content : [...loaded, ...page.content],
    );
    this.nextCursor.set(page.nextCursor);
    this.received(page, request);
  }
}
