import { SkeletonBlockComponent, SkeletonCell } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { DataSkeletonCardDirective } from './data-skeleton-card.directive';
import { DataSkeletonCellDirective } from './data-skeleton-cell.directive';
import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  contentChild,
  contentChildren,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { ColumnWidthDirective } from './column-width.directive';
import { DataCardDirective } from './data-card.directive';
import { DataCellDirective } from './data-cell.directive';
import { DataFooterDirective } from './data-footer.directive';
import { ariaSort } from './list-sort';
import type { ListSort } from './list-sort';

/** The width of the column with the buttons of a row. */
export const ACTION_WIDTH = '9rem';

/** The width of each column of the table (`<col>`), the same with skeleton rows or with data. */
export function columnWidths(columns: readonly DataColumn[]): string[] {
  const fixed = columns.map((c) => c.width ?? (c.align === 'action' ? ACTION_WIDTH : null));
  const parts = columns.map((c, i) => (fixed[i] === null ? (c.grow ?? (c.rowHeader ? 2 : 1)) : 0));
  const total = parts.reduce((sum, part) => sum + part, 0);
  const lengths = fixed.filter((width): width is string => width !== null);
  const rest = lengths.length > 0 ? `(100% - (${lengths.join(' + ')}))` : '100%';
  return columns.map((_, i) => {
    const width = fixed[i];
    return width ?? `calc(${rest} * ${String(parts[i])} / ${String(total)})`;
  });
}

/** One column of `app-data-table`. */
export interface DataColumn<K extends string = string> {
  readonly key: K;
  readonly skeleton?: SkeletonCell;
  /** The header; with `hiddenLabel` it is read by a screen reader only («Acción»). */
  readonly label: string;
  readonly hiddenLabel?: boolean;
  /** Its header is a button that orders the list by it (`.quipu-sort`). */
  readonly sortable?: boolean;
  /** The cell is the `<th scope="row">` that names the row (the guest, the month). */
  readonly rowHeader?: boolean;
  /** Figures go to the right; `action` to the right and on one line. */
  readonly align?: 'start' | 'end' | 'action';
  /**
   * A fixed width (`9rem`, `80px`) for a column that does not depend on the data. The action
   * column has one by default (`ACTION_WIDTH`).
   */
  readonly width?: string;
  /**
   * How much of the rest of the width the column takes, in parts (TAR-319): 2 for the one that
   * names the row, 1 for the others. A column that carries long text (an email, who occupies an
   * environment) asks for more.
   */
  readonly grow?: number;
}

/**
 * P-08 Tabla (TAR-297): the list of a screen as the canvas draws it, with its sortable headers
 * and, when the screen gives a card (`appDataCard`), one card per row on a phone. The screen gives
 * the content of each column (`appDataCell`) and, if any, of the last row (`appDataFooter`); the
 * table brings the structure, the order and its accessibility (`caption`, `scope`, `aria-sort`).
 */
@Component({
  selector: 'app-data-table',
  imports: [
    ColumnWidthDirective,
    NgTemplateOutlet,
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonBlockComponent,
  ],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
})
export class DataTableComponent<T, K extends string = string> {
  /** Initial loading only; refreshes and pagination retain the real content. */
  readonly loading = input(false);
  /** Optional decorative filters or toolbar, governed by the same loading timer. */
  readonly skeletonBefore = input<TemplateRef<unknown> | null>(null);
  readonly skeletonRows = input(5);
  protected readonly placeholders = computed(() =>
    Array.from(
      { length: Math.min(20, Math.max(1, Math.trunc(this.skeletonRows()) || 5)) },
      (_, index) => index,
    ),
  );
  readonly columns = input.required<readonly DataColumn<K>[]>();
  readonly rows = input.required<readonly T[]>();
  /** A stable id of each row, for `track`. */
  readonly rowId = input.required<(row: T) => string>();
  /** The name of the table and of its cards, read by a screen reader. */
  readonly caption = input.required<string>();
  /** The order shown by the headers; null when the screen does not order the list. */
  readonly sort = input<ListSort<K> | null>(null);
  /** A sortable header was pressed; the screen orders the rows. */
  readonly sortBy = output<K>();

  protected readonly skeletonCard = contentChild(DataSkeletonCardDirective);
  private readonly skeletonCells = contentChildren(DataSkeletonCellDirective);
  private readonly cells = contentChildren(DataCellDirective);
  private readonly cardTemplate = contentChild(DataCardDirective);
  private readonly footerTemplate = contentChild(DataFooterDirective);

  protected readonly card = computed(() => this.cardTemplate()?.template ?? null);
  protected readonly footer = computed(() => this.footerTemplate()?.template ?? null);
  protected readonly headers = computed(() => {
    const sort = this.sort();
    const templates = new Map(this.cells().map((cell) => [cell.appDataCell(), cell.template]));
    const skeletons = new Map(
      this.skeletonCells().map((cell) => [cell.appDataSkeletonCell(), cell.template]),
    );
    const widths = columnWidths(this.columns());
    return this.columns().map((column, index) => {
      const active = sort?.key === column.key;
      return {
        ...column,
        skeletonTemplate: skeletons.get(column.key) ?? null,
        active,
        down: active && sort.direction === 'desc',
        ariaSort: column.sortable ? ariaSort(sort, column.key) : null,
        template: templates.get(column.key) ?? null,
        columnWidth: widths[index],
      };
    });
  });
}
