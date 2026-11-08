import { Directive, input } from '@angular/core';

/** The width a column of `app-data-table` gives (TAR-319), on its `<col>`. */
@Directive({
  selector: 'col[appColumnWidth]',
  host: { '[style.width]': 'appColumnWidth()' },
})
export class ColumnWidthDirective {
  readonly appColumnWidth = input<string>();
}
