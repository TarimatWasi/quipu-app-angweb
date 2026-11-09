import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, screen, within } from '@testing-library/dom';
import { Observable, of, Subject, throwError } from 'rxjs';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import type { PeriodStatus } from '@core/api/clients/admin-guests.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { AdminContractsService } from '../data/admin-contracts.service';
import type { Contract } from '../model/contract';
import { contractOf } from '../model/contract.testing';
import { ContractDetailComponent } from './contract-detail.component';

@Component({ template: 'lista' })
class ListStubComponent {}

const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();

function month(period: string, status: PeriodStatus['status'], extra: Partial<PeriodStatus> = {}) {
  return {
    period,
    status,
    dueDate: `${period}-05`,
    amount: 800,
    creditApplied: 0,
    amountDue: 800,
    contractId: 'c1',
    paymentId: null,
    ...extra,
  } satisfies PeriodStatus;
}

const ACTIVE = contractOf({ guestName: 'Ana Quispe', environmentCode: '201' });
const OVERDUE = [month('2026-09', 'PAID'), month('2026-10', 'OVERDUE')];

async function setup(
  contract: Observable<Contract> = of(ACTIVE),
  periods: Observable<PeriodStatus[]> = of(OVERDUE),
) {
  const api = {
    get: vi.fn(() => contract),
    terminate: vi.fn(() => of(null)),
  };
  const guests = { accountStatus: vi.fn(() => periods) };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/contracts', component: ListStubComponent },
        { path: 'admin/contracts/:id', component: ContractDetailComponent },
      ]),
      { provide: AdminContractsService, useValue: api },
      { provide: AdminGuestsService, useValue: guests },
    ],
  });
  const toast = vi.spyOn(ToastService.prototype, 'show');
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  await router.navigateByUrl('/admin/contracts/c1');
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    // A resource keeps the app unstable while it reads: tick instead of waiting for it.
    TestBed.tick();
  };
  await settle();
  const page = () => within(harness.routeNativeElement ?? document.body);
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle();
  };
  return { api, guests, router, toast, page, click, settle };
}

afterEach(() => {
  vi.restoreAllMocks();
  TestBed.inject(ToastService);
});

describe('A4.2 «Detalle del contrato»', () => {
  it('puts the debt first with the way to register the payment', async () => {
    const { page, guests } = await setup();

    expect(page().getByRole('heading', { level: 1 }).textContent).toBe('Contrato de Ana Quispe');
    expect(guests.accountStatus).toHaveBeenCalledWith('g1');
    const panel = page().getByRole('region', { name: 'Lo que toca ahora' });
    expect(text(panel)).toContain('S/ 800.00');
    expect(text(panel)).toContain('por pagar');
    expect(text(panel)).toContain('Octubre 2026: venció el 5 oct');
    expect(text(panel)).toContain('Atrasado');
    const register = within(panel).getByRole('link', { name: 'Registrar pago' });
    expect(register.getAttribute('href')).toBe('/admin/payments/new?guestId=g1');
  });

  it('lists only the months of this contract, the latest first', async () => {
    const { page } = await setup(
      of(ACTIVE),
      of([...OVERDUE, month('2026-10', 'PAID', { contractId: 'otro' })]),
    );

    const table = within(page().getByRole('table', { name: 'Pagos por mes' }));
    expect(table.getAllByRole('rowheader').map((header) => text(header))).toEqual([
      'Octubre 2026',
      'Septiembre 2026',
    ]);
    expect(text(page().getByText(/Solo los meses de este contrato/))).toContain(
      'del más reciente al más antiguo',
    );
  });

  it('writes what was agreed and the file, which opens in a new tab', async () => {
    const { page } = await setup();

    const side = text(page().getByRole('complementary'));
    expect(side).toContain('Ana Quispe');
    expect(side).toContain('DNI 43219087');
    expect(side).toContain('Habitación 201');
    expect(side).toContain('S/ 650.00');
    expect(side).toContain('5 de cada mes');
    expect(side).toContain('1 abr 2026 – 31 mar 2027');
    expect(side).toContain('contrato-101.pdf');
    expect(side).toContain('PDF · 840 KB');
    const open = page().getByRole('link', { name: /Ver contrato \(PDF\)/ });
    expect(open.getAttribute('href')).toBe('/files/contrato-101.pdf');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toBe('noopener');
    expect(page().getByRole('link', { name: 'Ver huésped' }).getAttribute('href')).toBe(
      '/admin/guests/g1',
    );
  });

  it('asks again for the PDF when the storage could not sign it', async () => {
    const { api, page, click, toast } = await setup(of({ ...ACTIVE, fileUrl: null }));

    await click(page().getByRole('button', { name: 'Ver contrato (PDF)' }));

    expect(toast).toHaveBeenCalledWith(
      'No se pudo acceder al archivo; inténtalo de nuevo más tarde.',
      expect.objectContaining({ actionLabel: 'Reintentar' }),
    );
    const options = toast.mock.calls.at(-1)?.[1];
    options?.action?.();
    await vi.waitFor(() => {
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it('finalizes after saying what changes, and reads the contract again', async () => {
    const { api, page, click, toast } = await setup();

    await click(page().getByRole('button', { name: 'Finalizar contrato' }));
    const dialog = within(
      await screen.findByRole('dialog', { name: '¿Finalizar el contrato de Ana Quispe?' }),
    );
    expect(dialog.getByText('La habitación 201 queda libre desde hoy.')).toBeTruthy();
    expect(
      dialog.getByText('Sigue debiendo octubre 2026 (S/ 800.00) hasta que lo pague.'),
    ).toBeTruthy();
    expect(api.terminate).not.toHaveBeenCalled();
    await click(dialog.getByRole('button', { name: 'Finalizar contrato' }));

    expect(api.terminate).toHaveBeenCalledWith('c1');
    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Contrato finalizado.', { tone: 'success' });
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('does not finalize when the dialog is cancelled', async () => {
    const { api, page, click } = await setup();

    await click(page().getByRole('button', { name: 'Finalizar contrato' }));
    const dialog = within(await screen.findByRole('dialog'));
    await click(dialog.getByRole('button', { name: 'Cancelar' }));

    expect(api.terminate).not.toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('keeps the dialog open and says why when finalizing fails', async () => {
    const { api, page, click } = await setup();
    api.terminate.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { code: 'UNEXPECTED_ERROR', message: 'No se pudo finalizar' },
          }),
      ),
    );

    await click(page().getByRole('button', { name: 'Finalizar contrato' }));
    const dialog = within(await screen.findByRole('dialog'));
    await click(dialog.getByRole('button', { name: 'Finalizar contrato' }));

    expect(dialog.getByRole('alert').textContent).toContain('Ocurrió un error inesperado');
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('shows the busy button while it finalizes', async () => {
    const pending = new Subject<null>();
    const { api, page, click } = await setup();
    api.terminate.mockReturnValue(pending);

    await click(page().getByRole('button', { name: 'Finalizar contrato' }));
    const dialog = within(await screen.findByRole('dialog'));
    await click(dialog.getByRole('button', { name: 'Finalizar contrato' }));

    expect(dialog.getByRole('button', { name: 'Finalizando…' }).hasAttribute('disabled')).toBe(
      true,
    );
  });

  it('offers no way to finalize a contract that already ended, and says the debt stays', async () => {
    const { page } = await setup(
      of({ ...ACTIVE, status: 'TERMINATED', terminatedAt: '2026-10-15' } satisfies Contract),
    );

    expect(page().queryByRole('button', { name: 'Finalizar contrato' })).toBeNull();
    expect(text(page().getByRole('region', { name: 'Lo que toca ahora' }))).toContain(
      'Finalizar el contrato no borra la deuda',
    );
    expect(text(page().getByRole('complementary'))).toContain('Finalizado');
  });

  it('says there are no months yet for a contract that has not begun', async () => {
    const { page } = await setup(of({ ...ACTIVE, startDate: '2999-01-01', endDate: null }), of([]));

    expect(page().getByText('Aún no hay meses por cobrar.')).toBeTruthy();
    expect(page().getByText(/El primer mes es enero/)).toBeTruthy();
  });

  it('goes to the list with a notice when the contract is not found', async () => {
    const { router, toast } = await setup(
      throwError(
        () => new HttpErrorResponse({ status: 404, error: { code: 'RESOURCE_NOT_FOUND' } }),
      ),
    );

    await vi.waitFor(() => {
      expect(router.url).toBe('/admin/contracts');
    });
    expect(toast).toHaveBeenCalledWith('No se encontró el contrato.');
  });

  it('says it could not load and asks again on «Reintentar»', async () => {
    const { api, page, click } = await setup(throwError(() => new Error('down')));
    api.get.mockReturnValue(of(ACTIVE));

    expect(text(page().getByRole('alert'))).toContain('No se pudo cargar el contrato.');
    await click(page().getByRole('button', { name: 'Reintentar' }));

    expect(page().getByRole('heading', { level: 1 }).textContent).toBe('Contrato de Ana Quispe');
  });
});
