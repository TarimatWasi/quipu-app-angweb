import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, screen, within } from '@testing-library/dom';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ToastService } from '@shared/ui/toast/toast.service';
import { AdminEnvironmentsService } from '../data/admin-environments.service';
import type { EnvironmentPage, EnvironmentStatus } from '../model/environment';
import { contractOf, environmentOf, stayOf } from '../model/environment.testing';
import { EnvironmentsListComponent } from './environments-list.component';

const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();

const FREE = environmentOf({ id: 'e109', code: '109' });
const BUSY = environmentOf({
  id: 'e201',
  code: '201',
  occupant: contractOf({ guestName: 'Ana Quispe' }),
  freeSince: null,
});
const CABIN = environmentOf({
  id: 'ec2',
  code: 'C2',
  type: 'CABIN',
  occupant: stayOf(),
  freeSince: null,
});
const OFF = environmentOf({
  id: 'e208',
  code: '208',
  status: 'INACTIVE',
  deactivatedAt: '2026-09-02T15:00:00Z',
  freeSince: null,
});

const page = (
  content: EnvironmentPage['content'],
  fields: Partial<EnvironmentPage> = {},
): EnvironmentPage => ({ content, nextCursor: null, freeCount: 1, ...fields });

interface Api {
  list: ReturnType<
    typeof vi.fn<(status: EnvironmentStatus, after?: string) => Observable<EnvironmentPage>>
  >;
  deactivate: ReturnType<typeof vi.fn<(id: string) => Observable<unknown>>>;
  reactivate: ReturnType<typeof vi.fn<(id: string) => Observable<unknown>>>;
}

async function setup(answer: (status: EnvironmentStatus) => Observable<EnvironmentPage>) {
  const api: Api = {
    list: vi.fn((status: EnvironmentStatus) => answer(status)),
    deactivate: vi.fn(() => of(null)),
    reactivate: vi.fn(() => of(null)),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'admin/environments', component: EnvironmentsListComponent }]),
      { provide: AdminEnvironmentsService, useValue: api },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await TestBed.inject(Router).navigateByUrl('/admin/environments');
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
  };
  await settle();
  const toast = vi.spyOn(TestBed.inject(ToastService), 'show');
  const view = () => within(harness.routeNativeElement ?? document.body);
  const table = () => within(view().getByRole('table', { name: 'Ambientes' }));
  const codes = () =>
    table()
      .getAllByRole('rowheader')
      .map((header) => text(header));
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle();
  };
  return { api, view, table, codes, click, settle, toast };
}

const normal = (status: EnvironmentStatus) =>
  of(status === 'ACTIVE' ? page([BUSY, FREE, CABIN]) : page([OFF], { freeCount: 0 }));

describe('A2 «Ambientes»', () => {
  it('shows how many are free, and the environments by code with who is in them', async () => {
    const { view, codes, table } = await setup(normal);

    const panel = view().getByRole('region', { name: 'Lo que toca ahora' });
    expect(text(panel)).toContain('ambiente libre');
    expect(text(panel)).toContain('Habitación 109');
    expect(codes()).toEqual(['109', '201', 'C2']);
    expect(text(table().getByText('Ana Quispe').closest('td') ?? document.body)).toContain(
      'contrato hasta 31 mar 2027',
    );
  });

  it('asks the inactive ones when «Inactivos» is pressed, and leaves out the panel and Ocupación', async () => {
    const { api, view, table, codes, click } = await setup(normal);

    await click(view().getByRole('button', { name: 'Inactivos' }));

    expect(api.list).toHaveBeenLastCalledWith('INACTIVE', undefined);
    expect(codes()).toEqual(['208']);
    expect(view().queryByRole('region', { name: 'Lo que toca ahora' })).toBeNull();
    expect(view().queryByLabelText('Ocupación')).toBeNull();
    expect(table().getByRole('button', { name: 'Reactivar Habitación 208' })).toBeTruthy();
  });

  it('narrows by occupancy and by search, and says so when nothing matches', async () => {
    const { view, codes, settle, click } = await setup(normal);

    const occupancy = view().getByLabelText('Ocupación');
    fireEvent.change(occupancy, { target: { value: 'BUSY' } });
    fireEvent.input(occupancy);
    await settle();
    expect(codes()).toEqual(['201', 'C2']);

    fireEvent.input(view().getByLabelText('Buscar'), { target: { value: 'nadie' } });
    await settle();
    expect(view().getByText('Ningún ambiente coincide con los filtros.')).toBeTruthy();

    const none = view().getByRole('region', { name: 'Ningún ambiente coincide con los filtros.' });
    await click(within(none).getByRole('button', { name: 'Quitar filtros' }));
    expect(codes()).toEqual(['109', '201', 'C2']);
  });

  it('asks before deactivating a free one and then says it was done', async () => {
    const { api, table, click, toast } = await setup(normal);

    await click(table().getByRole('button', { name: 'Desactivar Habitación 109' }));
    const dialog = within(
      await screen.findByRole('dialog', { name: '¿Desactivar el ambiente 109?' }),
    );
    expect(api.deactivate).not.toHaveBeenCalled();
    await click(dialog.getByRole('button', { name: 'Desactivar ambiente' }));

    expect(api.deactivate).toHaveBeenCalledWith('e109');
    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Ambiente 109 desactivado.', { tone: 'success' });
    });
    expect(api.list).toHaveBeenCalledTimes(2);
  });

  it('does not ask the BFF when the list already says who is in it: it tells what to do', async () => {
    const { api, table, click } = await setup(normal);

    await click(table().getByRole('button', { name: 'Desactivar Cabaña C2' }));

    const dialog = within(
      await screen.findByRole('dialog', { name: 'El ambiente C2 está ocupado' }),
    );
    expect(dialog.getByText(/Diego Rojas/)).toBeTruthy();
    expect(dialog.getByRole('link', { name: 'Ver huésped' }).getAttribute('href')).toBe(
      '/admin/guests/g2',
    );
    expect(api.deactivate).not.toHaveBeenCalled();
  });

  it('turns the confirmation into the notice when the BFF says it is occupied meanwhile', async () => {
    const { api, table, click } = await setup(normal);
    api.deactivate.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: {
              code: 'ENVIRONMENT_OCCUPIED',
              message: 'x',
              occupant: contractOf({ startDate: '2026-12-01' }),
            },
          }),
      ),
    );

    await click(table().getByRole('button', { name: 'Desactivar Habitación 109' }));
    const dialog = within(
      await screen.findByRole('dialog', { name: '¿Desactivar el ambiente 109?' }),
    );
    await click(dialog.getByRole('button', { name: 'Desactivar ambiente' }));

    expect(
      await screen.findByRole('dialog', { name: 'El ambiente 109 está ocupado' }),
    ).toBeTruthy();
    expect(screen.getByText(/finaliza primero ese contrato/)).toBeTruthy();
  });

  it('reactivates an inactive one without asking', async () => {
    const { api, view, table, click, toast } = await setup(normal);
    await click(view().getByRole('button', { name: 'Inactivos' }));

    await click(table().getByRole('button', { name: 'Reactivar Habitación 208' }));

    expect(api.reactivate).toHaveBeenCalledWith('e208');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(toast).toHaveBeenCalledWith('Ambiente 208 reactivado.', { tone: 'success' });
  });

  it('asks the next page with the cursor of the BFF and keeps what is on screen', async () => {
    const { api, view, codes, click } = await setup((status) =>
      status === 'ACTIVE' ? of(page([FREE], { nextCursor: 'c1' })) : of(page([])),
    );
    api.list.mockReturnValueOnce(of(page([BUSY])));

    await click(view().getByRole('button', { name: 'Mostrar más' }));

    expect(api.list).toHaveBeenLastCalledWith('ACTIVE', 'c1');
    expect(codes()).toEqual(['109', '201']);
  });

  it('says there are none, with what to do, and shows a skeleton while it loads', async () => {
    const pending = new Subject<EnvironmentPage>();
    const loading = await setup(() => pending);
    expect(loading.view().queryByRole('table')).toBeNull();
    pending.next(page([], { freeCount: 0 }));
    pending.complete();
    await loading.settle();

    expect(loading.view().getByText('Aún no hay ambientes.')).toBeTruthy();
    expect(
      loading
        .view()
        .getByText('Crea las habitaciones y cabañas para poder cargar contratos y estadías.'),
    ).toBeTruthy();
  });

  it('says it could not load and asks again on «Reintentar»', async () => {
    const { api, view, click } = await setup(() => throwError(() => new Error('down')));
    api.list.mockReturnValue(of(page([FREE])));

    expect(text(view().getByRole('alert'))).toContain('No se pudieron cargar los ambientes.');
    await click(view().getByRole('button', { name: 'Reintentar' }));

    expect(view().getByRole('table', { name: 'Ambientes' })).toBeTruthy();
  });
});
