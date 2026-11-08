import { computed, DestroyRef, inject, signal } from '@angular/core';
import type { WritableSignal } from '@angular/core';
import { form } from '@angular/forms/signals';
import type { FieldTree } from '@angular/forms/signals';
import type { Observable } from 'rxjs';
import { PagedList } from '@shared/data/paged-list';
import type { Paged } from '@shared/data/paged-list';
import type { PageRequest } from '@shared/data/page-load-state';
import { nextSort } from '@shared/ui/data-table/list-sort';
import type { ListSort, PhoneSort } from '@shared/ui/data-table/list-sort';

/** What a list gives to start: its filters with nothing chosen, its order and the phone orders. */
export interface ListPageConfig<Filters, Key extends string> {
  readonly noFilters: Filters;
  readonly defaultSort: ListSort<Key>;
  /** The orders «Ordenar por» offers on a phone: always ascending. */
  readonly phoneSorts: readonly PhoneSort<Key>[];
}

/**
 * What every list page does with its filters and its order (TAR-324): the filters and the form
 * that edits them, the order, «Buscar», «Quitar filtros», a pressed header and «Ordenar por» on a
 * phone. A page extends it, says what it filters and sorts by, and keeps what is its own.
 */
export abstract class ListFilterState<
  Filters extends { readonly search: string },
  Key extends string,
> {
  protected readonly filters: WritableSignal<Filters>;
  protected readonly filterForm: FieldTree<Filters>;
  protected readonly sort: WritableSignal<ListSort<Key>>;

  protected constructor(protected readonly config: ListPageConfig<Filters, Key>) {
    this.filters = signal(config.noFilters);
    this.filterForm = form(this.filters);
    this.sort = signal(config.defaultSort);
  }

  protected clearFilters(): void {
    this.filters.set(this.config.noFilters);
  }

  protected searchFor(search: string): void {
    this.filters.update((filters) => ({ ...filters, search }));
  }

  protected sortBy(key: Key): void {
    this.sort.update((current) => nextSort(current, key));
  }

  /** «Ordenar por» of a phone: always ascending, as its labels say. */
  protected sortOnPhone(key: string): void {
    const choice = this.config.phoneSorts.find((option) => option.key === key);
    if (choice) this.sort.set({ key: choice.key, direction: 'asc' });
  }
}

/**
 * A list page whose state is asked to the BFF page by page with a cursor (TAR-324): the view, the
 * loaded items and what that read is going through, «Mostrar más» and «Reintentar». The page says
 * how a page is asked ({@link fetchPage}) and what it keeps from the answer
 * ({@link pageReceived}); its constructor ends with {@link start}.
 */
export abstract class PagedListPage<
  View extends string,
  Item,
  Page extends Paged<Item>,
  Filters extends { readonly search: string },
  Key extends string,
> extends ListFilterState<Filters, Key> {
  protected readonly view: WritableSignal<View>;
  protected readonly phoneSorts: ListPageConfig<Filters, Key>['phoneSorts'];
  protected readonly list = new PagedList<View, Item, Page>(
    (view, after) => this.fetchPage(view, after),
    (page, request) => {
      this.pageReceived(page, request);
    },
  );

  protected readonly phase = this.list.phase;
  protected readonly retrying = this.list.retrying;
  protected readonly loadingMore = this.list.loadingMore;
  protected readonly listFailed = this.list.firstFailed;
  protected readonly moreFailed = this.list.moreFailed;
  protected readonly nextCursor = this.list.nextCursor;
  protected readonly loadedCount = computed(() => this.list.items().length);

  protected constructor(
    private readonly initialView: View,
    config: ListPageConfig<Filters, Key>,
  ) {
    super(config);
    this.view = signal(initialView);
    this.phoneSorts = config.phoneSorts;
  }

  /** Asks the BFF the page of a view; `after` is the cursor, or null for the first one. */
  protected abstract fetchPage(view: View, after: string | null): Observable<Page>;

  /** A page that is still the current one arrived: what else a screen keeps from it (a count, a panel). */
  protected abstract pageReceived(page: Page, request: PageRequest<View>): void;

  /** Reads the first page and drops the answer in flight when the page is destroyed. */
  protected start(): void {
    inject(DestroyRef).onDestroy(() => {
      this.list.dispose();
    });
    this.list.reload(this.initialView);
  }

  protected chooseView(view: View): void {
    if (view === this.view()) return;
    this.view.set(view);
    this.clearFilters();
    this.sort.set(this.config.defaultSort);
    this.list.switchTo(view);
  }

  protected more(): void {
    this.list.more(this.view());
  }

  protected retry(): void {
    this.list.retry(this.view());
  }
}
