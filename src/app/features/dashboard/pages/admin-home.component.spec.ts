import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import { Observable, of, Subject, throwError } from 'rxjs';
import { chargeOf, dashboardOf, voucherOf } from '../model/dashboard.testing';
import { AdminDashboardService } from '../data/admin-dashboard.service';
import type { AdminDashboard } from '../model/dashboard-charges';
import { AdminHomeComponent } from './admin-home.component';

const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();

/** The month of the canvas «Inicio»: two overdue (one rejected), one under review, one paid. */
function busyMonth(): AdminDashboard {
  return dashboardOf({
    charges: [
      chargeOf({
        guestId: 'g1',
        guestName: 'Ana Quispe',
        contractId: 'c1',
        environmentCode: '201',
        status: 'OVERDUE',
        paymentId: 'p9',
        paymentRejected: true,
        dueDate: '2026-10-05',
        amount: 800,
      }),
      chargeOf({
        guestId: 'g2',
        guestName: 'Pedro Ccori',
        documentNumber: '41239876',
        contractId: 'c2',
        environmentCode: '105',
        status: 'OVERDUE',
        dueDate: '2026-10-10',
        amount: 650,
      }),
      chargeOf({
        guestId: 'g3',
        guestName: 'Luis Mamani',
        documentNumber: '45678912',
        contractId: 'c3',
        environmentCode: '104',
        status: 'UNDER_REVIEW',
        paymentId: 'p3',
        dueDate: '2026-10-15',
        amount: 700,
      }),
      chargeOf({
        guestId: 'g4',
        guestName: 'Diego Rojas',
        documentType: 'PASSPORT',
        documentNumber: '548210',
        guestType: 'TEMPORARY',
        contractId: null,
        stayId: 's1',
        period: null,
        stayStartDate: '2026-10-25',
        stayEndDate: '2026-11-02',
        environmentCode: 'C2',
        status: 'UNPAID',
        dueDate: '2026-11-02',
        amount: 420,
      }),
      chargeOf({
        guestId: 'g5',
        guestName: 'Jorge Condori',
        contractId: 'c5',
        environmentCode: '203',
        status: 'PAID',
        amount: 780,
      }),
    ],
    pendingVouchersTotal: 1,
    pendingVouchers: [voucherOf()],
    overdue: {
      count: 2,
      total: 1450,
      first: [
        {
          guestId: 'g1',
          guestName: 'Ana Quispe',
          environmentCode: '201',
          period: '2026-10',
          stayStartDate: null,
          stayEndDate: null,
          dueDate: '2026-10-05',
          amount: 800,
        },
      ],
    },
  });
}

async function setup(answer: Observable<AdminDashboard>) {
  const api = { get: vi.fn<() => Observable<AdminDashboard>>(() => answer) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'home', component: AdminHomeComponent }]),
      { provide: AdminDashboardService, useValue: api },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await TestBed.inject(Router).navigateByUrl('/home');
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    // A resource keeps the app unstable while it reads: tick instead of waiting for it.
    TestBed.tick();
  };
  await settle();
  const page = () => within(harness.routeNativeElement ?? document.body);
  const table = () => within(page().getByRole('table', { name: 'Cobros del mes' }));
  const names = () =>
    table()
      .getAllByRole('rowheader')
      .map((header) => text(header.querySelector('.quipu-name') ?? header));
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle();
  };
  return { api, page, table, names, click, settle, harness };
}

describe('A1 «Inicio» of the administrator', () => {
  it('names the month, the panel, what else waits and the charges of the month', async () => {
    const { page } = await setup(of(busyMonth()));

    expect(page().getByRole('heading', { level: 1 }).textContent).toMatch(/\d{4}$/);
    const panel = page().getByRole('region', { name: 'Lo que toca ahora' });
    expect(text(panel)).toContain('pago por revisar');
    expect(text(panel)).toContain('Es el de Pedro Ccori (septiembre)');
    expect(
      within(panel).getByRole('link', { name: 'Revisar el más antiguo' }).getAttribute('href'),
    ).toBe('/admin/payments/p1?vista=por-revisar');
    const also = page().getByRole('list', { name: 'También pendiente' });
    expect(text(also)).toContain('2 cobros atrasados:');
    expect(page().getByRole('heading', { name: 'Cobros del mes', level: 2 })).toBeTruthy();
  });

  it('orders the charges with the urgent first and offers each row its action', async () => {
    const { table, names } = await setup(of(busyMonth()));

    expect(names()).toEqual([
      'Ana Quispe',
      'Pedro Ccori',
      'Luis Mamani',
      'Diego Rojas',
      'Jorge Condori',
    ]);
    const link = (name: string) => table().getByRole('link', { name }).getAttribute('href');
    expect(link('Corregir pago de Ana Quispe')).toBe('/admin/payments/p9?vista=rechazados');
    expect(link('Registrar pago de Pedro Ccori')).toBe('/admin/payments/new?guestId=g2');
    expect(link('Revisar pago de Luis Mamani')).toBe('/admin/payments/p3?vista=por-revisar');
    expect(link('Ver huésped de Jorge Condori')).toBe('/admin/guests/g5');
    expect(text(table().getByText('Pago rechazado'))).toBe('Pago rechazado');
  });

  it('turns the table to one state when its tile is pressed, and back with «Todos»', async () => {
    const { page, names, click } = await setup(of(busyMonth()));

    await click(page().getByRole('button', { name: /^Atrasado/ }));
    expect(names()).toEqual(['Ana Quispe', 'Pedro Ccori']);
    expect(text(page().getByText(/Mostrando/))).toContain('Mostrando 2 de 5 cobros');

    await click(page().getByRole('button', { name: /^Todos/ }));
    expect(names()).toHaveLength(5);
  });

  it('searches by name, by document or by environment, and narrows by type', async () => {
    const { page, names, settle } = await setup(of(busyMonth()));
    const search = page().getByLabelText('Buscar');

    fireEvent.input(search, { target: { value: 'c2' } });
    await settle();
    expect(names()).toEqual(['Diego Rojas']);

    fireEvent.input(search, { target: { value: '' } });
    const type = page().getByLabelText('Tipo de huésped');
    fireEvent.change(type, { target: { value: 'TEMPORARY' } });
    fireEvent.input(type);
    await settle();
    expect(names()).toEqual(['Diego Rojas']);
  });

  it('says so, and offers «Quitar filtros», when no charge matches', async () => {
    const { page, names, click, settle } = await setup(of(busyMonth()));

    fireEvent.input(page().getByLabelText('Buscar'), { target: { value: 'nadie' } });
    await settle();
    expect(page().getByText('Ningún cobro coincide con los filtros.')).toBeTruthy();

    const empty = page().getByRole('region', { name: 'Ningún cobro coincide con los filtros.' });
    await click(within(empty).getByRole('button', { name: 'Quitar filtros' }));
    expect(names()).toHaveLength(5);
  });

  it('orders by a header and turns it around with a second press', async () => {
    const { table, names, click } = await setup(of(busyMonth()));

    await click(table().getByRole('button', { name: 'Monto' }));
    expect(names()[0]).toBe('Diego Rojas');

    await click(table().getByRole('button', { name: 'Monto' }));
    expect(names()[0]).toBe('Ana Quispe');
  });

  it('«Ver atrasados» turns the table to the overdue charges and takes the reader to them', async () => {
    const { page, names, click } = await setup(of(busyMonth()));

    await click(page().getByRole('button', { name: 'Ver atrasados' }));

    expect(names()).toEqual(['Ana Quispe', 'Pedro Ccori']);
    expect(document.activeElement).toBe(page().getByRole('heading', { name: 'Cobros del mes' }));
  });

  it('says «Nada pendiente» when nothing waits and still shows the charges', async () => {
    const { page, names } = await setup(of(dashboardOf({ charges: [chargeOf()] })));

    expect(text(page().getByRole('region', { name: 'Lo que toca ahora' }))).toContain(
      'Nada pendiente',
    );
    expect(page().queryByRole('list', { name: 'También pendiente' })).toBeNull();
    expect(names()).toEqual(['Ana Quispe']);
  });

  it('welcomes the first use with its steps and no table', async () => {
    const { page } = await setup(of(dashboardOf()));

    expect(text(page().getByRole('region', { name: 'Lo que toca ahora' }))).toContain(
      'Quipu aún no tiene datos',
    );
    const steps = page().getByRole('list', { name: 'Para empezar' });
    expect(within(steps).getAllByRole('listitem')).toHaveLength(3);
    expect(within(steps).getByRole('link', { name: 'Ir a Huéspedes' }).getAttribute('href')).toBe(
      '/admin/guests',
    );
    expect(page().queryByRole('table')).toBeNull();
  });

  it('shows a skeleton while it loads, then the page', async () => {
    const pending = new Subject<AdminDashboard>();
    const { page, settle } = await setup(pending);

    expect(page().queryByRole('region', { name: 'Lo que toca ahora' })).toBeNull();

    pending.next(busyMonth());
    pending.complete();
    await settle();
    expect(page().getByRole('region', { name: 'Lo que toca ahora' })).toBeTruthy();
  });

  it('says it could not load and asks again on «Reintentar»', async () => {
    let attempts = 0;
    const { api, page, click } = await setup(throwError(() => new Error('down')));
    api.get.mockImplementation(() => {
      attempts += 1;
      return of(busyMonth());
    });

    expect(text(page().getByRole('alert'))).toContain('No se pudo cargar el inicio.');
    await click(page().getByRole('button', { name: 'Reintentar' }));

    expect(attempts).toBe(1);
    expect(page().getByRole('region', { name: 'Lo que toca ahora' })).toBeTruthy();
  });
});
