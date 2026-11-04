import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import type { PeriodStatus } from '@core/services/guest-payments.service';
import type { StayPaymentStatus } from '@core/services/temporary-guest-payments.service';
import { GuestHomePanelComponent, unpaidText } from './guest-home-panel.component';
import { TemporaryHomePanelComponent } from './temporary-home-panel.component';

const isStatus = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/guest/account-status');
const isStay = (req: HttpRequest<unknown>) =>
  req.url.endsWith('/bff/temporary-guest/payment-status');

function period(overrides: Partial<PeriodStatus> = {}): PeriodStatus {
  return {
    period: '2026-09',
    status: 'UNPAID',
    dueDate: '2026-09-05',
    amount: 350,
    creditApplied: 0,
    amountDue: 350,
    contractId: 'c1',
    paymentId: null,
    rejectionReason: null,
    ...overrides,
  };
}

function stay(overrides: Partial<StayPaymentStatus> = {}): StayPaymentStatus {
  return {
    stayId: 'stay1',
    startDate: '2026-10-20',
    endDate: '2026-10-31',
    status: 'UNPAID',
    agreedAmount: 400,
    paymentId: null,
    rejectionReason: null,
    surplus: null,
    ...overrides,
  };
}

async function render<T>(component: Type<T>) {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(component);
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
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle();
  };
  return { ui, answer, click, http };
}

describe('home payment panels', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  describe('GuestHomePanelComponent (H1)', () => {
    it('offers «Corregir pago de …» with the reason for every rejected month', async () => {
      const { ui, answer } = await render(GuestHomePanelComponent);
      await answer(isStatus, [
        period({ period: '2026-08', status: 'PAID', paymentId: 'pay_ok' }),
        period({
          period: '2026-09',
          status: 'OVERDUE',
          paymentId: 'pay/rej',
          rejectionReason: 'El monto no coincide',
        }),
        period({ period: '2026-10', status: 'UNPAID' }),
        period({ period: '2026-11', status: 'UNDER_REVIEW', paymentId: 'pay_rev' }),
      ]);

      expect(ui.getByText('Tu pago no se aprobó')).toBeTruthy();
      expect(ui.getByText('El monto no coincide')).toBeTruthy();
      expect(
        ui.getByRole('link', { name: 'Corregir pago de Septiembre 2026' }).getAttribute('href'),
      ).toBe('/guest/payments/pay%2Frej');
      expect(ui.queryByRole('link', { name: /Corregir pago de Noviembre/ })).toBeNull();
      expect(ui.getByText(unpaidText(1))).toBeTruthy();
      expect(ui.getByRole('link', { name: 'Subir voucher' }).getAttribute('href')).toBe(
        '/guest/payments/new?period=2026-10',
      );
      expect(ui.getByRole('link', { name: 'Historial de pagos' }).getAttribute('href')).toBe(
        '/guest/payments',
      );
    });

    it('offers no correction when no payment was rejected, and counts the unpaid months', async () => {
      const { ui, answer } = await render(GuestHomePanelComponent);
      await answer(isStatus, [
        period({ period: '2026-10', status: 'OVERDUE' }),
        period({ period: '2026-11' }),
      ]);

      expect(ui.queryByText('Tu pago no se aprobó')).toBeNull();
      expect(ui.queryByRole('link', { name: /Corregir pago/ })).toBeNull();
      expect(
        ui.getByText('Tienes 2 períodos sin pagar. Sube tu voucher para que lo revisemos.'),
      ).toBeTruthy();
    });

    it('keeps «Subir voucher» and the history when the account status cannot be read', async () => {
      const { ui, answer, click, http } = await render(GuestHomePanelComponent);
      await answer(isStatus, { code: 'X', message: 'No se pudo leer tu estado.' }, 500);

      expect(ui.getByRole('alert').textContent).toContain('No se pudo leer tu estado.');
      expect(ui.getByRole('link', { name: 'Subir voucher' }).getAttribute('href')).toBe(
        '/guest/payments/new',
      );
      expect(ui.getByRole('link', { name: 'Historial de pagos' })).toBeTruthy();
      await click(ui.getByRole('button', { name: 'Reintentar' }));
      http.expectOne(isStatus).flush([]);
    });
  });

  describe('TemporaryHomePanelComponent (T1)', () => {
    it('shows the state of the stay and «Subir pago» when it is not paid', async () => {
      const { ui, answer } = await render(TemporaryHomePanelComponent);
      await answer(isStay, stay({ status: 'OVERDUE' }));

      expect(ui.getByText('Estadía 20 – 31 oct')).toBeTruthy();
      expect(ui.getByText('Atrasado')).toBeTruthy();
      expect(ui.getByRole('link', { name: 'Subir pago' }).getAttribute('href')).toBe(
        '/temporary-guest/payment',
      );
      expect(ui.queryByRole('link', { name: 'Corregir pago' })).toBeNull();
    });

    it('shows the reason and «Corregir pago» when the payment was rejected', async () => {
      const { ui, answer } = await render(TemporaryHomePanelComponent);
      await answer(
        isStay,
        stay({ status: 'UNPAID', paymentId: 'pay/t', rejectionReason: 'No se lee el voucher' }),
      );

      expect(ui.getByText('No se lee el voucher')).toBeTruthy();
      expect(ui.getByRole('link', { name: 'Corregir pago' }).getAttribute('href')).toBe(
        '/temporary-guest/payment/pay%2Ft',
      );
      expect(ui.queryByRole('link', { name: 'Subir pago' })).toBeNull();
    });

    it('offers «Ver pago» while the payment waits for its review, and nothing once paid', async () => {
      const first = await render(TemporaryHomePanelComponent);
      await first.answer(isStay, stay({ status: 'UNDER_REVIEW', paymentId: 'pay_t' }));

      expect(first.ui.getByText('Pendiente de revisión')).toBeTruthy();
      expect(first.ui.getByRole('link', { name: 'Ver pago' }).getAttribute('href')).toBe(
        '/temporary-guest/payment/pay_t',
      );
      expect(first.ui.queryByRole('link', { name: 'Subir pago' })).toBeNull();
    });

    it('shows the BFF text when the guest has no stay yet', async () => {
      const { ui, answer } = await render(TemporaryHomePanelComponent);
      await answer(
        isStay,
        { code: 'RESOURCE_NOT_FOUND', message: 'Aún no tienes una estadía registrada.' },
        404,
      );

      expect(ui.getByText('Aún no tienes una estadía registrada.')).toBeTruthy();
      expect(ui.queryByRole('alert')).toBeNull();
      expect(ui.queryByRole('link')).toBeNull();
    });
  });
});
