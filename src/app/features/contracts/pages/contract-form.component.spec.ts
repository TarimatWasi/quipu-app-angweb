import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, screen, within } from '@testing-library/dom';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ToastService } from '@shared/ui/toast/toast.service';
import { AdminContractsService } from '../data/admin-contracts.service';
import { ContractOptionsService } from '../data/contract-options.service';
import type { Environment, GuestDetail, GuestSummary } from '../model/contract-form';
import type { NewContract } from '../model/contract-form';
import { contractOf } from '../model/contract.testing';
import { ContractFormComponent } from './contract-form.component';

@Component({ template: 'lista' })
class ListStubComponent {}

const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();

const JULIA = {
  id: 'g1',
  documentType: 'DNI',
  documentNumber: '72310458',
  name: 'Julia Mendoza',
  type: 'CONTRACT',
  status: 'ACTIVE',
} as GuestSummary;

const room = (fields: Partial<Environment> = {}): Environment => ({
  id: 'e109',
  code: '109',
  type: 'ROOM',
  status: 'ACTIVE',
  occupant: null,
  nextOccupant: null,
  freeSince: '2026-10-15',
  deactivatedAt: null,
  version: 1,
  ...fields,
});
const BUSY = room({ id: 'e201', code: '201', occupant: { kind: 'CONTRACT' } as never });

const fail = (status: number, error: object) =>
  throwError(() => new HttpErrorResponse({ status, error }));

interface Options {
  readonly guests?: Observable<GuestSummary[]>;
  readonly guest?: Observable<GuestDetail>;
  readonly environments?: Observable<Environment[]>;
}

async function setup(path = '/admin/contracts/new', options: Options = {}) {
  const api = {
    create: vi.fn<(input: NewContract) => Observable<ReturnType<typeof contractOf>>>(() =>
      of(contractOf()),
    ),
  };
  const choices = {
    guests: vi.fn(() => options.guests ?? of([JULIA])),
    guest: vi.fn(() => options.guest ?? of({ ...JULIA, name: 'Julia Mendoza' } as GuestDetail)),
    environments: vi.fn(() => options.environments ?? of([room(), BUSY])),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/contracts', component: ListStubComponent },
        { path: 'admin/contracts/new', component: ContractFormComponent },
        { path: 'admin/guests/:id', component: ListStubComponent },
      ]),
      { provide: AdminContractsService, useValue: api },
      { provide: ContractOptionsService, useValue: choices },
    ],
  });
  const toast = vi.spyOn(ToastService.prototype, 'show');
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  await router.navigateByUrl(path);
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
  };
  await settle();
  const page = () => within(harness.routeNativeElement ?? document.body);
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle();
  };
  const type = async (label: string, value: string) => {
    fireEvent.input(page().getByLabelText(label), { target: { value } });
    await settle();
  };
  const choose = async (label: string, value: string) => {
    const select = page().getByLabelText(label);
    fireEvent.change(select, { target: { value } });
    fireEvent.input(select);
    await settle();
  };
  const attach = async (file: File) => {
    const input = harness.routeNativeElement?.querySelector<HTMLInputElement>('#contract-file');
    if (input === null || input === undefined) throw new Error('no file input');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    await settle();
  };
  const send = () => page().getByRole('button', { name: /Cargar contrato|Subiendo contrato…/ });
  const fillAll = async () => {
    await choose('Huésped', 'g1');
    await choose('Ambiente', 'e109');
    await type('Cuota mensual', '650.50');
    await type('Día de pago', '5');
    await type('Días de gracia', '3');
    await type('Inicio', '2026-11-01');
    await type('Fin (opcional)', '2027-10-31');
    await attach(new File(['pdf'], 'contrato.pdf', { type: 'application/pdf' }));
  };
  return { api, choices, router, toast, page, click, type, choose, attach, send, fillAll, settle };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('A4.1 «Cargar contrato»', () => {
  it('offers only the guests and the environments that are free, and says what is missing', async () => {
    const { page } = await setup();

    expect(page().getByRole('heading', { level: 1 }).textContent).toBe('Cargar contrato');
    expect(
      within(page().getByLabelText('Huésped'))
        .getAllByRole('option')
        .map((option) => text(option)),
    ).toEqual(['Elige un huésped', 'Julia Mendoza · DNI 72310458']);
    expect(
      within(page().getByLabelText('Ambiente'))
        .getAllByRole('option')
        .map((option) => text(option)),
    ).toEqual(['Elige un ambiente', 'Habitación 109 · libre desde el 15 oct 2026']);
    const side = text(page().getByRole('complementary'));
    expect(side).toContain('Falta elegirlo');
    expect(side).toContain('Falta la cuota');
    expect(side).toContain('Al cargarlo, el ambiente queda ocupado');
  });

  it('shows in the side what was chosen and typed as it goes', async () => {
    const { page, type, choose } = await setup();

    await choose('Huésped', 'g1');
    await choose('Ambiente', 'e109');
    await type('Cuota mensual', '650');
    await type('Día de pago', '5');
    await type('Días de gracia', '3');
    await type('Inicio', '2026-11-01');
    await type('Fin (opcional)', '2027-10-31');

    const side = text(page().getByRole('complementary'));
    expect(side).toContain('Julia Mendoza');
    expect(side).toContain('Habitación 109');
    expect(side).toContain('S/ 650.00');
    expect(side).toContain('5 de cada mes');
    expect(side).toContain('Sin atraso hasta el 8.');
    expect(side).toContain('1 nov 2026 – 31 oct 2027');
    expect(side).toContain('12 meses');
    expect(side).toContain('la habitación 109 queda ocupada y Julia Mendoza verá');
  });

  it('loads the contract with the PDF and the terms, goes back to A4 and says so', async () => {
    const { api, router, toast, send, click, fillAll } = await setup();

    await fillAll();
    await click(send());

    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create.mock.calls[0]?.[0]).toEqual({
      file: expect.objectContaining({ name: 'contrato.pdf' }) as unknown,
      environmentId: 'e109',
      guestId: 'g1',
      monthlyAmount: 650.5,
      paymentDay: 5,
      graceDays: 3,
      startDate: '2026-11-01',
      endDate: '2027-10-31',
    });
    await vi.waitFor(() => {
      expect(router.url).toBe('/admin/contracts');
    });
    expect(toast).toHaveBeenCalledWith('Contrato cargado.', { tone: 'success' });
  });

  it('sends no end date when it is left empty', async () => {
    const { api, send, click, fillAll, type } = await setup();

    await fillAll();
    await type('Fin (opcional)', '');
    await click(send());

    expect(api.create.mock.calls[0]?.[0].endDate).toBeNull();
  });

  it('points at each field that is empty or wrong and sends nothing', async () => {
    const { api, page, send, click, type } = await setup();

    await click(send());
    expect(api.create).not.toHaveBeenCalled();
    for (const message of [
      'Elige al huésped.',
      'Elige el ambiente.',
      'Escribe la cuota mensual.',
      'Escribe el día de pago.',
      'Escribe los días de gracia; si no hay, 0.',
      'Elige la fecha de inicio.',
      'Elige el PDF del contrato.',
    ]) {
      expect(page().getByText(message)).toBeTruthy();
    }

    await type('Cuota mensual', '0');
    await type('Día de pago', '35');
    await type('Inicio', '2026-11-01');
    await type('Fin (opcional)', '2026-10-31');
    expect(page().getByText(/La cuota debe ser mayor que 0/)).toBeTruthy();
    expect(page().getByText('El día de pago va del 1 al 31.')).toBeTruthy();
    expect(page().getByText('La fecha de fin debe ser posterior a la de inicio.')).toBeTruthy();
  });

  it('refuses a file that is not a PDF and lets it be removed', async () => {
    const { page, attach, click, send } = await setup();

    await attach(new File(['x'], 'foto.jpg', { type: 'image/jpeg' }));
    await click(send());
    expect(page().getByText('El archivo debe ser un PDF de 10 MB como máximo.')).toBeTruthy();

    await click(page().getByRole('button', { name: /Quitar/ }));
    expect(page().queryByText('foto.jpg')).toBeNull();
  });

  it('puts the refusal of the BFF under the field it names', async () => {
    const { api, page, send, click, fillAll } = await setup();
    api.create.mockReturnValue(
      fail(400, {
        code: 'CONTRACT_INVALID_DATES',
        message: 'Fin antes que inicio',
        field: 'endDate',
      }),
    );

    await fillAll();
    await click(send());

    expect(page().getByText('Fin antes que inicio')).toBeTruthy();
    expect(page().getByLabelText('Fin (opcional)').getAttribute('aria-invalid')).toBe('true');
  });

  it('puts a refused PDF under the file until another one is chosen', async () => {
    const { api, page, send, click, fillAll, attach } = await setup();
    api.create.mockReturnValue(
      fail(400, {
        code: 'CONTRACT_INVALID_FILE',
        message: 'No es un PDF válido',
        field: 'file',
      }),
    );

    await fillAll();
    await click(send());
    expect(page().getByText('No es un PDF válido')).toBeTruthy();

    await attach(new File(['otro'], 'otro.pdf', { type: 'application/pdf' }));
    expect(page().queryByText('No es un PDF válido')).toBeNull();
  });

  it('turns an occupied environment into a notice and clears the choice', async () => {
    const { api, page, send, click, fillAll } = await setup();
    api.create.mockReturnValue(fail(409, { code: 'ENVIRONMENT_OCCUPIED', message: 'ocupado' }));

    await fillAll();
    await click(send());

    const dialog = within(
      await screen.findByRole('alertdialog', {
        name: 'Habitación 109 ya tiene un contrato vigente',
      }),
    );
    await click(dialog.getByRole('button', { name: 'Elegir otro ambiente' }));

    await vi.waitFor(() => {
      expect(page().getByLabelText<HTMLSelectElement>('Ambiente').value).toBe('');
    });
  });

  it('says what a guest that cannot take a contract needs, with the message of the BFF for the debt', async () => {
    const { api, send, click, fillAll } = await setup();
    api.create.mockReturnValue(
      fail(409, { code: 'GUEST_HAS_PENDING_DEBT', message: 'Debe octubre', periods: ['2026-10'] }),
    );

    await fillAll();
    await click(send());

    const dialog = within(
      await screen.findByRole('alertdialog', { name: 'Julia Mendoza tiene deuda pendiente' }),
    );
    expect(dialog.getByText('Debe octubre')).toBeTruthy();
  });

  it('shows any other failure above the buttons', async () => {
    const { api, page, send, click, fillAll } = await setup();
    api.create.mockReturnValue(
      fail(503, { code: 'FILE_STORAGE_UNAVAILABLE', message: 'El almacenamiento no responde' }),
    );

    await fillAll();
    await click(send());

    expect(text(page().getByRole('alert'))).toContain('El almacenamiento no responde');
  });

  it('keeps the button busy while the file goes up', async () => {
    const pending = new Subject<ReturnType<typeof contractOf>>();
    const { api, send, click, fillAll } = await setup();
    api.create.mockReturnValue(pending);

    await fillAll();
    await click(send());

    expect(send().textContent).toContain('Subiendo contrato…');
    expect(send().hasAttribute('disabled')).toBe(true);
  });

  it('comes from the guest with it already chosen, and goes back to the guest', async () => {
    const { api, choices, router, page, click, send, type, choose, attach } = await setup(
      '/admin/contracts/new?guestId=g1',
    );

    expect(choices.guest).toHaveBeenCalledWith('g1');
    expect(choices.guests).not.toHaveBeenCalled();
    expect(page().queryByLabelText('Huésped')).toBeNull();
    expect(text(page().getByRole('complementary'))).toContain('Julia Mendoza');
    expect(
      page()
        .getByRole('link', { name: /Julia Mendoza/ })
        .getAttribute('href'),
    ).toBe('/admin/guests/g1');

    await choose('Ambiente', 'e109');
    await type('Cuota mensual', '650');
    await type('Día de pago', '5');
    await type('Días de gracia', '0');
    await type('Inicio', '2026-11-01');
    await attach(new File(['pdf'], 'c.pdf', { type: 'application/pdf' }));
    await click(send());

    expect(api.create.mock.calls[0]?.[0].guestId).toBe('g1');
    await vi.waitFor(() => {
      expect(router.url).toBe('/admin/guests/g1');
    });
  });

  it('goes to the list with a notice when the guest it comes from is not found', async () => {
    const { router, toast } = await setup('/admin/contracts/new?guestId=nadie', {
      guest: fail(404, { code: 'RESOURCE_NOT_FOUND', message: 'x' }),
    });

    await vi.waitFor(() => {
      expect(router.url).toBe('/admin/contracts');
    });
    expect(toast).toHaveBeenCalledWith('No se encontró el registro.');
  });

  it('says it could not load the form and tries again', async () => {
    const { choices, page, click } = await setup('/admin/contracts/new', {
      environments: throwError(() => new Error('down')),
    });

    expect(text(page().getByRole('alert'))).toContain('No se pudo cargar el formulario.');
    choices.environments.mockReturnValue(of([room()]));
    await click(page().getByRole('button', { name: 'Reintentar' }));

    expect(page().getByLabelText('Ambiente')).toBeTruthy();
  });
});
