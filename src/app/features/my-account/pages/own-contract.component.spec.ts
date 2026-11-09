import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import type { components } from '@core/api/bff.generated';
import { ToastService } from '@shared/ui/toast/toast.service';
import { GuestPaymentsService } from '../data/guest-payments.service';
import type { PeriodStatus } from '../data/guest-payments.service';
import { OwnContractService } from '../data/own-contract.service';
import type { OwnContracts } from '../data/own-contract.service';
import { OwnContractComponent } from './own-contract.component';

type Contract = components['schemas']['Contract'];

function contractOf(fields: Partial<Contract> = {}): Contract {
  return {
    id: 'c1',
    environmentId: 'e1',
    guestId: 'g1',
    guestName: 'Ana Quispe',
    documentType: 'DNI',
    documentNumber: '12345678',
    environmentCode: '201',
    environmentType: 'ROOM',
    monthlyAmount: 800,
    paymentDay: 5,
    graceDays: 3,
    startDate: '2020-03-01',
    endDate: null,
    status: 'ACTIVE',
    expiringSoon: false,
    terminatedAt: null,
    file: { name: 'contrato-201.pdf', sizeBytes: 880_640, uploadedAt: '2020-03-01T15:00:00Z' },
    fileUrl: 'https://files.example/c1',
    ...fields,
  };
}

function owed(period: string, amountDue = 800): PeriodStatus {
  return {
    period,
    status: 'UNPAID',
    dueDate: `${period}-05`,
    amount: 800,
    creditApplied: 0,
    amountDue,
    contractId: 'c1',
    paymentId: null,
    rejectionReason: null,
  };
}

interface Answers {
  contracts?: Observable<OwnContracts>;
  periods?: Observable<PeriodStatus[]>;
}

async function setup(answers: Answers = {}) {
  const contracts = {
    get: vi.fn<() => Observable<OwnContracts>>(
      () => answers.contracts ?? of({ current: contractOf(), next: null }),
    ),
  };
  const payments = {
    accountStatus: vi.fn<() => Observable<PeriodStatus[]>>(() => answers.periods ?? of([])),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'home', children: [] },
        { path: 'guest/contract', component: OwnContractComponent },
      ]),
      { provide: OwnContractService, useValue: contracts },
      { provide: GuestPaymentsService, useValue: payments },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await TestBed.inject(Router).navigateByUrl('/guest/contract');
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await harness.fixture.whenStable();
  };
  await settle();
  const page = () => within(harness.routeNativeElement ?? document.body);
  const toast = () => TestBed.inject(ToastService).current();
  return { contracts, payments, page, settle, toast };
}

const httpError = (status: number) => new HttpErrorResponse({ status, statusText: 'Error' });
const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();
/** A tile as it reads: its label, its value and its hint, each apart. */
const tileText = (tile: Element) =>
  [...tile.querySelectorAll('dt, dd')].map((part) => text(part)).join(' ');

describe('OwnContractComponent (H2)', () => {
  it('shows the state, what was agreed and the file of the contract in force', async () => {
    const ui = await setup();

    expect(ui.page().getByRole('heading', { level: 1 }).textContent).toBe('Mi contrato');
    expect(ui.page().getByText('Vigente')).toBeTruthy();
    expect(
      ui
        .page()
        .getByText('No tiene fecha de fin: sigue hasta que tú o la administración lo terminen.'),
    ).toBeTruthy();
    const facts = [
      ...ui
        .page()
        .getByRole('region', { name: 'Lo que acordaste' })
        .querySelectorAll('app-fact-tile'),
    ];
    expect(facts.map((tile) => tileText(tile))).toEqual([
      'Ambiente Habitación 201',
      'Cuota mensual S/ 800.00',
      'Día de pago 5 de cada mes Sin atraso hasta el 8.',
      'Días de gracia 3 días',
      'Desde 1 mar 2020',
      'Hasta Sin fecha de fin',
    ]);
    expect(ui.page().getByText('contrato-201.pdf')).toBeTruthy();
    const open = ui.page().getByRole('link', { name: 'Ver contrato' });
    expect(open.getAttribute('href')).toBe('https://files.example/c1');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(open.getAttribute('rel')).toBe('noopener noreferrer');
    expect(ui.page().queryByText('Tu próximo contrato')).toBeNull();
  });

  it('says there is no contract, as an empty state and not as an error', async () => {
    const ui = await setup({ contracts: throwError(() => httpError(404)) });

    expect(ui.page().getByText('Aún no tienes un contrato cargado.')).toBeTruthy();
    expect(ui.page().queryByText('No se pudo cargar tu contrato.')).toBeNull();
  });

  it('keeps the title and offers «Reintentar» when the contract does not load', async () => {
    const ui = await setup({ contracts: throwError(() => httpError(500)) });
    expect(ui.page().getByText('No se pudo cargar tu contrato.')).toBeTruthy();
    expect(ui.page().getByRole('heading', { level: 1 }).textContent).toBe('Mi contrato');

    ui.contracts.get.mockReturnValue(of({ current: contractOf(), next: null }));
    fireEvent.click(ui.page().getByRole('button', { name: 'Reintentar' }));
    await ui.settle();

    expect(ui.page().queryByText('No se pudo cargar tu contrato.')).toBeNull();
    expect(ui.page().getByText('contrato-201.pdf')).toBeTruthy();
  });

  it('still reads the contract when the account does not load', async () => {
    const ui = await setup({ periods: throwError(() => httpError(500)) });

    expect(ui.page().getByText('contrato-201.pdf')).toBeTruthy();
    expect(ui.page().queryByRole('alert')).toBeNull();
  });

  it('warns of what is owed on an ended contract and links to the account', async () => {
    const ui = await setup({
      contracts: of({
        current: contractOf({ status: 'TERMINATED', terminatedAt: '2020-10-15T15:00:00Z' }),
        next: null,
      }),
      periods: of([owed('2020-09'), owed('2020-10')]),
    });

    const alert = ui.page().getByRole('alert');
    expect(text(alert)).toContain('Quedó por pagar septiembre y octubre: S/ 1,600.00.');
    expect(
      within(alert).getByRole('link', { name: 'Ver estado de cuenta' }).getAttribute('href'),
    ).toBe('/home');
    expect(ui.page().getByText('Finalizado')).toBeTruthy();
  });

  it('shows the next contract below, with its own file and its button', async () => {
    const next = contractOf({
      id: 'c2',
      startDate: '2999-01-01',
      endDate: '2999-12-31',
      monthlyAmount: 850,
      file: { name: 'renovacion-201.pdf', sizeBytes: 931_840, uploadedAt: '2020-10-27T15:00:00Z' },
      fileUrl: 'https://files.example/c2',
    });
    const ui = await setup({
      contracts: of({ current: contractOf({ endDate: '2999-12-30' }), next }),
    });

    const section = within(ui.page().getByRole('region', { name: 'Tu próximo contrato' }));
    expect(section.getByText('Vigente')).toBeTruthy();
    expect(section.getByText('renovacion-201.pdf')).toBeTruthy();
    expect(section.getByText('Antes S/ 800.00.')).toBeTruthy();
    expect(section.getByRole('link', { name: 'Ver próximo contrato' }).getAttribute('href')).toBe(
      'https://files.example/c2',
    );
  });

  it('asks for new links instead of following one that may have expired', async () => {
    const ui = await setup();
    const open = ui.page().getByRole('link', { name: 'Ver contrato' });
    const later = Date.now() + 15 * 60_000;
    vi.spyOn(Date, 'now').mockReturnValue(later);

    const followed = fireEvent.click(open);
    await ui.settle();

    expect(followed).toBe(false);
    expect(ui.toast()?.text).toBe(
      'El enlace venció: ya hay uno nuevo, pulsa «Ver contrato» otra vez.',
    );
    expect(ui.contracts.get).toHaveBeenCalledTimes(2);
    vi.restoreAllMocks();
  });

  it('keeps the contract on screen when asking for new links fails (TAR-355)', async () => {
    const ui = await setup();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 15 * 60_000);
    ui.contracts.get.mockReturnValue(throwError(() => httpError(500)));

    fireEvent.click(ui.page().getByRole('link', { name: 'Ver contrato' }));
    await ui.settle();

    expect(ui.page().getByText('contrato-201.pdf')).toBeTruthy();
    expect(ui.page().getByText('No se pudo cargar tu contrato.')).toBeTruthy();
    expect(ui.page().getByRole('heading', { level: 1 }).textContent).toBe('Mi contrato');
    vi.restoreAllMocks();
  });

  it('says the storage failed when the link never came, with «Reintentar» to ask again', async () => {
    const ui = await setup({
      contracts: of({ current: contractOf({ fileUrl: null }), next: null }),
    });

    fireEvent.click(ui.page().getByRole('button', { name: 'Ver contrato' }));
    await ui.settle();
    expect(ui.toast()?.text).toBe('No se pudo acceder al archivo; inténtalo de nuevo más tarde.');
    expect(ui.toast()?.actionLabel).toBe('Reintentar');

    ui.contracts.get.mockReturnValue(of({ current: contractOf(), next: null }));
    TestBed.inject(ToastService).act();
    await ui.settle();

    expect(ui.contracts.get).toHaveBeenCalledTimes(2);
    expect(ui.page().getByRole('link', { name: 'Ver contrato' })).toBeTruthy();
  });

  it('lets a fresh link open as it is', async () => {
    const ui = await setup();

    const followed = fireEvent.click(ui.page().getByRole('link', { name: 'Ver contrato' }));

    expect(followed).toBe(true);
    expect(ui.contracts.get).toHaveBeenCalledTimes(1);
  });
});
