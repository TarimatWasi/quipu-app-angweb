import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AdminContractsService } from '../data/admin-contracts.service';
import type { ContractPage, ContractStatus } from '../model/contract';
import { summaryOf } from '../model/contract.testing';
import { ContractsListComponent } from './contracts-list.component';

const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();

const LUCIA = summaryOf({ id: 'c1', guestName: 'Lucía Paredes', endDate: '2027-03-31' });
const SOFIA = summaryOf({
  id: 'c3',
  guestName: 'Sofía Gutiérrez',
  environmentCode: '103',
  endDate: null,
});
const ROCIO = summaryOf({
  id: 'c2',
  guestName: 'Rocío Apaza',
  environmentCode: '202',
  endDate: '2026-11-25',
  expiringSoon: true,
});
const MARCO = summaryOf({
  id: 'c7',
  guestName: 'Marco Huanca',
  environmentCode: '207',
  status: 'EXPIRED',
  endDate: '2026-08-31',
});

const page = (
  content: ContractPage['content'],
  nextCursor: string | null = null,
): ContractPage => ({
  content,
  nextCursor,
});

interface Api {
  list: ReturnType<
    typeof vi.fn<(status: ContractStatus, after?: string) => Observable<ContractPage>>
  >;
  expiringSoon: ReturnType<typeof vi.fn<() => Observable<ContractPage>>>;
}

async function setup(
  answer: (status: ContractStatus) => Observable<ContractPage>,
  soon: Observable<ContractPage> = of(page([ROCIO])),
) {
  const api: Api = {
    list: vi.fn((status: ContractStatus) => answer(status)),
    expiringSoon: vi.fn(() => soon),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/contracts', component: ContractsListComponent }]),
      { provide: AdminContractsService, useValue: api },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await TestBed.inject(Router).navigateByUrl('/admin/contracts');
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
  };
  await settle();
  const view = () => within(harness.routeNativeElement ?? document.body);
  const table = () => within(view().getByRole('table', { name: 'Contratos' }));
  const guests = () =>
    table()
      .getAllByRole('rowheader')
      .map((header) => text(header.querySelector('strong') ?? header));
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle();
  };
  return { api, view, table, guests, click, settle };
}

const normal = (status: ContractStatus) =>
  of(
    status === 'ACTIVE'
      ? page([LUCIA, SOFIA, ROCIO])
      : status === 'EXPIRED'
        ? page([MARCO])
        : page([]),
  );

describe('A4 «Contratos»', () => {
  it('lists the Vigentes by when they end and says what is about to end', async () => {
    const { view, guests, table } = await setup(normal);

    expect(guests()).toEqual(['Rocío Apaza', 'Lucía Paredes', 'Sofía Gutiérrez']);
    const panel = view().getByRole('region', { name: 'Lo que toca ahora' });
    expect(text(panel)).toContain('contrato por vencer');
    expect(text(panel)).toContain('Rocío Apaza (habitación 202) vence el 25 nov');
    expect(within(panel).getByRole('link', { name: 'Ver contrato' }).getAttribute('href')).toBe(
      '/admin/contracts/c2',
    );
    expect(text(table().getByText('Sofía Gutiérrez').closest('tr') ?? document.body)).toContain(
      'sin fecha de fin',
    );
    expect(
      table()
        .getAllByRole('link', { name: /Ver contrato de/ })
        .map((link) => link.getAttribute('href')),
    ).toEqual(['/admin/contracts/c2', '/admin/contracts/c1', '/admin/contracts/c3']);
  });

  it('offers «Cargar contrato» and asks the other states when their tab is pressed', async () => {
    const { api, view, guests, click } = await setup(normal);

    expect(view().getAllByRole('link', { name: 'Cargar contrato' })[0]?.getAttribute('href')).toBe(
      '/admin/contracts/new',
    );
    await click(view().getByRole('button', { name: 'Vencidos' }));

    expect(api.list).toHaveBeenLastCalledWith('EXPIRED', undefined);
    expect(guests()).toEqual(['Marco Huanca']);
    expect(view().getByRole('region', { name: 'Lo que toca ahora' })).toBeTruthy();
    expect(view().queryByLabelText('Estado')).toBeNull();
  });

  it('narrows to «Próximo a vencer» and by search, and says so when nothing matches', async () => {
    const { view, guests, settle, click } = await setup(normal);

    const state = view().getByLabelText('Estado');
    fireEvent.change(state, { target: { value: 'SOON' } });
    fireEvent.input(state);
    await settle();
    expect(guests()).toEqual(['Rocío Apaza']);

    fireEvent.input(view().getByLabelText('Buscar'), { target: { value: 'nadie' } });
    await settle();
    const none = view().getByRole('region', { name: 'Ningún contrato coincide con los filtros.' });
    await click(within(none).getByRole('button', { name: 'Quitar filtros' }));
    expect(guests()).toHaveLength(3);
  });

  it('filters the list by the contracts about to end when there are several', async () => {
    const other = summaryOf({
      id: 'c9',
      guestName: 'Iván Ticona',
      expiringSoon: true,
      endDate: '2026-11-28',
    });
    const { view, guests, click } = await setup(
      () => of(page([LUCIA, ROCIO, other])),
      of(page([ROCIO, other])),
    );

    const panel = view().getByRole('region', { name: 'Lo que toca ahora' });
    expect(text(panel)).toContain('contratos por vencer');
    await click(within(panel).getByRole('button', { name: 'Ver por vencer' }));

    expect(guests()).toEqual(['Rocío Apaza', 'Iván Ticona']);
  });

  it('says nothing is about to end when the contracts about to end cannot be read', async () => {
    const { view, guests } = await setup(
      normal,
      throwError(() => new Error('down')),
    );

    expect(guests()).toHaveLength(3);
    const panel = view().getByRole('region', { name: 'Lo que toca ahora' });
    expect(panel.textContent).toContain('Ningún contrato vence pronto.');
    expect(within(panel).queryByRole('button')).toBeNull();
    expect(within(panel).queryByRole('link')).toBeNull();
  });

  it('asks the next page with the cursor of the BFF and keeps what is on screen', async () => {
    const { api, view, guests, click } = await setup((status) =>
      status === 'ACTIVE' ? of(page([LUCIA], 'c1')) : of(page([])),
    );
    api.list.mockReturnValueOnce(of(page([SOFIA])));

    await click(view().getByRole('button', { name: 'Mostrar más' }));

    expect(api.list).toHaveBeenLastCalledWith('ACTIVE', 'c1');
    expect(guests()).toEqual(['Lucía Paredes', 'Sofía Gutiérrez']);
  });

  it('says there are none, with what to do, while the skeleton gives way', async () => {
    const pending = new Subject<ContractPage>();
    const loading = await setup(() => pending, of(page([])));
    expect(loading.view().queryByRole('table', { name: 'Contratos' })).toBeNull();
    pending.next(page([]));
    pending.complete();
    await loading.settle();

    expect(loading.view().getByText('Aún no hay contratos vigentes.')).toBeTruthy();
    expect(
      loading
        .view()
        .getByText('Carga el primero con el PDF firmado: elige al huésped y su ambiente.'),
    ).toBeTruthy();
  });

  it('says it could not load and asks again on «Reintentar»', async () => {
    const { api, view, click } = await setup(() => throwError(() => new Error('down')));
    api.list.mockReturnValue(of(page([LUCIA])));

    expect(text(view().getByRole('alert'))).toContain('No se pudieron cargar los contratos.');
    await click(view().getByRole('button', { name: 'Reintentar' }));

    expect(view().getByRole('table', { name: 'Contratos' })).toBeTruthy();
  });
});
