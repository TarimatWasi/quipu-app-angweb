import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import type { StayPaymentStatus } from '../data/temporary-guest-payments.service';
import { TemporaryHomeComponent } from './temporary-home.component';

const isStay = (req: HttpRequest<unknown>) =>
  req.url.endsWith('/bff/temporary-guest/payment-status');

const text = (element: Element) => element.textContent.replaceAll(/\s+/g, ' ').trim();

// Far in the past: the stay is over whatever day the test runs.
function stay(overrides: Partial<StayPaymentStatus> = {}): StayPaymentStatus {
  return {
    stayId: 's1',
    startDate: '2020-10-20',
    endDate: '2020-10-27',
    environmentCode: 'C1',
    environmentType: 'CABIN',
    status: 'OVERDUE',
    agreedAmount: 420,
    paymentId: null,
    rejectionReason: null,
    surplus: null,
    ...overrides,
  };
}

async function render() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(TemporaryHomeComponent);
  const http = TestBed.inject(HttpTestingController);
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    // A resource keeps the app unstable while it reads: tick instead of waiting for it.
    TestBed.tick();
  };
  await settle();
  const answer = async (body: object, status = 200) => {
    http.expectOne(isStay).flush(body, { status, statusText: 'x' });
    await settle();
  };
  return { ui: within(fixture.nativeElement as HTMLElement), answer, http, settle };
}

describe('T1 «Estado de pago»', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('keeps its title as it is while it loads, and only the data is a skeleton', async () => {
    const { ui, answer } = await render();

    expect(ui.getByRole('heading', { level: 1, name: 'Estado de pago' })).toBeTruthy();
    expect(ui.getByLabelText('Cargando tu estado de pago')).toBeTruthy();
    await answer(stay());
  });

  it('shows the agreed amount, the way to pay and the four tiles of the stay', async () => {
    const { ui, answer } = await render();
    await answer(stay());

    expect(ui.getByRole('heading', { name: 'Lo que toca ahora' })).toBeTruthy();
    expect(ui.getAllByText('S/ 420.00').length).toBeGreaterThan(0);
    expect(ui.getByRole('link', { name: 'Subir voucher' }).getAttribute('href')).toBe(
      '/temporary-guest/payment',
    );
    expect(ui.getByRole('heading', { name: 'Tu estadía' })).toBeTruthy();
    for (const label of ['Entrada', 'Salida', 'Noches', 'Monto acordado']) {
      expect(ui.getByText(label)).toBeTruthy();
    }
    expect(ui.getByText(/Se paga una sola vez por estadía/)).toBeTruthy();
  });

  it('says why the payment was not approved and corrects it', async () => {
    const { ui, answer } = await render();
    await answer(
      stay({ status: 'UNPAID', paymentId: 'pay/t', rejectionReason: 'No se lee el voucher' }),
    );

    expect(ui.getByText('Tu pago no se aprobó.')).toBeTruthy();
    expect(ui.getByText('Motivo: No se lee el voucher')).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Corregir pago' }).getAttribute('href')).toBe(
      '/temporary-guest/payment/pay%2Ft',
    );
    expect(ui.queryByRole('link', { name: 'Subir voucher' })).toBeNull();
  });

  it('lets the guest see the payment under review', async () => {
    const { ui, answer } = await render();
    await answer(stay({ status: 'UNDER_REVIEW', paymentId: 'pay_t' }));

    expect(ui.getByRole('link', { name: 'Ver pago' }).getAttribute('href')).toBe(
      '/temporary-guest/payment/pay_t',
    );
    expect(ui.queryByRole('link', { name: 'Subir voucher' })).toBeNull();
  });

  it('says the refund is pending or was made when more than the agreed amount was paid (RN-39)', async () => {
    const pending = await render();
    await pending.answer(
      stay({
        status: 'PAID',
        paymentId: 'pay_t',
        surplus: { amount: 50, refundStatus: 'PENDING', refundedOn: null, refundMethod: null },
      }),
    );
    expect(pending.ui.getByText('Te devolveremos S/ 50.00.')).toBeTruthy();
  });

  it('says there is no stay yet as an empty state, not as an error', async () => {
    const { ui, answer } = await render();
    await answer({ code: 'RESOURCE_NOT_FOUND', message: 'x' }, 404);

    expect(ui.getByText('Aún no tienes una estadía registrada')).toBeTruthy();
    expect(ui.queryByRole('alert')).toBeNull();
  });

  it('says that it could not load and reads again on «Reintentar»', async () => {
    const { ui, answer, http, settle } = await render();
    await answer({ code: 'X', message: 'x' }, 500);

    expect(text(ui.getByRole('alert'))).toContain('No se pudo cargar tu estado de pago.');
    fireEvent.click(ui.getByRole('button', { name: 'Reintentar' }));
    await settle();
    http.expectOne(isStay).flush(stay({ status: 'PAID', paymentId: 'p' }));
    await settle();

    expect(ui.queryByRole('alert')).toBeNull();
    expect(ui.getByText('Tu pago está aprobado. No tienes nada pendiente.')).toBeTruthy();
  });
});
