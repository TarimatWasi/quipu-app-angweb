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
  const rows = () => [...present(harness.routeNativeElement).querySelectorAll('.history > li')];
  return { http, page, click, expect1, flush, rows };
}

describe('GuestHistoryComponent (H4)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lists the own payments with their state, the rejected one with its reason and «Corregir pago»', async () => {
    const ui = await setup();
    expect(
      ui.page().getByRole('region', { name: 'Cargando tus pagos' }).getAttribute('aria-busy'),
    ).toBe('true');
    const req = await ui.expect1();
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.has('after')).toBe(false);
    await ui.flush(req, {
      content: [item(PENDING), item(REJECTED), item(payment())],
      nextCursor: null,
      creditBalance: 0,
    });

    const [pending, rejected, approved] = ui.rows().map((row) => within(row as HTMLElement));
    expect(ui.rows()).toHaveLength(3);
    expect(pending?.getByText('Noviembre 2026')).toBeTruthy();
    expect(pending?.getByText('Pendiente de revisión')).toBeTruthy();
    expect(pending?.getByRole('link', { name: 'Ver pago' }).getAttribute('href')).toBe(
      '/guest/payments/pay_pen',
    );
    expect(rejected?.getByText('Rechazado')).toBeTruthy();
    expect(rejected?.getByText('No se lee el voucher')).toBeTruthy();
    expect(rejected?.getByText(/Efectivo · agregado por la administración/)).toBeTruthy();
    expect(rejected?.getByRole('link', { name: 'Corregir pago' }).getAttribute('href')).toBe(
      '/guest/payments/pay%2Frej',
    );
    expect(approved?.getByText('Aprobado')).toBeTruthy();
    expect(
      approved?.getByText(/Voucher · Yape · enviado por ti · declarado S\/ 350.00/),
    ).toBeTruthy();
    expect(approved?.queryByRole('link')).toBeNull();
    expect(ui.page().queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('asks the next page with the cursor of the previous one and adds it below', async () => {
    const ui = await setup();
    await ui.flush(await ui.expect1(), {
      content: [item(PENDING)],
      nextCursor: 'cursor+1/==',
      creditBalance: 0,
    });

    await ui.click(ui.page().getByRole('button', { name: 'Mostrar más' }));
    const next = await ui.expect1();
    expect(next.request.params.get('after')).toBe('cursor+1/==');
    await ui.flush(next, { content: [item(payment())], nextCursor: null, creditBalance: 0 });

    expect(ui.rows()).toHaveLength(2);
    expect(ui.page().queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('shows the refunds labelled Devuelto and the credit the guest has', async () => {
    const ui = await setup();
    await ui.flush(await ui.expect1(), {
      content: [
        {
          kind: 'REFUND',
          payment: null,
          refund: {
            id: 'r1',
            date: '2026-11-03',
            method: 'Yape',
            amount: 120,
            fromPaymentId: 'pay1',
          },
        },
        item(payment({ surplus: { amount: 20, outcome: 'CREDIT' } })),
      ],
      nextCursor: null,
      creditBalance: 20,
    });

    const [refund, paid] = ui.rows().map((row) => within(row as HTMLElement));
    expect(refund?.getByText('Devuelto')).toBeTruthy();
    expect(refund?.getByText('3 nov 2026')).toBeTruthy();
    expect(refund?.getByText('S/ 120.00 · Yape')).toBeTruthy();
    expect(paid?.getByText(/Sobraron S\/ 20.00: quedó como crédito a favor/)).toBeTruthy();
    expect(ui.page().getByText('Tienes S/ 20.00 a favor.')).toBeTruthy();
  });

  it('says when there is no payment yet', async () => {
    const ui = await setup();
    await ui.flush(await ui.expect1(), { content: [], nextCursor: null, creditBalance: 0 });

    expect(ui.page().getByText('Aún no tienes pagos.')).toBeTruthy();
    expect(ui.page().queryByText(/a favor/)).toBeNull();
  });

  it('shows the BFF text when the history cannot be read and tries again', async () => {
    const ui = await setup();
    await ui.flush(
      await ui.expect1(),
      { code: 'AUTH_FORBIDDEN', message: 'No puedes ver este historial.' },
      403,
    );

    expect(ui.page().getByRole('alert').textContent).toContain('No puedes ver este historial.');
    expect(ui.page().queryByText('Aún no tienes pagos.')).toBeNull();
    await ui.click(ui.page().getByRole('button', { name: 'Reintentar' }));
    expect(
      ui.page().getByRole<HTMLButtonElement>('button', { name: 'Cargando\u2026' }).disabled,
    ).toBe(true);
    expect(ui.page().queryByRole('region', { name: 'Cargando tus pagos' })).toBeNull();
    const again = await ui.expect1();
    expect(again.request.params.has('after')).toBe(false);
    await ui.flush(again, { content: [item(PENDING)], nextCursor: null, creditBalance: 0 });
    expect(ui.rows()).toHaveLength(1);
  });

  it('keeps the rows shown when the next page fails, and retries that page', async () => {
    const ui = await setup();
    await ui.flush(await ui.expect1(), {
      content: [item(PENDING)],
      nextCursor: 'c2',
      creditBalance: 0,
    });
    await ui.click(ui.page().getByRole('button', { name: 'Mostrar más' }));
    await ui.flush(await ui.expect1(), { code: 'X', message: 'Falló.' }, 500);

    expect(ui.rows()).toHaveLength(1);
    await ui.click(ui.page().getByRole('button', { name: 'Reintentar' }));
    const retry = await ui.expect1();
    expect(retry.request.params.get('after')).toBe('c2');
    await ui.flush(retry, { content: [item(payment())], nextCursor: null, creditBalance: 0 });
    expect(ui.rows()).toHaveLength(2);
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected the element to be on the page');
  }
  return value;
}
