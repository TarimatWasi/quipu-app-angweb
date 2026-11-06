import { HttpRequest, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import type { PeriodStatus } from '../data/guest-payments.service';
import type { StayPaymentStatus } from '../data/temporary-guest-payments.service';
import { GuestHomePanelComponent, unpaidText } from './guest-home-panel.component';
import { TemporaryHomePanelComponent } from './temporary-home-panel.component';

const isStatus = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/guest/account-status');
const isCredit = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/guest/credit');
const NO_CREDIT = { balance: 0, toRefund: false, origins: [], lastRefund: null };
const isStay = (req: HttpRequest<unknown>) =>
  req.url.endsWith('/bff/temporary-guest/payment-status');

/** The visible text of an element, with its spaces collapsed. */
const text = (element: HTMLElement) => element.textContent.replaceAll(/\s+/g, ' ').trim();
/** The texts of the parts of a row, one per child element. */
const parts = (row: HTMLElement) => [...row.children].map((part) => text(part as HTMLElement));

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
      await answer(isCredit, NO_CREDIT);

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
      await answer(isCredit, NO_CREDIT);

      expect(ui.queryByText('Tu pago no se aprobó')).toBeNull();
      expect(ui.queryByRole('link', { name: /Corregir pago/ })).toBeNull();
      expect(
        ui.getByText('Tienes 2 períodos sin pagar. Sube tu voucher para que lo revisemos.'),
      ).toBeTruthy();
    });

    it('keeps «Subir voucher» and the history when the account status cannot be read', async () => {
      const { ui, answer, click, http } = await render(GuestHomePanelComponent);
      await answer(isStatus, { code: 'X', message: 'No se pudo leer tu estado.' }, 500);
      await answer(isCredit, NO_CREDIT);

      expect(ui.getByRole('alert').textContent).toContain('No se pudo leer tu estado.');
      expect(ui.getByRole('link', { name: 'Subir voucher' }).getAttribute('href')).toBe(
        '/guest/payments/new',
      );
      expect(ui.getByRole('link', { name: 'Historial de pagos' })).toBeTruthy();
      await click(ui.getByRole('button', { name: 'Reintentar' }));
      http.expectOne(isStatus).flush([]);
      http.expectNone(isCredit);
    });

    it('shows the credit in a notice and what is left to pay of each month (RN-38)', async () => {
      const { ui, answer } = await render(GuestHomePanelComponent);
      await answer(isStatus, [
        period({ period: '2026-09', status: 'PAID', paymentId: 'pay_ok' }),
        period({ period: '2026-10', status: 'OVERDUE', creditApplied: 0, amountDue: 350 }),
        period({ period: '2026-11', status: 'UNPAID', creditApplied: 50, amountDue: 300 }),
      ]);
      await answer(isCredit, { balance: 50, toRefund: false, origins: [], lastRefund: null });

      expect(text(ui.getByRole('note', { name: 'Crédito a favor' }))).toBe(
        'Tienes S/ 50.00 a favor. Sobró de un pago anterior y se descuenta de Noviembre 2026.',
      );
      expect(ui.getByRole('heading', { name: 'Lo que toca ahora' })).toBeTruthy();
      expect(ui.getAllByRole('listitem').map(parts)).toEqual([
        ['Octubre 2026', 'Atrasado', 'Por pagar S/ 350.00'],
        [
          'Noviembre 2026',
          'No pagado',
          'Por pagar S/ 300.00',
          'Cuota S/ 350.00 − crédito a favor S/ 50.00',
        ],
      ]);
    });

    it('says which payments the credit was left over from (TAR-284)', async () => {
      const { ui, answer } = await render(GuestHomePanelComponent);
      await answer(isStatus, [period({ period: '2026-10', status: 'PAID', paymentId: 'p' })]);
      await answer(isCredit, {
        balance: 80,
        toRefund: false,
        origins: [
          { paymentId: 'pay_sep', period: '2026-09', amount: 30 },
          { paymentId: 'pay_oct', period: '2026-10', amount: 50 },
        ],
        lastRefund: null,
      });

      expect(text(ui.getByRole('note', { name: 'Crédito a favor' }))).toBe(
        'Tienes S/ 80.00 a favor. Sobró de tus pagos de septiembre y octubre y se descuenta de tu próxima cuota.',
      );
    });

    it('names the one payment the credit was left over from', async () => {
      const { ui, answer } = await render(GuestHomePanelComponent);
      await answer(isStatus, []);
      await answer(isCredit, {
        balance: 50,
        toRefund: false,
        origins: [{ paymentId: 'pay_oct', period: '2026-10', amount: 50 }],
        lastRefund: null,
      });

      expect(text(ui.getByRole('note', { name: 'Crédito a favor' }))).toBe(
        'Tienes S/ 50.00 a favor. Sobró de tu pago de octubre y se descuenta de tu próxima cuota.',
      );
    });

    it('says the credit goes to the next monthly amount when no month shows it yet', async () => {
      const { ui, answer } = await render(GuestHomePanelComponent);
      await answer(isStatus, [period({ period: '2026-10', status: 'PAID', paymentId: 'p' })]);
      await answer(isCredit, { balance: 80.5, toRefund: false, origins: [], lastRefund: null });

      expect(text(ui.getByRole('note', { name: 'Crédito a favor' }))).toBe(
        'Tienes S/ 80.50 a favor. Sobró de un pago anterior y se descuenta de tu próxima cuota.',
      );
      expect(ui.queryByRole('heading', { name: 'Lo que toca ahora' })).toBeNull();
    });

    it('says the credit will be refunded when no month is left to use it', async () => {
      const { ui, answer } = await render(GuestHomePanelComponent);
      await answer(isCredit, { balance: 120, toRefund: true, origins: [], lastRefund: null });
      await answer(isStatus, [period({ period: '2026-10', status: 'PAID', paymentId: 'p' })]);

      expect(text(ui.getByRole('note', { name: 'Crédito a favor' }))).toBe(
        'Tienes S/ 120.00 a favor. Sobró de un pago anterior y ya no quedan meses donde descontarlo: te lo devolveremos.',
      );
    });

    it('shows no notice and the whole monthly amount when there is no credit', async () => {
      const { ui, answer } = await render(GuestHomePanelComponent);
      await answer(isStatus, [period({ period: '2026-11', status: 'UNPAID' })]);
      await answer(isCredit, NO_CREDIT);

      expect(ui.queryByRole('note', { name: 'Crédito a favor' })).toBeNull();
      expect(ui.queryByText(/a favor/)).toBeNull();
      expect(parts(ui.getByRole('listitem'))).toEqual([
        'Noviembre 2026',
        'No pagado',
        'Por pagar S/ 350.00',
      ]);
    });

    it('keeps the home working without the notice when the credit cannot be read', async () => {
      const { ui, answer } = await render(GuestHomePanelComponent);
      await answer(isCredit, { code: 'X', message: 'Falló el crédito.' }, 500);
      await answer(isStatus, [
        period({ period: '2026-11', status: 'UNPAID', creditApplied: 50, amountDue: 300 }),
      ]);

      expect(ui.queryByRole('note', { name: 'Crédito a favor' })).toBeNull();
      expect(ui.queryByRole('alert')).toBeNull();
      expect(ui.queryByText('Falló el crédito.')).toBeNull();
      expect(text(ui.getByRole('listitem'))).toContain('Por pagar S/ 300.00');
      expect(ui.getByRole('link', { name: 'Subir voucher' }).getAttribute('href')).toBe(
        '/guest/payments/new?period=2026-11',
      );
    });

    it('asks the credit again on «Reintentar» and shows it once it answers', async () => {
      const { ui, answer, click } = await render(GuestHomePanelComponent);
      await answer(isStatus, { code: 'X', message: 'No se pudo leer tu estado.' }, 500);
      await answer(isCredit, { code: 'X', message: 'x' }, 503);
      expect(ui.queryByRole('note', { name: 'Crédito a favor' })).toBeNull();

      await click(ui.getByRole('button', { name: 'Reintentar' }));
      await answer(isStatus, []);
      await answer(isCredit, { balance: 20, toRefund: false, origins: [], lastRefund: null });
      expect(text(ui.getByRole('note', { name: 'Crédito a favor' }))).toContain(
        'Tienes S/ 20.00 a favor.',
      );
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

    it('says the refund is pending when more than the agreed amount was paid (RN-39)', async () => {
      const { ui, answer } = await render(TemporaryHomePanelComponent);
      await answer(
        isStay,
        stay({
          status: 'PAID',
          paymentId: 'pay_t',
          surplus: { amount: 50, refundStatus: 'PENDING', refundedOn: null, refundMethod: null },
        }),
      );

      expect(text(ui.getByRole('note', { name: 'Devolución' }))).toBe('Te devolveremos S/ 50.00.');
    });

    it('says the refund was made, with its method and date', async () => {
      const { ui, answer } = await render(TemporaryHomePanelComponent);
      await answer(
        isStay,
        stay({
          status: 'PAID',
          paymentId: 'pay_t',
          surplus: {
            amount: 50,
            refundStatus: 'REFUNDED',
            refundedOn: '2026-11-03',
            refundMethod: 'Yape',
          },
        }),
      );

      expect(text(ui.getByRole('note', { name: 'Devolución' }))).toBe(
        'Te devolvimos S/ 50.00 el 3 nov 2026 por Yape.',
      );
      expect(ui.queryByText(/Te devolveremos/)).toBeNull();
    });

    it('shows no refund notice when nothing was paid over the agreed amount', async () => {
      const { ui, answer } = await render(TemporaryHomePanelComponent);
      await answer(isStay, stay({ status: 'PAID', paymentId: 'pay_t', surplus: null }));

      expect(ui.queryByRole('note', { name: 'Devolución' })).toBeNull();
      expect(ui.queryByText(/devol/)).toBeNull();
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
