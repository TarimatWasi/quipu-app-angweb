/** How a list is ordered (A3, A3.2, A5): by one of its columns, one way or the other. */

export type SortDirection = 'asc' | 'desc';

export interface ListSort<K extends string = string> {
  readonly key: K;
  readonly direction: SortDirection;
}

/** A header pressed: the same column turns around; another one starts ascending. */
export function nextSort<K extends string>(current: ListSort<K>, key: K): ListSort<K> {
  if (current.key !== key) return { key, direction: 'asc' };
  return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
}

/** What `aria-sort` says of a column: its direction while it orders the list, nothing otherwise. */
export function ariaSort<K extends string>(
  sort: ListSort<K> | null,
  key: K,
): 'ascending' | 'descending' | null {
  if (sort?.key !== key) return null;
  return sort.direction === 'asc' ? 'ascending' : 'descending';
}

/**
 * The comparison of a sort: the column's own, turned around when descending, and `tieBreak`
 * (always ascending) when two rows are equal on it.
 */
export function compareBy<T, K extends string>(
  compare: Readonly<Record<K, (a: T, b: T) => number>>,
  sort: ListSort<K>,
  tieBreak: (a: T, b: T) => number = () => 0,
): (a: T, b: T) => number {
  const sign = sort.direction === 'asc' ? 1 : -1;
  return (a, b) => sign * compare[sort.key](a, b) || tieBreak(a, b);
}

/** The order the phone offers in «Ordenar por», where the table has its sortable headers. */
export interface PhoneSort<K extends string = string> {
  readonly key: K;
  readonly label: string;
}
