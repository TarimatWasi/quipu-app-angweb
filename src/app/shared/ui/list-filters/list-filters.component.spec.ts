import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { fireEvent, within } from '@testing-library/dom';
import { ListFiltersComponent } from './list-filters.component';

@Component({
  imports: [ListFiltersComponent],
  template: `
    <app-list-filters
      idPrefix="pay"
      placeholder="Huésped o documento"
      sortKey="up"
      [searchable]="searchable()"
      [count]="count()"
      [filtered]="search() !== ''"
      [phoneSorts]="sorts"
      [(search)]="search"
      (clear)="search.set('')"
      (phoneSort)="sorted.set($event)"
    >
      <div class="quipu-field">
        <label for="pay-type">Tipo</label>
        <select id="pay-type"></select>
      </div>
    </app-list-filters>
  `,
})
class HostComponent {
  readonly search = signal('');
  readonly searchable = signal(true);
  readonly count = signal('Mostrando 4 de 4');
  readonly sorted = signal<string | null>(null);
  readonly sorts = [
    { key: 'up', label: 'Subido' },
    { key: 'name', label: 'Huésped' },
  ];
}

describe('ListFiltersComponent', () => {
  it('leaves «Buscar» out when the rows have nothing to look for, and keeps the rest', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.searchable.set(false);
    await fixture.whenStable();
    const ui = within(fixture.nativeElement as HTMLElement);

    expect(ui.queryByRole('searchbox')).toBeNull();
    expect(ui.getByLabelText('Tipo')).toBeTruthy();
    expect(ui.getByText('Mostrando 4 de 4')).toBeTruthy();
  });

  it('searches, shows the count, clears the filters and reports the order of a phone', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const ui = within(fixture.nativeElement as HTMLElement);
    const host = fixture.componentInstance;

    expect(ui.getByLabelText('Tipo')).toBeTruthy();
    expect(ui.getByText('Mostrando 4 de 4').closest('output')?.getAttribute('aria-live')).toBe(
      'polite',
    );
    expect(ui.queryByRole('button', { name: 'Quitar filtros' })).toBeNull();

    const search = ui.getByRole<HTMLInputElement>('searchbox', { name: 'Buscar' });
    expect(search.placeholder).toBe('Huésped o documento');
    fireEvent.input(search, { target: { value: 'ana' } });
    await fixture.whenStable();
    expect(host.search()).toBe('ana');

    fireEvent.click(ui.getByRole('button', { name: 'Quitar filtros' }));
    await fixture.whenStable();
    expect(host.search()).toBe('');
    expect(search.value).toBe('');

    const order = ui.getByLabelText<HTMLSelectElement>('Ordenar por');
    expect(order.value).toBe('up');
    order.value = 'name';
    fireEvent.change(order);
    expect(host.sorted()).toBe('name');
  });
});
