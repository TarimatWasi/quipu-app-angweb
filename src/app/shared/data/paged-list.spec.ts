import { Observable, of, Subject, throwError } from 'rxjs';
import { PagedList } from './paged-list';
import type { Paged } from './paged-list';

type View = 'A' | 'B';

const page = (content: string[], nextCursor: string | null = null): Paged<string> => ({
  content,
  nextCursor,
});

/** Lets the promise of the read settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(answer: (query: View, after: string | null) => Observable<Paged<string>>) {
  const fetch = vi.fn(answer);
  const seen: Paged<string>[] = [];
  const list = new PagedList<View, string>(fetch, (received) => {
    seen.push(received);
  });
  return { fetch, seen, list };
}

describe('PagedList', () => {
  it('is loading until its first page arrives, then keeps the items and the cursor', async () => {
    const first = new Subject<Paged<string>>();
    const { list } = setup(() => first);

    list.reload('A');
    expect(list.phase()).toBe('loading');
    first.next(page(['a1', 'a2'], 'c1'));
    first.complete();
    await settle();

    expect(list.phase()).toBe('ready');
    expect(list.items()).toEqual(['a1', 'a2']);
    expect(list.nextCursor()).toBe('c1');
  });

  it('asks the next page with the cursor it was given and adds it to what is on screen', async () => {
    const { fetch, list } = setup((_query, after) =>
      of(after === null ? page(['a1'], 'c1') : page(['a2'], null)),
    );
    list.reload('A');
    await settle();

    list.more('A');
    await settle();

    expect(fetch).toHaveBeenLastCalledWith('A', 'c1');
    expect(list.items()).toEqual(['a1', 'a2']);
    expect(list.nextCursor()).toBeNull();
    list.more('A');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('does not ask for more while a page is being read', async () => {
    const pending = new Subject<Paged<string>>();
    const { fetch, list } = setup((_query, after) =>
      after === null ? of(page(['a1'], 'c1')) : pending,
    );
    list.reload('A');
    await settle();

    list.more('A');
    list.more('A');

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(list.loadingMore()).toBe(true);
  });

  it('starts another query empty and loading, without the cursor of the previous one', async () => {
    const second = new Subject<Paged<string>>();
    const { list } = setup((query) => (query === 'A' ? of(page(['a1'], 'c1')) : second));
    list.reload('A');
    await settle();

    list.switchTo('B');

    expect(list.items()).toEqual([]);
    expect(list.nextCursor()).toBeNull();
    expect(list.phase()).toBe('loading');
    second.next(page(['b1']));
    second.complete();
    await settle();
    expect(list.items()).toEqual(['b1']);
  });

  it('keeps what is on screen while a refresh of the same query is read', async () => {
    const refresh = new Subject<Paged<string>>();
    let calls = 0;
    const { list } = setup(() => (calls++ === 0 ? of(page(['a1'], 'c1')) : refresh));
    list.reload('A');
    await settle();

    list.reload('A');

    expect(list.items()).toEqual(['a1']);
    expect(list.nextCursor()).toBeNull();
    refresh.next(page(['a9']));
    refresh.complete();
    await settle();
    expect(list.items()).toEqual(['a9']);
  });

  it('drops the answer of a read that another one replaced', async () => {
    const slow = new Subject<Paged<string>>();
    const { list } = setup((query) => (query === 'A' ? slow : of(page(['b1']))));
    list.reload('A');

    list.switchTo('B');
    await settle();
    slow.next(page(['a1']));
    slow.complete();
    await settle();

    expect(list.items()).toEqual(['b1']);
  });

  it('says its first page failed and asks it again on retry', async () => {
    let fail = true;
    const { fetch, list } = setup(() =>
      fail ? throwError(() => new Error('down')) : of(page(['a1'])),
    );
    list.reload('A');
    await settle();
    expect(list.phase()).toBe('error');
    expect(list.firstFailed()).toBe(true);

    fail = false;
    list.retry('A');
    await settle();

    expect(fetch).toHaveBeenLastCalledWith('A', null);
    expect(list.phase()).toBe('ready');
    expect(list.firstFailed()).toBe(false);
  });

  it('asks the page that failed again, with its cursor, and keeps the items', async () => {
    let failMore = true;
    const { fetch, list } = setup((_query, after) =>
      after === null
        ? of(page(['a1'], 'c1'))
        : failMore
          ? throwError(() => new Error('down'))
          : of(page(['a2'])),
    );
    list.reload('A');
    await settle();
    list.more('A');
    await settle();
    expect(list.moreFailed()).toBe(true);
    expect(list.items()).toEqual(['a1']);

    failMore = false;
    list.retry('A');
    await settle();

    expect(fetch).toHaveBeenLastCalledWith('A', 'c1');
    expect(list.items()).toEqual(['a1', 'a2']);
    expect(list.moreFailed()).toBe(false);
  });

  it('asks the first page of the current query when the one that failed is another', async () => {
    const { fetch, list } = setup((query) =>
      query === 'A' ? throwError(() => new Error('down')) : of(page(['b1'])),
    );
    list.reload('A');
    await settle();

    list.retry('B');
    await settle();

    expect(fetch).toHaveBeenLastCalledWith('B', null);
    expect(list.items()).toEqual(['b1']);
  });

  it('tells the screen about each page that is still the current one', async () => {
    const { seen, list } = setup((_query, after) =>
      of(after === null ? page(['a1'], 'c1') : page(['a2'])),
    );
    list.reload('A');
    await settle();
    list.more('A');
    await settle();

    expect(seen.map((received) => received.content)).toEqual([['a1'], ['a2']]);
  });

  it('accepts no answer once it is disposed', async () => {
    const pending = new Subject<Paged<string>>();
    const { seen, list } = setup(() => pending);
    list.reload('A');

    list.dispose();
    pending.next(page(['a1']));
    pending.complete();
    await settle();

    expect(list.items()).toEqual([]);
    expect(seen).toEqual([]);
  });
});
