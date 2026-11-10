import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { screen, within } from '@testing-library/dom';
import { NEVER, of, throwError } from 'rxjs';
import {
  guestOf,
  httpError,
  linkReading,
  NO_PAYMENTS,
  paymentOf,
  setup,
  squash,
  words,
} from './guest-detail.testing';

const history = () => document.querySelector('app-guest-payments');

function rowsOf(section: Element): string[] {
  return [...section.querySelectorAll('tbody tr')].map((row) => words(row));
}

describe('GuestDetailComponent (A3.2 «Historial de pagos», RF-10)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('lists the payments of a guest with a contract under its months, each one opening A5.2', async () => {
    const ui = await setup({
      payments: () =>
        of({
          content: [
            paymentOf({
              id: 'p3',
              period: '2026-11',
              status: 'PENDING',
              amount: 850,
              verifiedAmount: null,
              voucherCount: 1,
              hasCash: true,
              submittedAt: '2026-11-04T02:00:00Z',
            }),
            paymentOf({
              id: 'p2',
              period: '2026-10',
              status: 'REJECTED',
              verifiedAmount: null,
              rejectionReason: 'No se lee el voucher.',
              submittedAt: '2026-10-05T15:00:00Z',
            }),
            paymentOf({ id: 'p1', verifiedAmount: 780, voucherCount: 2 }),
          ],
          nextCursor: null,
        }),
    });

    expect(ui.paymentsService.page).toHaveBeenCalledWith('g1', null);
    const section = ui.page().getByRole('region', { name: 'Historial de pagos' });
    // The months come first; the history goes under them, in the same column.
    const regions = [...ui.root().querySelectorAll('.charges > *')].map((each) => each.localName);
    expect(regions).toEqual(['app-period-payments', 'app-guest-payments']);
    // Lima is five hours behind: sent at 02:00 UTC on the 4th is the 3rd in Lima.
    // The reason of a rejected payment is a row of its own under it, read whole.
    expect(rowsOf(section)).toEqual([
      'Noviembre 2026 Enviado el 3 nov 2026 S/ 850.00 1 voucher y efectivo Pendiente de revisión Revisar pago de Noviembre 2026',
      'Octubre 2026 Enviado el 5 oct 2026 S/ 800.00 1 voucher Rechazado Corregir pago de Octubre 2026',
      'Motivo: No se lee el voucher.',
      'Septiembre 2026 Enviado el 5 sep 2026 S/ 780.00 2 vouchers Aprobado Ver pago de Septiembre 2026',
    ]);
    expect(linkReading(section, 'Revisar pago de Noviembre 2026').getAttribute('href')).toBe(
      '/admin/payments/p3',
    );
    expect(linkReading(section, 'Corregir pago de Octubre 2026').getAttribute('href')).toBe(
      '/admin/payments/p2',
    );
    expect(linkReading(section, 'Ver pago de Septiembre 2026').getAttribute('href')).toBe(
      '/admin/payments/p1',
    );
    expect(within(section).queryByRole('button', { name: 'Mostrar más' })).toBeNull();
  });

  it('asks the next page with the cursor of the BFF and adds it under the loaded rows', async () => {
    const ui = await setup({
      payments: (after) =>
        of(
          after === null
            ? { content: [paymentOf({ id: 'p2', period: '2026-10' })], nextCursor: 'b3BhY28=' }
            : { content: [paymentOf({ id: 'p1' })], nextCursor: null },
        ),
    });
    const section = ui.page().getByRole('region', { name: 'Historial de pagos' });
    expect(rowsOf(section)).toHaveLength(1);

    await ui.click(within(section).getByRole('button', { name: 'Mostrar más' }));

    expect(ui.paymentsService.page).toHaveBeenLastCalledWith('g1', 'b3BhY28=');
    expect(rowsOf(section).map((row) => row.split(' Enviado')[0])).toEqual([
      'Octubre 2026',
      'Septiembre 2026',
    ]);
    expect(within(section).queryByRole('button', { name: 'Mostrar más' })).toBeNull();
    // «Mostrar más» reads only the history, not the guest nor its months again.
    expect(ui.service.get).toHaveBeenCalledTimes(1);
    expect(ui.service.accountStatus).toHaveBeenCalledTimes(1);
  });

  it('says a guest with a contract has no payments yet', async () => {
    const ui = await setup({ payments: () => of(NO_PAYMENTS) });

    const section = ui.page().getByRole('region', { name: 'Historial de pagos' });
    expect(squash(section.textContent)).toContain(
      'Aún no tiene pagos.Aquí verás cada pago que envíe o que le registres, con su estado.',
    );
  });

  it('says only the history failed, keeps the rest of the page and tries it again', async () => {
    const ui = await setup({ payments: () => throwError(() => httpError(503)) });

    const section = ui.page().getByRole('region', { name: 'Historial de pagos' });
    expect(squash(within(section).getByRole('alert').textContent)).toBe(
      'No se pudo cargar el historial de pagos. Reintentar',
    );
    expect(ui.page().getByRole('region', { name: 'Pagos por mes' })).toBeTruthy();
    ui.paymentsService.page.mockReturnValueOnce(of({ content: [paymentOf()], nextCursor: null }));

    await ui.click(within(section).getByRole('button', { name: 'Reintentar' }));

    expect(ui.paymentsService.page).toHaveBeenCalledTimes(2);
    expect(within(section).queryByRole('alert')).toBeNull();
    expect(rowsOf(section)).toHaveLength(1);
  });

  it('is the same table in its skeleton while its first page loads', async () => {
    const ui = await setup({ payments: () => NEVER });

    const section = ui.page().getByRole('region', { name: 'Historial de pagos' });
    expect(section.querySelector('app-data-table [aria-busy="true"]')).not.toBeNull();
    expect(within(section).queryByRole('alert')).toBeNull();
  });

  it('reads the history again when the page is read again, keeping its rows meanwhile', async () => {
    const ui = await setup({
      detail: of(guestOf({ contract: undefined })),
      payments: () => of({ content: [paymentOf()], nextCursor: null }),
    });
    ui.paymentsService.page.mockReturnValue(NEVER);
    ui.service.get.mockReturnValue(of(guestOf({ status: 'INACTIVE', contract: undefined })));

    // Deactivating the guest reads it again, and its months and history with it (A3.3).
    await ui.click(ui.page().getByRole('button', { name: 'Desactivar huésped' }));
    await ui.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar huésped' }),
    );
    await vi.waitFor(() => {
      expect(ui.paymentsService.page).toHaveBeenCalledTimes(2);
    });

    expect(ui.paymentsService.page).toHaveBeenLastCalledWith('g1', null);
    const section = ui.page().getByRole('region', { name: 'Historial de pagos' });
    expect(rowsOf(section)).toHaveLength(1);
  });

  it('has no history for a temporary guest: each stay shows its payment', async () => {
    const ui = await setup({ detail: of(guestOf({ type: 'TEMPORARY', contract: undefined })) });

    expect(ui.paymentsService.page).not.toHaveBeenCalled();
    expect(history()).toBeNull();
  });

  it('does not read the history of a guest that cannot be charged yet', async () => {
    const ui = await setup({ detail: of(guestOf({ status: 'PENDING_ACTIVATION' })) });

    expect(ui.paymentsService.page).not.toHaveBeenCalled();
    expect(history()).toBeNull();
  });
});
