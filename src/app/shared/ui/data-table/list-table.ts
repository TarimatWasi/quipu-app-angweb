import { Directive, input, output, Signal, TemplateRef } from '@angular/core';
import type { DataColumn } from './data-table.component';
import type { ListSort } from './list-sort';

/**
 * What every table of a list shares (TAR-322): its rows, the skeleton while it loads and the key
 * of each row. A table extends it, says its columns and its cells, and nothing else.
 */
@Directive()
export abstract class ListTable<Row> {
  readonly loading = input(false);
  /** Decorative filters or toolbar the skeleton shows before the rows. */
  readonly skeletonBefore = input<TemplateRef<unknown> | null>(null);
  readonly rows = input.required<readonly Row[]>();

  protected abstract readonly rowId: (row: Row) => string;
}

/**
 * A table whose headers order the list: the order it shows and the header pressed. The columns
 * that sort are the ones that say `sortable`, so the table does not repeat that rule.
 */
@Directive()
export abstract class SortableListTable<
  Row,
  Key extends string,
  Column extends string = Key,
> extends ListTable<Row> {
  readonly sort = input.required<ListSort<Key>>();
  /** A sortable header was pressed. */
  readonly sortBy = output<Key>();

  /** The columns, given or computed (a table whose columns depend on a tab). */
  protected abstract readonly columns:
    readonly DataColumn<Column>[] | Signal<readonly DataColumn<Column>[]>;

  protected sorted(key: Column): void {
    const columns = typeof this.columns === 'function' ? this.columns() : this.columns;
    if (columns.some((column) => column.key === key && column.sortable)) {
      this.sortBy.emit(key as unknown as Key);
    }
  }
}
