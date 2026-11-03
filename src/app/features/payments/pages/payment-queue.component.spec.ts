import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import type { PaymentQueueItem } from '@core/services/admin-payments.service';
import { PaymentQueueComponent } from './payment-queue.component';

// The component awaits the BFF's answer as a promise: let it land before the view is checked.
async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

const isQueue = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/admin/payments');

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

async function setup(url = '/admin/payments') {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/payments', component: PaymentQueueComponent },
        { path: 'admin/payments/:id', children: [] },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl(url);
  const http = TestBed.inject(HttpTestingController);
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

describe('PaymentQueueComponent (A5)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks the pending payments first and shows each row with its columns, without the amount', async () => {
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
        }),
      ],
      nextCursor: null,
    });

    expect(req.request.params.get('status')).toBe('PENDING');
    expect(req.request.params.has('after')).toBe(false);
    const rows = ui().getAllByRole('row').slice(1);
    expect(rows).toHaveLength(2);
    const cells = (index: number) =>
      within(present(rows[index]))
        .getAllByRole('cell')
        .map((cell) => cell.textContent.replace(/\s+/g, ' ').trim());
    expect(cells(0).slice(0, 5)).toEqual([
      'Ana Quispe 12345678',
      'C1',
      'Septiembre 2026',
      '3 nov 2026, 14:05',
      '1 voucher y efectivo',
    ]);
    expect(cells(1).slice(0, 5)).toEqual([
      'Sin nombre aún 12345678',
      'T2',
      '20 – 31 oct',
      '3 nov 2026, 14:05',
      '2 vouchers',
    ]);
    expect(ui().queryByText(/S\/ /)).toBeNull();
    expect(
      ui()
        .getAllByRole('link', { name: /Revisar/ })
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/admin/payments/pay_a?vista=por-revisar',
      '/admin/payments/pay_b?vista=por-revisar',
    ]);
  });

  it('opens the oldest pending payment with "Revisar el más antiguo"', async () => {
    const { ui, answer, harness } = await setup();
    await answer({ content: [row({ id: 'pay_old' }), row({ id: 'pay_new' })], nextCursor: null });

    fireEvent.click(ui().getByRole('button', { name: 'Revisar el más antiguo' }));
    await settle(harness);

    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/admin/payments/pay_old?vista=por-revisar');
    });
  });

  it('says there is nothing to review, without the oldest button, when the view is empty', async () => {
    const { ui, answer } = await setup();

    await answer({ content: [], nextCursor: null });

    expect(ui().getByText('No hay pagos por revisar.')).toBeTruthy();
    expect(ui().queryByRole('table')).toBeNull();
    expect(ui().queryByRole('button', { name: 'Revisar el más antiguo' })).toBeNull();
    expect(ui().queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('shows the message of the BFF when the queue fails and asks again on "Reintentar"', async () => {
    const { ui, answer } = await setup();

    await answer({ code: 'RATE_LIMITED', message: 'Espera un momento, por favor' }, 429);

    expect(ui().getByRole('alert').textContent).toContain('Espera un momento, por favor');
    expect(ui().queryByRole('table')).toBeNull();

    fireEvent.click(ui().getByRole('button', { name: 'Reintentar' }));
    await answer({ content: [row()], nextCursor: null });

    expect(ui().queryByRole('alert')).toBeNull();
    expect(ui().getAllByRole('row')).toHaveLength(2);
  });

  it('adds the next page with "Mostrar más", passing the cursor, until there is none', async () => {
    const { ui, answer } = await setup();
    await answer({ content: [row({ id: 'pay_1' })], nextCursor: 'cursor-2' });

    fireEvent.click(ui().getByRole('button', { name: 'Mostrar más' }));
    const req = await answer({ content: [row({ id: 'pay_2' })], nextCursor: null });

    expect(req.request.params.get('after')).toBe('cursor-2');
    expect(req.request.params.get('status')).toBe('PENDING');
    expect(
      ui()
        .getAllByRole('link', { name: /Revisar/ })
        .map((link) => link.getAttribute('href')),
    ).toEqual([
      '/admin/payments/pay_1?vista=por-revisar',
      '/admin/payments/pay_2?vista=por-revisar',
    ]);
    expect(ui().queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('keeps the rows already shown when the next page fails', async () => {
    const { ui, answer } = await setup();
    await answer({ content: [row({ id: 'pay_1' })], nextCursor: 'cursor-2' });

    fireEvent.click(ui().getByRole('button', { name: 'Mostrar más' }));
    await answer({ code: 'X', message: 'No se pudo cargar' }, 500);

    expect(ui().getAllByRole('row')).toHaveLength(2);
    expect(ui().getByRole('alert').textContent).toContain('No se pudo cargar');
    expect(ui().getByRole('button', { name: 'Mostrar más' })).toBeTruthy();
  });

  it('switches to the rejected view, asks it from the first page and offers "Corregir pago"', async () => {
    const { ui, answer } = await setup();
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
    expect(ui().getByText('Rechazado por Rosa')).toBeTruthy();
    expect(
      ui()
        .getByRole('link', { name: /Corregir pago/ })
        .getAttribute('href'),
    ).toBe('/admin/payments/pay_r?vista=rechazados');
    expect(ui().queryByRole('button', { name: 'Revisar el más antiguo' })).toBeNull();
  });

  it('opens a view from the address and ignores a late answer of the previous view', async () => {
    const { ui, http, harness } = await setup('/admin/payments?vista=aprobados');
    const first = await vi.waitFor(() => http.expectOne(isQueue));
    expect(first.request.params.get('status')).toBe('APPROVED');

    fireEvent.click(ui().getByRole('button', { name: 'Por revisar' }));
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
