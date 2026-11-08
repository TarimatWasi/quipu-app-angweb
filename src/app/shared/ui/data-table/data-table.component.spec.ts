import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { DataSkeletonCellDirective } from './data-skeleton-cell.directive';
import { DataSkeletonCardDirective } from './data-skeleton-card.directive';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, within } from '@testing-library/dom';
import { DataCardDirective } from './data-card.directive';
import { DataCellDirective } from './data-cell.directive';
import { DataFooterDirective } from './data-footer.directive';
import { columnWidths, DataTableComponent } from './data-table.component';
import type { DataColumn } from './data-table.component';
import type { ListSort } from './list-sort';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly amount: string;
}

type Key = 'name' | 'amount' | 'action';

const COLUMNS: readonly DataColumn<Key>[] = [
  { key: 'name', label: 'Nombre', sortable: true, rowHeader: true },
  { key: 'amount', label: 'Monto', sortable: true, align: 'end' },
  { key: 'action', label: 'Acción', hiddenLabel: true, align: 'action' },
];

@Component({
  imports: [
    DataCardDirective,
    DataCellDirective,
    DataFooterDirective,
    DataTableComponent,
    SkeletonBlockComponent,
    DataSkeletonCardDirective,
    DataSkeletonCellDirective,
  ],
  template: `
    <app-data-table
      [loading]="loading()"
      [skeletonRows]="2"
      caption="Pagos"
      [columns]="columns"
      [rows]="rows()"
      [rowId]="rowId"
      [sort]="sort()"
      (sortBy)="pressed.set($event)"
    >
      @if (customSkeleton()) {
        <ng-template appDataSkeletonCell="name"><app-skeleton-block shape="circle" /></ng-template>
        <ng-template appDataSkeletonCard><app-skeleton-block shape="badge" /></ng-template>
      }
      <ng-template appDataCell="name" [appDataCellRows]="rows()" let-row>{{
        row.name
      }}</ng-template>
      <ng-template appDataCell="amount" [appDataCellRows]="rows()" let-row>{{
        row.amount
      }}</ng-template>
      <ng-template appDataCell="action" [appDataCellRows]="rows()" let-i="index"
        ><a href="/x">Ver {{ i + 1 }}</a></ng-template
      >
      @if (cards()) {
        <ng-template appDataCard [appDataCardRows]="rows()" let-row
          ><p>Tarjeta de {{ row.name }}</p></ng-template
        >
      }
      <ng-template appDataFooter
        ><th scope="row">Total</th>
        <td>S/ 30.00</td>
        <td></td
      ></ng-template>
    </app-data-table>
  `,
})
class HostComponent {
  readonly loading = signal(false);
  readonly customSkeleton = signal(false);
  readonly columns = COLUMNS;
  readonly rows = signal<readonly Row[]>([
    { id: 'a', name: 'Ana', amount: 'S/ 10.00' },
    { id: 'b', name: 'Luis', amount: 'S/ 20.00' },
  ]);
  readonly sort = signal<ListSort<Key> | null>({ key: 'amount', direction: 'desc' });
  readonly cards = signal(true);
  readonly pressed = signal<Key | null>(null);
  readonly rowId = (row: Row): string => row.id;
}

async function setup() {
  const fixture = TestBed.createComponent(HostComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  return { fixture, host: fixture.componentInstance, root, ui: within(root) };
}

describe('DataTableComponent (P-08)', () => {
  it('names the table and its rows, with each column as the screen draws it', async () => {
    const { ui } = await setup();
    const table = ui.getByRole('table', { name: 'Pagos' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    expect(
      within(table)
        .getAllByRole('rowheader')
        .map((cell) => cell.textContent.trim()),
    ).toEqual(['Ana', 'Luis', 'Total']);
    expect(within(table).getByRole('link', { name: 'Ver 2' })).toBeTruthy();
    expect(within(table).getByRole('columnheader', { name: 'Acción' })).toBeTruthy();
    expect(table.querySelector('tfoot')?.textContent).toContain('S/ 30.00');
  });

  it('says the order with aria-sort and reports the header pressed', async () => {
    const { ui, host, fixture } = await setup();
    const amount = ui.getByRole('columnheader', { name: 'Monto' });
    expect(amount.getAttribute('aria-sort')).toBe('descending');
    expect(amount.classList).toContain('align-end');
    expect(ui.getByRole('columnheader', { name: 'Nombre' }).getAttribute('aria-sort')).toBeNull();
    expect(ui.getByRole('columnheader', { name: 'Acción' }).getAttribute('aria-sort')).toBeNull();

    fireEvent.click(ui.getByRole('button', { name: 'Nombre' }));
    await fixture.whenStable();
    expect(host.pressed()).toBe('name');
  });

  it('draws a card per row on a phone when the screen gives one, and only the table without it', async () => {
    const { ui, host, fixture, root } = await setup();
    expect(ui.getByRole('list', { name: 'Pagos' }).querySelectorAll('li')).toHaveLength(2);
    expect(ui.getByText('Tarjeta de Luis')).toBeTruthy();
    expect(root.querySelector('.quipu-table-wrap')?.classList).toContain('quipu-only-wide');

    host.cards.set(false);
    await fixture.whenStable();
    expect(ui.queryByRole('list')).toBeNull();
    expect(root.querySelector('.quipu-table-wrap')?.classList).not.toContain('quipu-only-wide');
  });
  it('shows decorative cells at once, disables sorting, then restores real data without timers', async () => {
    const { host, fixture, root, ui } = await setup();
    vi.useFakeTimers();
    try {
      host.loading.set(true);
      fixture.detectChanges();
      expect(ui.getByRole('region', { name: 'Cargando Pagos' }).getAttribute('aria-busy')).toBe(
        'true',
      );
      expect(root.querySelectorAll('tbody tr')).toHaveLength(2);
      expect(root.querySelectorAll('tbody td')).toHaveLength(6);
      expect(root.querySelector('tfoot')).toBeNull();
      expect(root.querySelector('a')).toBeNull();
      expect(root.querySelector('button')?.disabled).toBe(true);
      expect(ui.queryByRole('table')).toBeNull();
      expect(root.querySelector('app-skeleton-block')?.getAttribute('aria-hidden')).toBe('true');
      expect(root.querySelectorAll('.quipu-card app-skeleton-block')).toHaveLength(6);
      host.loading.set(false);
      fixture.detectChanges();
      expect(ui.getByRole('table', { name: 'Pagos' })).toBeTruthy();
      expect(ui.getByRole('link', { name: 'Ver 1' })).toBeTruthy();
      expect(root.querySelector('app-skeleton-block')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('accepts custom cell and mobile layouts and shows the skeleton again for a new load', async () => {
    const { host, fixture, root } = await setup();
    vi.useFakeTimers();
    try {
      host.customSkeleton.set(true);
      host.loading.set(true);
      fixture.detectChanges();
      expect(root.querySelectorAll('tbody [data-shape="circle"]')).toHaveLength(2);
      expect(root.querySelectorAll('.quipu-card [data-shape="badge"]')).toHaveLength(2);
      host.loading.set(false);
      fixture.detectChanges();
      host.loading.set(true);
      fixture.detectChanges();
      expect(root.querySelector('tbody')).not.toBeNull();
      fixture.destroy();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('widths of the columns (TAR-319)', () => {
    function render(columns: readonly DataColumn<Key>[]) {
      const fixture = TestBed.createComponent<DataTableComponent<Row, Key>>(DataTableComponent);
      fixture.componentRef.setInput('columns', columns);
      fixture.componentRef.setInput('rows', []);
      fixture.componentRef.setInput('rowId', (row: Row) => row.id);
      fixture.componentRef.setInput('caption', 'Pagos');
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('always has a fixed layout and a width for each column, with skeleton or with data', () => {
      const root = render(COLUMNS);

      expect(root.querySelector('table')?.classList).toContain('quipu-table--fixed');
      expect(root.querySelectorAll('col')).toHaveLength(COLUMNS.length);
    });

    it('gives the action column its width and shares the rest, twice for the one that names the row', () => {
      expect(columnWidths(COLUMNS)).toEqual([
        'calc((100% - (9rem)) * 2 / 3)',
        'calc((100% - (9rem)) * 1 / 3)',
        '9rem',
      ]);
    });

    it('lets a column with long text ask for more and another keep a fixed width', () => {
      expect(
        columnWidths([
          { key: 'a', label: 'A', rowHeader: true },
          { key: 'b', label: 'B', grow: 3 },
          { key: 'c', label: 'C', width: '6rem' },
          { key: 'd', label: 'D', align: 'action' },
        ]),
      ).toEqual([
        'calc((100% - (6rem + 9rem)) * 2 / 5)',
        'calc((100% - (6rem + 9rem)) * 3 / 5)',
        '6rem',
        '9rem',
      ]);
      expect(columnWidths([{ key: 'a', label: 'A' }])).toEqual(['calc(100% * 1 / 1)']);
    });
  });
});
