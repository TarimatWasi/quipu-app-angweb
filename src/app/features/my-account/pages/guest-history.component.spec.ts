import { HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import type { GuestHistoryItem } from '../data/guest-payments.service';
import type { GuestPayment } from '../data/own-payments';
import { GuestHistoryComponent } from './guest-history.component';

const isHistory = (req: HttpRequest<unknown>) =>
  req.method === 'GET' && req.url.endsWith('/bff/guest/payments');

function payment(overrides: Partial<GuestPayment> = {}): GuestPayment {
  return {
    id: 'pay1',
    contractId: 'c1',
    stayId: null,
    period: '2026-10',
    status: 'APPROVED',
    amount: 350,
    verifiedAmount: 350,
    creditApplied: 0,
    amountDue: 350,
    surplus: null,
    rejectionReason: null,
    submittedAt: '2026-10-04T15:00:00Z',
    createdAt: '2026-10-04T15:00:00Z',
    proofs: [
      {
        id: 'pr1',
        kind: 'VOUCHER',
        method: 'Yape',
        declaredAmount: 350,
        verifiedAmount: 350,
        uploadedBy: 'GUEST',
        addedAt: '2026-10-04T15:00:00Z',
        file: { name: 'v.png', contentType: 'image/png', sizeBytes: 10 },
      },
    ],
    reviews: [],
    ...overrides,
  };
}

const item = (p: GuestPayment): GuestHistoryItem => ({ kind: 'PAYMENT', payment: p, refund: null });

const REJECTED = payment({
  id: 'pay/rej',
  period: '2026-09',
  status: 'REJECTED',
  verifiedAmount: null,
  rejectionReason: 'No se lee el voucher',
  proofs: [
    {
      id: 'pr2',
      kind: 'CASH',
      declaredAmount: 100,
      verifiedAmount: null,
      uploadedBy: 'ADMIN',
      addedAt: '2026-09-04T15:00:00Z',
      file: null,
    },
  ],
});
const PENDING = payment({
  id: 'pay_pen',
  period: '2026-11',
  status: 'PENDING',
  verifiedAmount: null,
});

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'home', children: [] },
        { path: 'guest/payments', component: GuestHistoryComponent },
        { path: 'guest/payments/new', children: [] },
        { path: 'guest/payments/:id', children: [] },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
    ],
  });
  const harness = await RouterTestingHarness.create();
  const http = TestBed.inject(HttpTestingController);
  await harness.navigateByUrl('/guest/payments');
  const expect1 = async () => vi.waitFor(() => http.expectOne(isHistory));
  const flush = async (req: TestRequest, body: object, status = 200) => {
    req.flush(body, { status, statusText: 'x' });
    await settle(harness);
  };
  const page = () => within(present(harness.routeNativeElement));
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const choose = async (label: string, value: string) => {
    const select = page().getByLabelText(label);
    fireEvent.change(select, { target: { value } });
    fireEvent.input(select);
    await settle(harness);
  };
  // The table and the cards of a phone are both in the page: these read the table.
  const table = () => within(page().getByRole('table', { name: 'Tus pagos' }));
  const rows = () =>
    table()
      .getAllByRole('row')
      .filter((row) => row.querySelector('th[scope="row"]') !== null);
  const months = () =>
    rows().map(
      (row) => within(row).getAllByText(/Agosto|Octubre|Noviembre|Septiembre/)[0]?.textContent,
    );
  return { http, page, click, choose, expect1, flush, table, rows, months };
}

const PAGE = (
  content: GuestHistoryItem[],
  creditBalance = 0,
  nextCursor: string | null = null,
) => ({ content, nextCursor, creditBalance });

describe('GuestHistoryComponent (H4)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps the title while it loads and draws only the rows as a skeleton', async () => {
    const ui = await setup();

    expect(ui.page().getByRole('heading', { level: 1, name: 'Historial de pagos' })).toBeTruthy();
    expect(
      ui.page().getByRole('region', { name: 'Cargando Tus pagos' }).getAttribute('aria-busy'),
    ).toBe('true');
    expect(ui.page().queryByText('Pendiente de revisión')).toBeNull();
    await ui.flush(await ui.expect1(), PAGE([item(payment())]));
  });

  it('lists the own payments with their state; the rejected one with its reason and «Corregir pago», the pending one with «Ver pago»', async () => {
    const ui = await setup();
    const req = await ui.expect1();
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.has('after')).toBe(false);
    await ui.flush(req, PAGE([item(PENDING), item(REJECTED), item(payment())]));

    const [pending, rejected, approved] = ui.rows().map((row) => within(row));
    expect(ui.rows()).toHaveLength(3);
    expect(pending?.getByText('Noviembre 2026')).toBeTruthy();
    expect(pending?.getByText('Pendiente de revisión')).toBeTruthy();
    expect(pending?.getByRole('link', { name: 'Ver pago' }).getAttribute('href')).toBe(
      '/guest/payments/pay_pen',
    );
    expect(rejected?.getByText('Rechazado')).toBeTruthy();
    expect(rejected?.getByText('Registrado por la administración')).toBeTruthy();
    expect(rejected?.getByRole('link', { name: 'Corregir pago' }).getAttribute('href')).toBe(
      '/guest/payments/pay%2Frej',
    );
    expect(ui.table().getByText('No se lee el voucher')).toBeTruthy();
    expect(approved?.getByText('Aprobado')).toBeTruthy();
    expect(approved?.getByText('1 voucher')).toBeTruthy();
    expect(approved?.getByText('S/ 350.00')).toBeTruthy();
    expect(approved?.getByText('verificado')).toBeTruthy();
    expect(approved?.queryByRole('link')).toBeNull();
    expect(ui.page().queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('unfolds «Ver detalle» with the proofs and what happened, and folds it again', async () => {
    const ui = await setup();
    const corrected = payment({
      verifiedAmount: 350,
      surplus: { amount: 20, outcome: 'CREDIT' },
      creditApplied: 10,
      reviews: [
        { decision: 'REJECTED', reason: 'El monto no coincide', at: '2026-10-05T15:00:00Z' },
        { decision: 'APPROVED', reason: null, at: '2026-10-06T15:00:00Z' },
      ],
      proofs: [
        {
          id: 'a',
          kind: 'VOUCHER',
          method: 'Yape',
          declaredAmount: 300,
          verifiedAmount: 350,
          uploadedBy: 'GUEST',
          addedAt: '2026-10-04T15:00:00Z',
          file: null,
        },
        {
          id: 'b',
          kind: 'VOUCHER',
          method: 'Transferencia',
          declaredAmount: 50,
          verifiedAmount: null,
          uploadedBy: 'GUEST',
          addedAt: '2026-10-05T20:00:00Z',
          file: null,
        },
      ],
    });
    await ui.flush(await ui.expect1(), PAGE([item(corrected)]));

    const toggle = ui.table().getByRole('button', { name: 'Ver detalle' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(ui.table().queryByText('Lo que pasó')).toBeNull();
    await ui.click(toggle);

    const open = ui.table().getByRole('button', { name: 'Ocultar detalle' });
    expect(open.getAttribute('aria-expanded')).toBe('true');
    expect(ui.table().getByText('Voucher · Yape')).toBeTruthy();
    expect(ui.table().getByText('declaraste S/ 300.00')).toBeTruthy();
    expect(ui.table().getByText('Voucher · Transferencia')).toBeTruthy();
    expect(ui.table().getByText('por revisar')).toBeTruthy();
    expect(ui.table().getByText(/Sobraron S\/ 20.00: quedan a tu favor/)).toBeTruthy();
    expect(ui.table().getByText(/Se descontaron S\/ 10.00 que tenías a favor/)).toBeTruthy();
    expect(ui.table().getByText('Enviaste el pago.')).toBeTruthy();
    expect(
      ui.table().getByText('La administración lo rechazó: El monto no coincide.'),
    ).toBeTruthy();
    expect(ui.table().getByText('Agregaste un voucher de S/ 50.00.')).toBeTruthy();
    expect(ui.table().getByText('La administración lo aprobó.')).toBeTruthy();

    await ui.click(open);
    expect(ui.table().queryByText('Lo que pasó')).toBeNull();
  });

  it('asks the next page with the cursor of the previous one and adds it below', async () => {
    const ui = await setup();
    await ui.flush(await ui.expect1(), PAGE([item(PENDING)], 0, 'cursor+1/=='));

    await ui.click(ui.page().getByRole('button', { name: 'Mostrar más' }));
    const next = await ui.expect1();
    expect(next.request.params.get('after')).toBe('cursor+1/==');
    await ui.flush(next, PAGE([item(payment())]));

    expect(ui.rows()).toHaveLength(2);
    expect(ui.page().queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('shows the refunds as rows «Devuelto» and the credit in favor over the list', async () => {
    const ui = await setup();
    await ui.flush(
      await ui.expect1(),
      PAGE(
        [
          {
            kind: 'REFUND',
            payment: null,
            refund: {
              id: 'r1',
              date: '2026-11-03',
              method: 'Yape',
              amount: 120,
              fromPaymentId: 'pay1',
              fromPeriod: '2026-10',
            },
          },
          item(payment({ surplus: { amount: 120, outcome: 'REFUNDED' } })),
        ],
        20,
      ),
    );

    const [refund, paid] = ui.rows().map((row) => within(row));
    expect(refund?.getByText('Devuelto')).toBeTruthy();
    expect(refund?.getByText('Devolución de Quipu')).toBeTruthy();
    expect(refund?.getByText('Sobró de octubre')).toBeTruthy();
    expect(refund?.getByText('Por Yape')).toBeTruthy();
    expect(refund?.getByText('3 nov 2026')).toBeTruthy();
    expect(refund?.queryByRole('button', { name: 'Ver detalle' })).toBeNull();
    expect(paid?.getByRole('button', { name: 'Ver detalle' })).toBeTruthy();
    expect(ui.page().getByText('Tienes S/ 20.00 a favor.')).toBeTruthy();
    expect(ui.page().getByRole('link', { name: 'Ver estado de cuenta' }).getAttribute('href')).toBe(
      '/home',
    );
  });

  it('narrows what is loaded by state, says so when none matches and clears the filter', async () => {
    const ui = await setup();
    await ui.flush(await ui.expect1(), PAGE([item(PENDING), item(REJECTED), item(payment())]));
    expect(ui.page().getByText('Mostrando 3 de 3 cargados')).toBeTruthy();

    await ui.choose('Estado', 'REJECTED');
    expect(ui.rows()).toHaveLength(1);
    expect(ui.page().getByText('Mostrando 1 de 3 cargados')).toBeTruthy();

    await ui.choose('Estado', 'REFUND');
    expect(ui.page().getByText('Ningún pago coincide con los filtros.')).toBeTruthy();
    const clear = ui.page().getAllByRole('button', { name: 'Quitar filtros' })[0];
    await ui.click(present(clear));
    expect(ui.rows()).toHaveLength(3);
  });

  it('puts the newest first and orders by amount from the header', async () => {
    const ui = await setup();
    const small = payment({
      id: 'small',
      period: '2026-08',
      amount: 100,
      verifiedAmount: 100,
      submittedAt: '2026-08-04T15:00:00Z',
    });
    const big = payment({ id: 'big', period: '2026-10', amount: 900, verifiedAmount: 900 });
    await ui.flush(await ui.expect1(), PAGE([item(small), item(big)]));
    expect(ui.months()).toEqual(['Octubre 2026', 'Agosto 2026']);

    await ui.click(ui.table().getByRole('button', { name: /Monto/ }));

    expect(ui.months()).toEqual(['Agosto 2026', 'Octubre 2026']);
  });

  it('says there is no payment yet and offers to send the first one', async () => {
    const ui = await setup();
    await ui.flush(await ui.expect1(), PAGE([]));

    expect(ui.page().getByText('Aún no tienes pagos.')).toBeTruthy();
    expect(ui.page().getByRole('link', { name: 'Subir voucher' }).getAttribute('href')).toBe(
      '/guest/payments/new',
    );
    expect(ui.page().queryByText(/a favor/)).toBeNull();
  });

  it('says the history could not be read in the words of the screen and tries again', async () => {
    const ui = await setup();
    await ui.flush(
      await ui.expect1(),
      { code: 'AUTH_FORBIDDEN', message: 'texto del servidor' },
      403,
    );

    expect(ui.page().getByRole('alert').textContent).toContain('No se pudo cargar tu historial.');
    expect(ui.page().queryByText('Aún no tienes pagos.')).toBeNull();
    await ui.click(ui.page().getByRole('button', { name: 'Reintentar' }));
    const again = await ui.expect1();
    expect(again.request.params.has('after')).toBe(false);
    await ui.flush(again, PAGE([item(PENDING)]));
    expect(ui.rows()).toHaveLength(1);
  });

  it('keeps the rows shown when the next page fails, and retries that page', async () => {
    const ui = await setup();
    await ui.flush(await ui.expect1(), PAGE([item(PENDING)], 0, 'c2'));
    await ui.click(ui.page().getByRole('button', { name: 'Mostrar más' }));
    await ui.flush(await ui.expect1(), { code: 'X', message: 'Falló.' }, 500);

    expect(ui.rows()).toHaveLength(1);
    await ui.click(ui.page().getByRole('button', { name: 'Reintentar' }));
    const retry = await ui.expect1();
    expect(retry.request.params.get('after')).toBe('c2');
    await ui.flush(retry, PAGE([item(payment())]));
    expect(ui.rows()).toHaveLength(2);
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected the element to be on the page');
  }
  return value;
}
