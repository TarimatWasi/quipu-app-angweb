import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import type { PaymentQueueItem, QueueSummary } from '../data/admin-payments.service';
import { PaymentQueueComponent } from './payment-queue.component';

// The component awaits the BFF's answer as a promise: let it land before the view is checked.
async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

const isQueue = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/admin/payments');
const isDashboard = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/admin/dashboard');

function row(overrides: Partial<PaymentQueueItem> = {}): PaymentQueueItem {
  return {
    id: 'pay_a',
    guestId: 'g_a',
    guestName: 'Ana Quispe',
    documentNumber: '12345678',
    guestType: 'CONTRACT',
    environmentCode: 'C1',
    period: '2026-09',
    stayStartDate: null,
    stayEndDate: null,
    status: 'PENDING',
    proofCount: 2,
    voucherCount: 1,
    hasCash: true,
    reviewedBy: null,
    submittedAt: '2026-11-03T19:05:00Z',
    createdAt: '2026-11-03T19:05:00Z',
    ...overrides,
  } as PaymentQueueItem;
}

/** The parts of `getAdminDashboard` that A5 reads; the rest of the home does not matter here. */
function dashboard(summary: Partial<QueueSummary> = {}) {
  const oldest = summary.oldestPending === undefined ? row() : summary.oldestPending;
  const pending = oldest === null ? [] : [oldest];
  return {
    pendingVouchers: pending,
    pendingVouchersTotal: summary.pendingTotal ?? pending.length,
    rejected: summary.rejected ?? { count: 0, oldest: null },
  };
}

async function setup(url = '/admin/payments', summary: object | null = dashboard()) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/payments', component: PaymentQueueComponent },
        { path: 'admin/payments/new', children: [] },
        { path: 'admin/payments/:id', children: [] },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
  const home = await vi.waitFor(() => http.expectOne(isDashboard));
  if (summary === null) {
    home.flush({ code: 'X', message: 'x' }, { status: 500, statusText: 'x' });
  } else {
    home.flush(summary);
  }
  const root = () => present(harness.routeNativeElement);
  const ui = () => within(root());
  const answer = async (body: object, status = 200) => {
    const req = await vi.waitFor(() => http.expectOne(isQueue));
    req.flush(body, { status, statusText: 'x' });
    await settle(harness);
    return req;
  };
  return { harness, http, ui, answer, root };
}

function cellsOf(rowElement: HTMLElement | undefined): string[] {
  const inRow = within(present(rowElement));
  return [...inRow.getAllByRole('rowheader'), ...inRow.getAllByRole('cell')].map((cell) =>
    cell.textContent.replace(/\s+/g, ' ').trim(),
  );
}

describe('PaymentQueueComponent (A5)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the skeleton while the first page loads, then «Pagos recibidos»', async () => {
    const { ui, answer } = await setup();
    expect(ui().getByRole('heading', { level: 1, name: 'Pagos' })).toBeTruthy();
    expect(ui().queryByRole('heading', { name: 'Pagos recibidos' })).toBeNull();

    await answer({ content: [row()], nextCursor: null });

    expect(ui().getByRole('heading', { name: 'Pagos recibidos' })).toBeTruthy();
  });

  it('offers «Registrar pago directo» (A5.1) in every view', async () => {
    const { ui, answer } = await setup('/admin/payments?vista=aprobados');
    await answer({ content: [], nextCursor: null });

    const link = ui().getByRole('link', { name: 'Registrar pago directo' });
    expect(link.getAttribute('href')).toBe('/admin/payments/new');
  });

  it('asks the pending payments first and shows each row with its columns and state, without the amount', async () => {
    const { ui, answer } = await setup();

    const req = await answer({
      content: [
        row(),
        row({
          id: 'pay_b',
          guestName: null,
          guestType: 'TEMPORARY',
          environmentCode: 'T2',
          period: null,
          stayStartDate: '2026-10-20',
          stayEndDate: '2026-10-31',
          voucherCount: 2,
          hasCash: false,
          submittedAt: '2026-11-04T19:05:00Z',
        }),
      ],
      nextCursor: null,
    });

    expect(req.request.params.get('status')).toBe('PENDING');
    expect(req.request.params.has('after')).toBe(false);
    const table = ui().getByRole('table', { name: 'Por revisar' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    expect(cellsOf(rows[0]).slice(0, 6)).toEqual([
      'Ana Quispe12345678 · Contrato',
      'C1',
      'Septiembre 2026',
      expect.stringMatching(/^3 nov 2026, 14:05 (hoy|hace \d+ días?)$/),
      '1 voucher y efectivo',
      'Pendiente de revisión',
    ]);
    expect(cellsOf(rows[1]).slice(0, 5)).toEqual([
      'Sin nombre12345678 · Temporal',
      'T2',
      '20 – 31 oct',
      expect.stringMatching(/^4 nov 2026, 14:05/),
      '2 vouchers',
    ]);
    expect(ui().queryByText(/S\/ /)).toBeNull();
    expect(
      within(table)
        .getAllByRole('link', { name: /^Revisar pago de/ })
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/admin/payments/pay_a?vista=por-revisar',
      '/admin/payments/pay_b?vista=por-revisar',
    ]);
    expect(ui().getByText('Mostrando 2 de 2')).toBeTruthy();
  });

  it('counts every pending payment in «Lo que toca ahora» and opens the oldest', async () => {
    const oldest = row({ id: 'pay_old', guestName: 'Pedro Ccori', period: '2026-09' });
    const { ui, answer } = await setup(
      '/admin/payments',
      dashboard({ pendingTotal: 4, oldestPending: oldest }),
    );
    await answer({ content: [oldest, row({ id: 'pay_new' })], nextCursor: 'c' });

    const panel = ui().getByRole('region', { name: 'Lo que toca ahora' });
    expect(panel.textContent).toContain('4');
    expect(panel.textContent).toContain('pagos por revisar');
    expect(panel.textContent).toContain('El más antiguo es de Pedro Ccori (septiembre 2026)');
    expect(
      within(panel).getByRole('link', { name: 'Revisar el más antiguo' }).getAttribute('href'),
    ).toBe('/admin/payments/pay_old?vista=por-revisar');
  });

  it('keeps the queue usable when the counts of the panel fail', async () => {
    const { ui, answer } = await setup('/admin/payments', null);
    await answer({ content: [row()], nextCursor: null });

    expect(ui().queryByRole('region', { name: 'Lo que toca ahora' })).toBeNull();
    expect(ui().getByRole('table', { name: 'Por revisar' })).toBeTruthy();
  });

  it('says there is nothing to review, without the oldest action, when the view is empty', async () => {
    const { ui, answer } = await setup('/admin/payments', dashboard({ oldestPending: null }));

    await answer({ content: [], nextCursor: null });

    expect(ui().getByText('No hay pagos por revisar.')).toBeTruthy();
    expect(
      ui().getByText('Puedes registrar un pago directo si el huésped te pagó en persona.'),
    ).toBeTruthy();
    expect(ui().getByText(/No hay pagos esperando/)).toBeTruthy();
    expect(ui().queryByRole('table')).toBeNull();
    expect(ui().queryByRole('link', { name: 'Revisar el más antiguo' })).toBeNull();
    expect(ui().queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('says the queue could not load and asks again on «Reintentar»', async () => {
    const { ui, answer } = await setup();

    await answer({ code: 'RATE_LIMITED', message: 'Espera un momento, por favor' }, 429);

    expect(ui().getByText('No se pudo cargar la cola de pagos.')).toBeTruthy();
    expect(ui().queryByRole('table')).toBeNull();

    fireEvent.click(ui().getByRole('button', { name: 'Reintentar' }));
    await answer({ content: [row()], nextCursor: null });

    expect(ui().queryByText('No se pudo cargar la cola de pagos.')).toBeNull();
    expect(ui().getByRole('table', { name: 'Por revisar' })).toBeTruthy();
  });

  it('adds the next page with «Mostrar más», passing the cursor, until there is none', async () => {
    const { ui, answer } = await setup();
    await answer({ content: [row({ id: 'pay_1' })], nextCursor: 'cursor-2' });
    expect(ui().getByText('Mostrando 1 de 1 cargados')).toBeTruthy();

    fireEvent.click(ui().getByRole('button', { name: 'Mostrar más' }));
    const req = await answer({
      content: [row({ id: 'pay_2', submittedAt: '2026-11-04T19:05:00Z' })],
      nextCursor: null,
    });

    expect(req.request.params.get('after')).toBe('cursor-2');
    expect(req.request.params.get('status')).toBe('PENDING');
    expect(
      within(ui().getByRole('table'))
        .getAllByRole('link', { name: /^Revisar pago de/ })
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/admin/payments/pay_1?vista=por-revisar',
      '/admin/payments/pay_2?vista=por-revisar',
    ]);
    expect(ui().queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('keeps the rows already shown when the next page fails, and asks it again', async () => {
    const { ui, answer } = await setup();
    await answer({ content: [row({ id: 'pay_1' })], nextCursor: 'cursor-2' });

    fireEvent.click(ui().getByRole('button', { name: 'Mostrar más' }));
    await answer({ code: 'X', message: 'No se pudo cargar' }, 500);

    expect(within(ui().getByRole('table')).getAllByRole('row')).toHaveLength(2);
    expect(ui().getByText('No se pudo cargar la cola de pagos.')).toBeTruthy();

    fireEvent.click(ui().getByRole('button', { name: 'Reintentar' }));
    const again = await answer({ content: [row({ id: 'pay_2' })], nextCursor: null });
    expect(again.request.params.get('after')).toBe('cursor-2');
    expect(within(ui().getByRole('table')).getAllByRole('row')).toHaveLength(3);
  });

  it('searches the loaded payments and clears the filters', async () => {
    const { ui, answer, harness } = await setup();
    await answer({
      content: [
        row({ id: 'pay_a', guestName: 'Ana Quispe' }),
        row({ id: 'pay_c', guestName: 'Carmen Huamán', guestType: 'TEMPORARY' }),
      ],
      nextCursor: null,
    });

    const search = ui().getByRole('searchbox', { name: 'Buscar' });
    fireEvent.input(search, { target: { value: 'huaman' } });
    await settle(harness);
    expect(within(ui().getByRole('table')).getAllByRole('row')).toHaveLength(2);
    expect(ui().getByText('Mostrando 1 de 2')).toBeTruthy();

    fireEvent.input(search, { target: { value: 'nadie' } });
    await settle(harness);
    expect(ui().getByText('Ningún pago coincide con los filtros.')).toBeTruthy();

    fireEvent.click(present(ui().getAllByRole('button', { name: 'Quitar filtros' })[0]));
    await settle(harness);
    expect(within(ui().getByRole('table')).getAllByRole('row')).toHaveLength(3);
  });

  it('switches to the rejected view, asks it from the first page and offers «Corregir pago»', async () => {
    const { ui, answer } = await setup(
      '/admin/payments',
      dashboard({
        rejected: {
          count: 1,
          oldest: {
            paymentId: 'pay_r',
            guestName: 'Ana Quispe',
            period: '2026-10',
            stayStartDate: null,
            stayEndDate: null,
            rejectedAt: '2026-11-01T10:00:00Z',
          },
        },
      }),
    );
    await answer({ content: [row()], nextCursor: 'c' });

    fireEvent.click(ui().getByRole('button', { name: 'Rechazados' }));
    const req = await answer({
      content: [row({ id: 'pay_r', status: 'REJECTED', reviewedBy: { id: 'u', name: 'Rosa' } })],
      nextCursor: null,
    });

    expect(req.request.params.get('status')).toBe('REJECTED');
    expect(TestBed.inject(Router).url).toBe('/admin/payments?vista=rechazados');
    expect(req.request.params.has('after')).toBe(false);
    expect(ui().getByRole('button', { name: 'Rechazados' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(ui().getByRole('button', { name: 'Por revisar' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    const table = ui().getByRole('table', { name: 'Rechazados' });
    expect(within(table).getByText('Rechazado por Rosa')).toBeTruthy();
    expect(
      within(table)
        .getByRole('link', { name: /^Corregir pago de/ })
        .getAttribute('href'),
    ).toBe('/admin/payments/pay_r?vista=rechazados');
    const panel = ui().getByRole('region', { name: 'Lo que toca ahora' });
    expect(panel.textContent).toContain('pago rechazado sin corregir');
    expect(
      within(panel).getByRole('link', { name: 'Corregir el más antiguo' }).getAttribute('href'),
    ).toBe('/admin/payments/pay_r?vista=rechazados');
  });

  it('has no panel in «Aprobados» and opens each payment with «Ver pago»', async () => {
    const { ui, answer } = await setup('/admin/payments?vista=aprobados');
    await answer({ content: [row({ id: 'pay_ok', status: 'APPROVED' })], nextCursor: null });

    expect(ui().queryByRole('region', { name: 'Lo que toca ahora' })).toBeNull();
    expect(
      within(ui().getByRole('table'))
        .getByRole('link', { name: /^Ver pago de/ })
        .getAttribute('href'),
    ).toBe('/admin/payments/pay_ok?vista=aprobados');
  });

  it('sorts by a header and says it with aria-sort', async () => {
    const { ui, answer, harness } = await setup();
    await answer({
      content: [
        row({ id: 'pay_l', guestName: 'Luis Mamani' }),
        row({ id: 'pay_a', guestName: 'Ana Quispe', submittedAt: '2026-11-04T19:05:00Z' }),
      ],
      nextCursor: null,
    });

    fireEvent.click(within(ui().getByRole('table')).getByRole('button', { name: 'Huésped' }));
    await settle(harness);

    const table = ui().getByRole('table');
    const names = within(table)
      .getAllByRole('rowheader')
      .map((cell) => cell.textContent.trim().split(' ')[0]);
    expect(names).toEqual(['Ana', 'Luis']);
    expect(
      within(table).getByRole('columnheader', { name: 'Huésped' }).getAttribute('aria-sort'),
    ).toBe('ascending');
  });

  it('opens a view from the address and ignores a late answer of the previous view', async () => {
    const { ui, http, harness } = await setup('/admin/payments?vista=aprobados');
    const first = await vi.waitFor(() => http.expectOne(isQueue));
    expect(first.request.params.get('status')).toBe('APPROVED');

    await harness.navigateByUrl('/admin/payments?vista=por-revisar');
    await settle(harness);
    const second = await vi.waitFor(() =>
      http.expectOne((r) => isQueue(r) && r.params.get('status') === 'PENDING'),
    );
    first.flush({ content: [row({ id: 'late', status: 'APPROVED' })], nextCursor: null });
    second.flush({ content: [], nextCursor: null });
    await settle(harness);

    expect(ui().getByText('No hay pagos por revisar.')).toBeTruthy();
    expect(ui().queryByRole('table')).toBeNull();
  });

  it('follows the address when only the view changes on this same page', async () => {
    const { ui, answer, harness } = await setup();
    await answer({ content: [row()], nextCursor: null });

    await harness.navigateByUrl('/admin/payments?vista=rechazados');
    const req = await answer({ content: [], nextCursor: null });

    expect(req.request.params.get('status')).toBe('REJECTED');
    expect(ui().getByRole('button', { name: 'Rechazados' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(ui().getByText('No hay pagos rechazados.')).toBeTruthy();
  });
});

/** Fails the test with a clear message instead of a non-null assertion. */
function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected the element to be on the page');
  }
  return value;
}
