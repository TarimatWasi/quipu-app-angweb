import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import type { GuestCredit, PeriodStatus } from '../data/guest-payments.service';
import { GuestHomeComponent } from './guest-home.component';

const isStatus = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/guest/account-status');
const isCredit = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/guest/credit');
const NO_CREDIT: GuestCredit = { balance: 0, toRefund: false, origins: [], lastRefund: null };

const text = (element: Element) => element.textContent.replaceAll(/\s+/g, ' ').trim();

// Far in the past: the page says «Venció» whatever day the test runs.
function period(overrides: Partial<PeriodStatus> = {}): PeriodStatus {
  return {
    period: '2020-09',
    status: 'OVERDUE',
    dueDate: '2020-09-05',
    amount: 800,
    creditApplied: 0,
    amountDue: 800,
    contractId: 'c1',
    paymentId: null,
    rejectionReason: null,
    ...overrides,
  };
}

async function render() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(GuestHomeComponent);
  const http = TestBed.inject(HttpTestingController);
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  };
  await settle();
  const answer = async (
    match: (req: HttpRequest<unknown>) => boolean,
    body: object,
    status = 200,
  ) => {
    http.expectOne(match).flush(body, { status, statusText: 'x' });
    await settle();
  };
  const ui = within(fixture.nativeElement as HTMLElement);
  return { ui, answer, http, settle };
}

describe('H1 «Estado de cuenta»', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps its title and «Lo que toca ahora» as they are while it loads, and only the data is a skeleton', async () => {
    const { ui, answer } = await render();

    expect(ui.getByRole('heading', { level: 1, name: 'Estado de cuenta' })).toBeTruthy();
    expect(ui.getByLabelText('Cargando tu estado de cuenta')).toBeTruthy();
    await answer(isStatus, []);
    await answer(isCredit, NO_CREDIT);
  });

  it('puts what is owed first, with the way to upload the voucher, and every month below', async () => {
    const { ui, answer } = await render();
    await answer(isStatus, [
      period({ period: '2020-08', status: 'PAID', paymentId: 'p8' }),
      period({ period: '2020-09' }),
    ]);
    await answer(isCredit, NO_CREDIT);

    expect(ui.getByRole('heading', { name: 'Lo que toca ahora' })).toBeTruthy();
    expect(ui.getAllByText('S/ 800.00').length).toBeGreaterThan(0);
    expect(ui.getByRole('link', { name: 'Subir voucher de septiembre' }).getAttribute('href')).toBe(
      '/guest/payments/new?period=2020-09',
    );
    expect(ui.getByRole('heading', { name: 'Tus meses' })).toBeTruthy();
    // The table and, for a phone, the cards: the same action twice.
    expect(
      ui.getAllByRole('link', { name: /^Ver pago/ }).map((link) => link.getAttribute('href')),
    ).toContain('/guest/payments/p8');
    expect(ui.getByRole('link', { name: 'Ver el historial de pagos' }).getAttribute('href')).toBe(
      '/guest/payments',
    );
  });

  it('says why a payment was not approved and offers to correct it, never to pay again', async () => {
    const { ui, answer } = await render();
    await answer(isStatus, [
      period({ paymentId: 'pay/rej', rejectionReason: 'El monto no coincide' }),
    ]);
    await answer(isCredit, NO_CREDIT);

    expect(ui.getByText('Tu pago de septiembre no se aprobó.')).toBeTruthy();
    expect(ui.getAllByText(/El monto no coincide/).length).toBeGreaterThan(0);
    expect(ui.getByRole('link', { name: 'Corregir pago de septiembre' }).getAttribute('href')).toBe(
      '/guest/payments/pay%2Frej',
    );
    expect(ui.queryByRole('link', { name: /Subir voucher/ })).toBeNull();
  });

  it('shows the credit in a notice and what is left to pay of the month (RN-38)', async () => {
    const { ui, answer } = await render();
    await answer(isStatus, [period({ creditApplied: 50, amountDue: 750 })]);
    await answer(isCredit, { balance: 50, toRefund: false, origins: [], lastRefund: null });

    expect(ui.getByText('Tienes S/ 50.00 a favor.')).toBeTruthy();
    expect(ui.getAllByText('S/ 750.00').length).toBeGreaterThan(0);
    expect(ui.getAllByText('Cuota S/ 800.00 − crédito a favor S/ 50.00').length).toBeGreaterThan(0);
  });

  it('keeps the page working without the notice when the credit cannot be read', async () => {
    const { ui, answer } = await render();
    await answer(isStatus, [period()]);
    await answer(isCredit, { code: 'X', message: 'Falló el crédito.' }, 500);

    expect(ui.queryByText(/a favor/)).toBeNull();
    expect(ui.queryByText('Falló el crédito.')).toBeNull();
    expect(ui.getByRole('link', { name: 'Subir voucher de septiembre' })).toBeTruthy();
  });

  it('says «Al día» when there is nothing to pay', async () => {
    const { ui, answer } = await render();
    await answer(isStatus, [period({ status: 'PAID', paymentId: 'p1' })]);
    await answer(isCredit, NO_CREDIT);

    expect(ui.getByText('Al día')).toBeTruthy();
    expect(ui.getByText('Todos tus meses están pagados')).toBeTruthy();
    expect(ui.queryByRole('link', { name: /Subir voucher|Corregir pago de/ })).toBeNull();
  });

  it('shows the months and their actions even if the credit never answers', async () => {
    const { ui, answer, http, settle } = await render();
    await answer(isStatus, [period()]);

    expect(ui.getByRole('link', { name: 'Subir voucher de septiembre' })).toBeTruthy();
    expect(ui.queryByLabelText('Cargando tu estado de cuenta')).toBeNull();
    // It answers late: the notice appears without the page moving.
    http.expectOne(isCredit).flush({ balance: 50, toRefund: false, origins: [], lastRefund: null });
    await settle();
    expect(ui.getByText('Tienes S/ 50.00 a favor.')).toBeTruthy();
  });

  it('says that it could not load and reads again on «Reintentar»', async () => {
    const { ui, answer, http, settle } = await render();
    await answer(isStatus, { code: 'X', message: 'x' }, 500);
    await answer(isCredit, NO_CREDIT);

    expect(text(ui.getByRole('alert'))).toContain('No se pudo cargar tu estado de cuenta.');
    fireEvent.click(ui.getByRole('button', { name: 'Reintentar' }));
    await settle();
    http.expectOne(isStatus).flush([]);
    http.expectOne(isCredit).flush(NO_CREDIT);
    await settle();

    expect(ui.queryByRole('alert')).toBeNull();
    // The panel and the empty months say it: both, once the months read again.
    expect(ui.getAllByText('Aún no tienes meses por pagar.').length).toBeGreaterThan(0);
  });
});
