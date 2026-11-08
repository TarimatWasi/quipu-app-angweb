import { TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { ListFilterState, PagedListPage } from './list-page';
import type { Paged } from '@shared/data/paged-list';
import type { ListSort } from '@shared/ui/data-table/list-sort';

interface Filters {
  readonly search: string;
  readonly type: 'ALL' | 'ROOM';
}
type Key = 'code' | 'type';

const NO_FILTERS: Filters = { search: '', type: 'ALL' };
const DEFAULT_SORT: ListSort<Key> = { key: 'code', direction: 'asc' };
const CONFIG = {
  noFilters: NO_FILTERS,
  defaultSort: DEFAULT_SORT,
  phoneSorts: [
    { key: 'code' as const, label: 'Código' },
    { key: 'type' as const, label: 'Tipo' },
  ],
};

class FilterPage extends ListFilterState<Filters, Key> {
  constructor() {
    super(CONFIG);
  }
  readonly state = {
    filters: () => this.filters(),
    sort: () => this.sort(),
    search: (text: string) => {
      this.searchFor(text);
    },
    clear: () => {
      this.clearFilters();
    },
    sortBy: (key: Key) => {
      this.sortBy(key);
    },
    phone: (key: string) => {
      this.sortOnPhone(key);
    },
    setType: () => {
      this.filters.update((filters) => ({ ...filters, type: 'ROOM' }));
    },
  };
}

interface Item {
  readonly id: string;
}
type Page = Paged<Item>;

class ListPage extends PagedListPage<'ACTIVE' | 'INACTIVE', Item, Page, Filters, Key> {
  readonly asked: [string, string | null][] = [];
  readonly received: string[] = [];
  constructor() {
    super('ACTIVE', CONFIG);
    this.start();
  }
  protected fetchPage(view: 'ACTIVE' | 'INACTIVE', after: string | null): Observable<Page> {
    this.asked.push([view, after]);
    return of({ content: [{ id: view }], nextCursor: after === null ? 'next' : null });
  }
  protected pageReceived(page: Page): void {
    this.received.push(page.content[0]?.id ?? '');
  }
  readonly state = {
    view: () => this.view(),
    items: () => this.list.items().map((item) => item.id),
    filters: () => this.filters(),
    sort: () => this.sort(),
    choose: (view: 'ACTIVE' | 'INACTIVE') => {
      this.chooseView(view);
    },
    search: (text: string) => {
      this.searchFor(text);
    },
    sortBy: (key: Key) => {
      this.sortBy(key);
    },
    more: () => {
      this.more();
    },
    cursor: () => this.nextCursor(),
  };
}

describe('ListFilterState (TAR-324)', () => {
  const make = () => TestBed.runInInjectionContext(() => new FilterPage()).state;

  it('starts with nothing filtered and the order the page gives', () => {
    const page = make();

    expect(page.filters()).toEqual(NO_FILTERS);
    expect(page.sort()).toEqual(DEFAULT_SORT);
  });

  it('searches, keeps the other filters and clears them all', () => {
    const page = make();
    page.setType();
    page.search('rosa');

    expect(page.filters()).toEqual({ search: 'rosa', type: 'ROOM' });
    page.clear();
    expect(page.filters()).toEqual(NO_FILTERS);
  });

  it('turns the same column around and starts another one ascending', () => {
    const page = make();

    page.sortBy('code');
    expect(page.sort()).toEqual({ key: 'code', direction: 'desc' });
    page.sortBy('type');
    expect(page.sort()).toEqual({ key: 'type', direction: 'asc' });
  });

  it('orders on a phone always ascending and ignores a key it does not offer', () => {
    const page = make();
    page.sortBy('code');
    page.phone('type');

    expect(page.sort()).toEqual({ key: 'type', direction: 'asc' });
    page.phone('other');
    expect(page.sort()).toEqual({ key: 'type', direction: 'asc' });
  });
});

describe('PagedListPage (TAR-324)', () => {
  const make = () => TestBed.runInInjectionContext(() => new ListPage());
  // The pages arrive on the next turn of the event loop: wait for what the page shows.
  const arrived = async (page: ListPage, items: string[]) => {
    await vi.waitFor(() => {
      expect(page.state.items()).toEqual(items);
    });
  };

  it('asks the first page of its view when it starts and tells the page what arrived', async () => {
    const page = make();
    await arrived(page, ['ACTIVE']);

    expect(page.asked).toEqual([['ACTIVE', null]]);
    expect(page.received).toEqual(['ACTIVE']);
  });

  it('asks the next page with its cursor', async () => {
    const page = make();
    await arrived(page, ['ACTIVE']);
    await vi.waitFor(() => {
      expect(page.state.cursor()).toBe('next');
    });
    page.state.more();

    expect(page.asked.at(-1)).toEqual(['ACTIVE', 'next']);
  });

  it('changes the view: filters and order start again and the first page of the new one is asked', async () => {
    const page = make();
    await arrived(page, ['ACTIVE']);
    page.state.search('rosa');
    page.state.sortBy('type');
    page.state.choose('INACTIVE');

    expect(page.state.view()).toBe('INACTIVE');
    expect(page.state.filters()).toEqual(NO_FILTERS);
    expect(page.state.sort()).toEqual(DEFAULT_SORT);
    expect(page.asked.at(-1)).toEqual(['INACTIVE', null]);
    await arrived(page, ['INACTIVE']);
  });

  it('does nothing when the view chosen is the one already shown', async () => {
    const page = make();
    await arrived(page, ['ACTIVE']);
    const before = page.asked.length;
    page.state.choose('ACTIVE');

    expect(page.asked).toHaveLength(before);
  });
});
