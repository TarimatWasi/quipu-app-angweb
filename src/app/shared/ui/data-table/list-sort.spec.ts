import { ariaSort, compareBy, nextSort } from './list-sort';

describe('list sort', () => {
  it('turns the same column around and starts another one ascending', () => {
    expect(nextSort({ key: 'a', direction: 'asc' }, 'a')).toEqual({ key: 'a', direction: 'desc' });
    expect(nextSort({ key: 'a', direction: 'desc' }, 'a')).toEqual({ key: 'a', direction: 'asc' });
    expect(nextSort({ key: 'a', direction: 'desc' }, 'b')).toEqual({ key: 'b', direction: 'asc' });
  });

  it('says aria-sort only of the column that orders the list', () => {
    expect(ariaSort({ key: 'a', direction: 'asc' }, 'a')).toBe('ascending');
    expect(ariaSort({ key: 'a', direction: 'desc' }, 'a')).toBe('descending');
    expect(ariaSort({ key: 'a', direction: 'asc' }, 'b')).toBeNull();
    expect(ariaSort(null, 'a')).toBeNull();
  });

  it('compares by the column, turned around when descending, and breaks ties ascending', () => {
    const rows = [
      { n: 2, name: 'b' },
      { n: 1, name: 'z' },
      { n: 2, name: 'a' },
    ];
    const compare = { n: (x: (typeof rows)[number], y: (typeof rows)[number]) => x.n - y.n };
    const byName = (x: (typeof rows)[number], y: (typeof rows)[number]) =>
      x.name.localeCompare(y.name);
    const desc = [...rows].sort(compareBy(compare, { key: 'n', direction: 'desc' }, byName));
    expect(desc.map((row) => row.name)).toEqual(['a', 'b', 'z']);
    const asc = [...rows].sort(compareBy(compare, { key: 'n', direction: 'asc' }));
    expect(asc.map((row) => row.n)).toEqual([1, 2, 2]);
  });
});
