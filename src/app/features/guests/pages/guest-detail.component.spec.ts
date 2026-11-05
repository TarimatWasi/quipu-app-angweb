import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, screen, within } from '@testing-library/dom';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import type {
  AccessGrant,
  GuestDetail,
  PeriodStatus,
  Stay,
  StayPage,
} from '@core/api/clients/admin-guests.service';
import { AccessHandoffService, GENERATE_ACCESS_STATE } from '../data/access-handoff.service';
import { GuestDetailComponent } from './guest-detail.component';

const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

/** The link whose text (the hidden part included) is exactly `text`. */
function linkReading(container: HTMLElement, text: string): HTMLElement {
  const link = within(container)
    .getAllByRole('link')
    .find((each) => squash(each.textContent) === text);
  if (link === undefined) throw new Error(`no link reads «${text}»`);
  return link;
}

/** The text of an element as it reads, a space between the texts of its pieces. */
function words(element: Element): string {
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const texts: string[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    texts.push(node.textContent ?? '');
  }
  return squash(texts.join(' '));
}

function httpError(status: number, body: object | null = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, statusText: 'Error' });
}

type Contract = NonNullable<GuestDetail['contract']>;

function contractOf(status: Contract['status'] = 'ACTIVE'): Contract {
  return {
    id: 'c1',
    environmentId: 'e1',
    guestId: 'g1',
    guestName: 'Luis Huamán',
    documentType: 'DNI',
    documentNumber: '70412233',
    environmentCode: '201',
    environmentType: 'ROOM',
    monthlyAmount: 800,
    paymentDay: 5,
    graceDays: 3,
    startDate: '2026-07-01',
    endDate: '2027-06-30',
    status,
    expiringSoon: false,
    terminatedAt: null,
    file: { name: 'contrato.pdf', sizeBytes: 1, uploadedAt: '2026-07-01T10:00:00Z' },
    fileUrl: null,
  };
}

function guestOf(fields: Record<string, unknown> = {}): GuestDetail {
  return {
    id: 'g1',
    documentType: 'DNI',
    documentNumber: '70412233',
    name: 'Luis Huamán',
    type: 'CONTRACT',
    hasLoginAccess: true,
    phone: '987 654 321',
    contactEmail: 'luis@example.com',
    accountEmail: 'luis@example.com',
    documentCount: 2,
    paymentHistory: [],
    status: 'ACTIVE',
    onboardingProgress: 'COMPLETED',
    contract: contractOf(),
    ...fields,
  };
}

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
    rejectionReason: null,
    ...extra,
  };
}

const MONTHS: PeriodStatus[] = [
  month('2026-07', 'PAID', { paymentId: 'p7' }),
  month('2026-08', 'PAID', { paymentId: 'p8' }),
  month('2026-09', 'UNPAID'),
  month('2026-10', 'OVERDUE', { paymentId: 'p10', rejectionReason: 'El voucher no se lee' }),
  month('2026-11', 'UNDER_REVIEW', { paymentId: 'p11' }),
];

function stayOf(fields: Partial<Stay> = {}): Stay {
  return {
    id: 's1',
    environmentId: 'e1',
    environmentCode: 'C1',
    startDate: '2026-10-20',
    endDate: '2026-10-31',
    agreedAmount: 480,
    paymentStatus: 'UNDER_REVIEW',
    paymentId: 'p1',
    version: 1,
    ...fields,
  };
}

const GRANT: AccessGrant = {
  mode: 'TEMPORARY_PASSWORD',
  temporaryPassword: 'K7-q2x9m',
  expiresAt: '2026-11-05T21:30:00Z',
  emailSent: true,
  shareMessage: 'Entra con K7-q2x9m',
};

interface Answers {
  detail?: Observable<GuestDetail>;
  months?: PeriodStatus[];
  stays?: StayPage;
  state?: Record<string, unknown>;
}

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

function serviceOf(answers: Answers) {
  return {
    get: vi.fn<(id: string) => Observable<GuestDetail>>(() => answers.detail ?? of(guestOf())),
    accountStatus: vi.fn<(id: string) => Observable<PeriodStatus[]>>(() =>
      of(answers.months ?? MONTHS),
    ),
    stays: vi.fn<(id: string, after?: string) => Observable<StayPage>>(() =>
      of(answers.stays ?? { content: [stayOf()], nextCursor: null }),
    ),
    deactivate: vi.fn<(id: string) => Observable<unknown>>(() => of(null)),
    reactivate: vi.fn<(id: string) => Observable<unknown>>(() =>
      of({ id: 'g1', status: 'ACTIVE' }),
    ),
    generateAccess: vi.fn<(id: string, mode: string) => Observable<AccessGrant>>(() => of(GRANT)),
    setAccountEmail: vi.fn<(id: string, email: string) => Observable<unknown>>(() => of(null)),
  };
}

async function setup(answers: Answers = {}) {
  const service = serviceOf(answers);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/guests', children: [] },
        { path: 'admin/guests/:id', component: GuestDetailComponent },
        { path: 'admin/guests/:id/access', children: [] },
        { path: 'admin/guests/:id/document', children: [] },
        { path: 'admin/guests/:id/stays/new', children: [] },
        { path: 'admin/guests/:id/stays/:stayId', children: [] },
        { path: 'admin/payments/new', children: [] },
        { path: 'admin/payments/:id', children: [] },
      ]),
      { provide: AdminGuestsService, useValue: service },
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  await router.navigateByUrl('/admin/guests/g1', { state: answers.state });
  await settle(harness);
  const root = () => harness.routeNativeElement ?? document.body;
  const page = () => within(root());
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const panel = () => page().getByRole('region', { name: 'Lo que toca ahora' });
  const toast = () => squash(root().querySelector('app-toast output')?.textContent);
  const facts = (title: string) =>
    [...page().getByRole('region', { name: title }).querySelectorAll('app-fact-tile')].map(
      (tile) => [
        squash(tile.querySelector('dt')?.textContent),
        squash(tile.querySelector('dd')?.textContent),
      ],
    );
  const more = () =>
    [...page().getByRole('region', { name: 'Más acciones' }).querySelectorAll('li')].map((li) =>
      words(li),
    );
  return { harness, service, router, root, page, click, panel, toast, facts, more };
}

describe('GuestDetailComponent (A3.2 «Detalle del huésped»)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('shows the header, the panel, the months, the facts, the contract and the actions', async () => {
    const ui = await setup();

    expect(ui.page().getByRole('heading', { level: 1, name: 'Luis Huamán' })).toBeTruthy();
    expect(ui.page().getByRole('link', { name: 'Volver a Huéspedes' }).getAttribute('href')).toBe(
      '/admin/guests',
    );
    expect(ui.service.accountStatus).toHaveBeenCalledWith('g1');
    expect(ui.service.stays).not.toHaveBeenCalled();
    const now = within(ui.panel());
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('S/ 800.00');
    expect(now.getByText('por pagar')).toBeTruthy();
    expect(now.getByText(/^Octubre 2026: venció el 5 oct y su pago fue rechazado/)).toBeTruthy();
    expect(now.getByRole('link', { name: 'Corregir pago' }).getAttribute('href')).toBe(
      '/admin/payments/p10',
    );
    expect(ui.facts('Sus datos')).toEqual([
      ['Documento', 'DNI 70412233'],
      ['Estado', 'Activo'],
      ['Tipo', 'Con contrato'],
      ['Teléfono', '987 654 321'],
      ['Correo', 'luis@example.com'],
      ['Contacto de emergencia', 'Sin registrar'],
    ]);
    expect(
      ui.page().getByText('Sus datos de contacto los cambia solo el huésped, desde Mis datos.'),
    ).toBeTruthy();
    expect(ui.facts('Contrato')).toEqual([
      ['Ambiente', 'Habitación 201'],
      ['Estado', 'Activo'],
      ['Cuota', 'S/ 800.00'],
      ['Día de pago', '5 de cada mes'],
      ['Vigencia', '1 jul 2026 – 30 jun 2027'],
    ]);
    expect(ui.page().queryByRole('link', { name: 'Ver contrato' })).toBeNull();
    expect(ui.page().queryByRole('region', { name: 'Su registro' })).toBeNull();
    expect(ui.more()).toEqual([
      'Generar otro acceso si olvidó su contraseña',
      'Cambiar correo de cuenta al que llega la recuperación de contraseña',
      'Ver documentos 2 documentos',
      'Desactivar huésped',
    ]);
  });

  it('lists the months by state, filters them by tile or segment and sorts them', async () => {
    const ui = await setup();
    const table = () => ui.page().getByRole('table', { name: 'Pagos por mes' });
    const rows = () =>
      [...table().querySelectorAll('tbody tr')].map((row) =>
        [...row.querySelectorAll('th, td')].map((cell) => words(cell)),
      );

    expect(rows()).toEqual([
      [
        'Octubre 2026',
        '5 oct 2026',
        'S/ 800.00',
        'Atrasado Pago rechazado',
        'Corregir pago de Octubre 2026',
      ],
      [
        'Noviembre 2026',
        '5 nov 2026',
        'S/ 800.00',
        'Pendiente de revisión',
        'Revisar pago de Noviembre 2026',
      ],
      [
        'Septiembre 2026',
        '5 sep 2026',
        'S/ 800.00',
        'No pagado',
        'Registrar pago de Septiembre 2026',
      ],
      ['Agosto 2026', '5 ago 2026', 'S/ 800.00', 'Pagado', 'Ver pago de Agosto 2026'],
      ['Julio 2026', '5 jul 2026', 'S/ 800.00', 'Pagado', 'Ver pago de Julio 2026'],
    ]);
    expect(ui.page().getByText('Mostrando 5 de 5 meses')).toBeTruthy();
    const register = linkReading(table(), 'Registrar pago de Septiembre 2026');
    expect(register.getAttribute('href')).toBe('/admin/payments/new?guestId=g1');

    const tiles = within(ui.page().getByRole('group', { name: 'Filtrar meses por estado' }));
    await ui.click(tiles.getByRole('button', { name: /^Pagado/ }));
    expect(rows().map((row) => row[0])).toEqual(['Agosto 2026', 'Julio 2026']);
    expect(ui.page().getByText('Mostrando 2 de 5 meses')).toBeTruthy();
    expect(tiles.getByRole('button', { name: /^Pagado/ }).getAttribute('aria-pressed')).toBe(
      'true',
    );

    await ui.click(ui.page().getByRole('button', { name: 'Mostrar solo Atrasado (1)' }));
    expect(rows().map((row) => row[0])).toEqual(['Octubre 2026']);
    await ui.click(tiles.getByRole('button', { name: /^Todos/ }));
    expect(rows()).toHaveLength(5);

    await ui.click(within(table()).getByRole('button', { name: 'Mes' }));
    expect(rows().map((row) => row[0])).toEqual([
      'Julio 2026',
      'Agosto 2026',
      'Septiembre 2026',
      'Octubre 2026',
      'Noviembre 2026',
    ]);
    expect(table().querySelector('th[aria-sort="ascending"]')?.textContent).toContain('Mes');
    await ui.click(within(table()).getByRole('button', { name: 'Mes' }));
    expect(rows()[0]?.[0]).toBe('Noviembre 2026');
  });

  it('says a contract guest without months has nothing to charge yet, and without contract', async () => {
    const ui = await setup({ detail: of(guestOf({ contract: undefined })), months: [] });

    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('Sin contrato');
    expect(within(ui.panel()).queryByRole('link')).toBeNull();
    expect(within(ui.panel()).queryByRole('button')).toBeNull();
    const empty = ui.page().getByRole('region', { name: 'Aún no tiene meses por cobrar.' });
    expect(squash(empty.textContent)).toContain('Aparecen cuando le cargues un contrato.');
    expect(ui.page().queryByRole('region', { name: 'Contrato' })).toBeNull();
  });

  it('shows the stays of a temporary guest with their actions, and loads more', async () => {
    const ui = await setup({
      detail: of(guestOf({ type: 'TEMPORARY', contract: undefined })),
      stays: {
        content: [
          stayOf(),
          stayOf({
            id: 's2',
            startDate: '2026-09-01',
            endDate: '2026-09-08',
            paymentStatus: 'PAID',
            paymentId: 'p2',
          }),
        ],
        nextCursor: 'next',
      },
    });
    ui.service.stays.mockReturnValueOnce(
      of({
        content: [
          stayOf({
            id: 's3',
            startDate: '2026-08-01',
            endDate: '2026-08-03',
            paymentStatus: 'OVERDUE',
            paymentId: null,
            environmentCode: null,
          }),
        ],
        nextCursor: null,
      }),
    );

    expect(ui.service.accountStatus).not.toHaveBeenCalled();
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('S/ 480.00');
    expect(
      within(ui.panel()).getByText('Estadía del 20 – 31 oct 2026: envió su pago.'),
    ).toBeTruthy();
    const section = within(ui.page().getByRole('region', { name: 'Estadías' }));
    expect(section.getByRole('link', { name: 'Registrar estadía' }).getAttribute('href')).toBe(
      '/admin/guests/g1/stays/new',
    );
    const cards = () =>
      [...section.getByRole('list', { name: 'Estadías' }).querySelectorAll(':scope > li')].map(
        (card) => words(card),
      );
    expect(cards()).toEqual([
      '20 – 31 oct 2026 C1 · 11 noches S/ 480.00 Pendiente de revisión Revisar pago de la estadía del 20 – 31 oct 2026 Corregir estadía del 20 – 31 oct 2026',
      '1 – 8 sep 2026 C1 · 7 noches S/ 480.00 Pagado Ver pago de la estadía del 1 – 8 sep 2026 Corregir estadía del 1 – 8 sep 2026',
    ]);
    expect(
      linkReading(
        ui.page().getByRole('region', { name: 'Estadías' }),
        'Corregir estadía del 1 – 8 sep 2026',
      ).getAttribute('href'),
    ).toBe('/admin/guests/g1/stays/s2');
    expect(
      section.getByText('De la más reciente a la más antigua. Cada estadía tiene un solo pago.'),
    ).toBeTruthy();

    await ui.click(section.getByRole('button', { name: 'Cargar más estadías' }));
    expect(ui.service.stays).toHaveBeenLastCalledWith('g1', 'next');
    expect(cards()).toHaveLength(3);
    expect(cards()[2]).toBe(
      '1 – 3 ago 2026 Sin ambiente · 2 noches S/ 480.00 Atrasado Registrar pago de la estadía del 1 – 3 ago 2026 Corregir estadía del 1 – 3 ago 2026',
    );
    expect(section.queryByRole('button', { name: 'Cargar más estadías' })).toBeNull();
  });

  it('blocks the payments of a guest pending activation and offers its access and document', async () => {
    const ui = await setup({
      detail: of(
        guestOf({
          status: 'PENDING_ACTIVATION',
          onboardingProgress: 'NOT_STARTED',
          name: null,
          phone: null,
          contactEmail: null,
          contract: undefined,
          documentCount: 0,
          version: 3,
          accessExpiresAt: new Date(Date.now() + 18 * 60_000).toISOString(),
        }),
      ),
    });

    expect(ui.page().getByRole('heading', { level: 1, name: 'DNI 70412233' })).toBeTruthy();
    expect(ui.service.accountStatus).not.toHaveBeenCalled();
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toMatch(/^1[78] min$/);
    expect(within(ui.panel()).getByRole('button', { name: 'Generar otro acceso' })).toBeTruthy();
    const blocked = ui.page().getByRole('region', { name: 'Contrato y pagos' });
    expect(words(blocked)).toBe(
      'Contrato y pagos Primero tiene que activar su cuenta. Hasta que termine su registro no se le puede cargar un contrato ni registrar pagos.',
    );
    const steps = ui.page().getByRole('list', { name: 'Pasos de su registro' });
    expect([...steps.querySelectorAll('li')].map((li) => squash(li.textContent))).toEqual([
      'Contraseña: Falta',
      'Datos personales: Falta',
      'Documentos: Falta · opcional',
      'Consentimiento: Falta',
    ]);
    expect(
      ui.page().getByText('Su nombre y sus datos los completa el huésped al activar su acceso.'),
    ).toBeTruthy();
    expect(ui.more()).toEqual([
      'Cambiar correo de cuenta al que llega la recuperación de contraseña',
      'Ver documentos no subió documentos',
      'Corregir documento solo hasta que active su acceso',
      'Desactivar huésped',
    ]);
    expect(ui.page().getByRole('link', { name: 'Corregir documento' }).getAttribute('href')).toBe(
      '/admin/guests/g1/document',
    );
  });

  it('shows the onboarding steps and «Estadías y pagos» for a temporary guest', async () => {
    const ui = await setup({
      detail: of(
        guestOf({
          type: 'TEMPORARY',
          status: 'ONBOARDING',
          onboardingProgress: 'PERSONAL_DATA_SAVED',
          contract: undefined,
        }),
      ),
    });

    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('2 de 4');
    expect(within(ui.panel()).queryByRole('button')).toBeNull();
    expect(ui.service.stays).not.toHaveBeenCalled();
    expect(
      squash(ui.page().getByRole('region', { name: 'Estadías y pagos' }).textContent),
    ).toContain('Hasta que termine su registro no se le puede registrar una estadía ni pagos.');
    const steps = ui.page().getByRole('list', { name: 'Pasos de su registro' });
    expect([...steps.querySelectorAll('li.done')]).toHaveLength(2);
    expect(ui.more()[0]).toBe('Generar otro acceso');
  });

  it('says when the guest does not exist, under the title «Huésped»', async () => {
    const ui = await setup({
      detail: throwError(() => httpError(404, { code: 'RESOURCE_NOT_FOUND' })),
    });

    expect(ui.page().getByRole('heading', { level: 1, name: 'Huésped' })).toBeTruthy();
    const block = within(ui.page().getByRole('region', { name: 'No encontramos a este huésped.' }));
    expect(block.getByRole('link', { name: 'Volver a Huéspedes' }).getAttribute('href')).toBe(
      '/admin/guests',
    );
    expect(ui.page().queryByRole('region', { name: 'Lo que toca ahora' })).toBeNull();
  });

  it('says the guest could not be loaded and tries again', async () => {
    const ui = await setup({ detail: throwError(() => httpError(503)) });

    expect(squash(ui.page().getByRole('alert').textContent)).toBe(
      'No se pudo cargar el huésped. Reintentar',
    );
    ui.service.get.mockReturnValueOnce(of(guestOf()));
    await ui.click(ui.page().getByRole('button', { name: 'Reintentar' }));
    expect(ui.service.get).toHaveBeenCalledTimes(2);
    expect(ui.page().getByRole('heading', { level: 1, name: 'Luis Huamán' })).toBeTruthy();
  });

  it('is busy with a skeleton while the guest loads', async () => {
    const ui = await setup({ detail: NEVER });

    expect(ui.root().querySelector('[aria-busy="true"]')?.getAttribute('aria-label')).toBe(
      'Cargando el huésped',
    );
    expect(ui.page().getByRole('heading', { level: 1, name: 'Huésped' })).toBeTruthy();
  });
});

describe('GuestDetailComponent actions (A3.3, A3.4, A3.6 and the account email)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  const noContract = () => of(guestOf({ contract: undefined }));

  it('deactivates a guest without a contract in force and reloads it', async () => {
    const ui = await setup({ detail: noContract(), months: [] });

    await ui.click(ui.page().getByRole('button', { name: 'Desactivar huésped' }));
    const dialog = within(screen.getByRole('alertdialog', { name: '¿Desactivar a Luis Huamán?' }));
    expect(
      dialog.getByText(
        'No podrá entrar a Quipu. Sus datos y su historial se conservan, y puedes reactivar su cuenta cuando quieras.',
      ),
    ).toBeTruthy();
    ui.service.get.mockReturnValue(of(guestOf({ status: 'INACTIVE', contract: undefined })));
    await ui.click(dialog.getByRole('button', { name: 'Desactivar huésped' }));

    expect(ui.service.deactivate).toHaveBeenCalledWith('g1');
    await vi.waitFor(() => {
      expect(ui.toast()).toBe('Huésped desactivado.');
    });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('Inactivo');
    expect(ui.more()).toEqual(['Ver documentos 2 documentos', 'Reactivar huésped']);
  });

  it('turns «Desactivar» into the notice of a contract in force, known or answered', async () => {
    const known = await setup();
    await known.click(known.page().getByRole('button', { name: 'Desactivar huésped' }));
    const notice = within(
      screen.getByRole('alertdialog', { name: 'Este huésped tiene un contrato vigente' }),
    );
    expect(
      notice.getByText('Este huésped tiene un contrato vigente: finalízalo primero.'),
    ).toBeTruthy();
    expect(notice.getAllByRole('button').map((button) => squash(button.textContent))).toEqual([
      'Cerrar',
    ]);
    expect(known.service.deactivate).not.toHaveBeenCalled();
    await known.click(notice.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('turns «Desactivar» into the notice when the BFF answers a contract in force', async () => {
    const ui = await setup({ detail: noContract(), months: [] });
    ui.service.deactivate.mockReturnValueOnce(
      throwError(() => httpError(409, { code: 'GUEST_HAS_ACTIVE_CONTRACT', contractId: 'c1' })),
    );
    await ui.click(ui.page().getByRole('button', { name: 'Desactivar huésped' }));
    await ui.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar huésped' }),
    );

    expect(
      screen.getByRole('alertdialog', { name: 'Este huésped tiene un contrato vigente' }),
    ).toBeTruthy();
    expect(ui.toast()).toBe('');
  });

  it('keeps «Desactivar» open with a red notice when it fails otherwise', async () => {
    const ui = await setup({ detail: noContract(), months: [] });
    ui.service.deactivate.mockReturnValueOnce(throwError(() => httpError(0)));
    await ui.click(ui.page().getByRole('button', { name: 'Desactivar huésped' }));
    const dialog = within(screen.getByRole('alertdialog'));
    await ui.click(dialog.getByRole('button', { name: 'Desactivar huésped' }));

    expect(squash(dialog.getByRole('alert').textContent)).toBe(
      'No se pudo conectar con el servidor. Inténtalo de nuevo.',
    );
    expect(dialog.getByRole('button', { name: 'Desactivar huésped' })).toBeTruthy();
  });

  it('generates another access and hands it to A3.7 in memory, never in the address', async () => {
    const ui = await setup();
    const handoff = TestBed.inject(AccessHandoffService);
    const put = vi.spyOn(handoff, 'put');

    await ui.click(ui.page().getByRole('button', { name: 'Generar otro acceso' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Generar otro acceso' }));
    expect(
      dialog.getByText(
        'Su contraseña actual sigue sirviendo hasta que use el acceso nuevo. ¿Cómo se lo entregas?',
      ),
    ).toBeTruthy();
    const group = within(dialog.getByRole('radiogroup', { name: 'Cómo se lo entregas' }));
    expect(
      group.getByRole<HTMLInputElement>('radio', { name: 'Enlace (recomendado)' }).checked,
    ).toBe(true);
    await ui.click(group.getByRole('radio', { name: 'Contraseña temporal' }));
    expect(
      dialog.getByText(
        'Los dos valen 30 minutos y sirven una sola vez. Después verás el mensaje listo para enviarle.',
      ),
    ).toBeTruthy();
    await ui.click(dialog.getByRole('button', { name: 'Generar acceso' }));

    expect(ui.service.generateAccess).toHaveBeenCalledWith('g1', 'TEMPORARY_PASSWORD');
    await vi.waitFor(() => {
      expect(ui.router.url).toBe('/admin/guests/g1/access');
    });
    expect(put).toHaveBeenCalledWith({
      guestId: 'g1',
      documentType: 'DNI',
      documentNumber: '70412233',
      type: 'CONTRACT',
      phone: '987 654 321',
      contactEmail: 'luis@example.com',
      access: GRANT,
      regenerated: true,
    });
    expect(ui.router.url).not.toContain('K7');
  });

  it('keeps «Generar otro acceso» open with its failure in red', async () => {
    const ui = await setup();
    ui.service.generateAccess.mockReturnValueOnce(
      throwError(() => httpError(409, { code: 'GUEST_INACTIVE', guestId: 'g1' })),
    );
    await ui.click(ui.page().getByRole('button', { name: 'Generar otro acceso' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Generar otro acceso' }));
    await ui.click(dialog.getByRole('button', { name: 'Generar acceso' }));

    expect(squash(dialog.getByRole('alert').textContent)).toBe(
      'El huésped está inactivo: reactívalo antes de seguir.',
    );
    expect(ui.router.url).toBe('/admin/guests/g1');
  });

  it('opens «Generar otro acceso» when A3.7 asks for it through the navigation state', async () => {
    await setup({ state: { [GENERATE_ACCESS_STATE]: true } });

    const dialog = within(screen.getByRole('dialog', { name: 'Generar otro acceso' }));
    expect(dialog.getByText(/^Su contraseña actual sigue sirviendo/)).toBeTruthy();
  });

  it('checks the account email, says a taken one under the field and saves it', async () => {
    const ui = await setup();
    await ui.click(ui.page().getByRole('button', { name: 'Cambiar correo de cuenta' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Correo de cuenta' }));
    const field = dialog.getByLabelText<HTMLInputElement>('Correo de cuenta');
    expect(field.value).toBe('luis@example.com');
    const errorOf = () =>
      (field.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id))
        .find((element) => element?.classList.contains('quipu-field-error'))
        ?.textContent.trim();

    fireEvent.input(field, { target: { value: '' } });
    await ui.click(dialog.getByRole('button', { name: 'Guardar correo' }));
    expect(errorOf()).toBe('Escribe el correo de cuenta.');
    fireEvent.input(field, { target: { value: 'no-es-correo' } });
    await ui.click(dialog.getByRole('button', { name: 'Guardar correo' }));
    expect(errorOf()).toBe('Escribe un correo válido.');
    expect(ui.service.setAccountEmail).not.toHaveBeenCalled();

    ui.service.setAccountEmail.mockReturnValueOnce(
      throwError(() => httpError(409, { code: 'ACCOUNT_EMAIL_TAKEN', field: 'email' })),
    );
    fireEvent.input(field, { target: { value: ' otra@example.com ' } });
    await ui.click(dialog.getByRole('button', { name: 'Guardar correo' }));
    await vi.waitFor(() => {
      expect(errorOf()).toBe('Ese correo ya está en uso por otra cuenta');
    });
    expect(ui.service.setAccountEmail).toHaveBeenLastCalledWith('g1', 'otra@example.com');

    fireEvent.input(field, { target: { value: 'nueva@example.com' } });
    await ui.click(dialog.getByRole('button', { name: 'Guardar correo' }));
    expect(ui.service.setAccountEmail).toHaveBeenLastCalledWith('g1', 'nueva@example.com');
    await vi.waitFor(() => {
      expect(ui.toast()).toBe('Correo de cuenta guardado.');
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reactivates without a confirmation and says so', async () => {
    const inactive = guestOf({ status: 'INACTIVE', contract: undefined });
    const ui = await setup({ detail: of(inactive), months: [] });
    ui.service.get.mockReturnValue(of(guestOf({ contract: undefined })));

    await ui.click(within(ui.panel()).getByRole('button', { name: 'Reactivar huésped' }));

    expect(ui.service.reactivate).toHaveBeenCalledWith('g1');
    await vi.waitFor(() => {
      expect(ui.toast()).toBe('Huésped reactivado.');
    });
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('Sin contrato');
  });

  it('says the access expired while inactive once reactivated, and offers another', async () => {
    const lapsed = {
      contract: undefined,
      name: null,
      accessExpiresAt: '2026-10-11T16:00:00Z',
    };
    const ui = await setup({
      detail: of(guestOf({ ...lapsed, status: 'INACTIVE', onboardingProgress: 'NOT_STARTED' })),
      months: [],
    });
    ui.service.reactivate.mockReturnValueOnce(of({ id: 'g1', status: 'PENDING_ACTIVATION' }));
    ui.service.get.mockReturnValue(
      of(
        guestOf({
          ...lapsed,
          status: 'PENDING_ACTIVATION',
          onboardingProgress: 'NOT_STARTED',
          version: 2,
        }),
      ),
    );

    await ui.click(within(ui.panel()).getByRole('button', { name: 'Reactivar huésped' }));

    await vi.waitFor(() => {
      expect(ui.toast()).toBe('Huésped reactivado. Su acceso venció: genera otro.');
    });
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('Vencido');
    expect(
      within(ui.panel()).getByText(
        'Venció mientras estaba inactivo. Genera otro y entrégaselo: el anterior ya no sirve.',
      ),
    ).toBeTruthy();
    expect(within(ui.panel()).getByRole('button', { name: 'Generar otro acceso' })).toBeTruthy();
  });

  it('explains the debt that blocks reactivating and opens the direct payment', async () => {
    const ui = await setup({
      detail: of(guestOf({ status: 'INACTIVE', contract: undefined })),
      months: [month('2026-10', 'OVERDUE')],
    });
    ui.service.reactivate.mockReturnValueOnce(
      throwError(() =>
        httpError(409, {
          code: 'GUEST_HAS_PENDING_DEBT',
          periods: ['2026-10'],
          debts: [
            {
              period: '2026-10',
              stayId: null,
              stayStartDate: null,
              stayEndDate: null,
              amountDue: 800,
            },
          ],
        }),
      ),
    );
    expect(ui.more()).toEqual([
      'Ver documentos 2 documentos',
      'Reactivar huésped después de saldar su deuda',
    ]);

    const more = within(ui.page().getByRole('region', { name: 'Más acciones' }));
    await ui.click(more.getByRole('button', { name: 'Reactivar huésped' }));

    const debt = within(screen.getByRole('alertdialog', { name: 'Primero salda su deuda' }));
    expect(
      debt.getByText(
        'El huésped tiene deuda pendiente: salda sus períodos impagos antes de crear un contrato nuevo o reactivarlo',
      ),
    ).toBeTruthy();
    expect(
      [...debt.getByRole('list', { name: 'Lo que debe' }).querySelectorAll('li')].map((li) =>
        words(li),
      ),
    ).toEqual(['Octubre 2026 S/ 800.00', 'Total S/ 800.00']);
    await ui.click(debt.getByRole('button', { name: 'Registrar pago' }));
    await vi.waitFor(() => {
      expect(ui.router.url).toBe('/admin/payments/new?guestId=g1');
    });
  });

  it('says why reactivating failed in a toast', async () => {
    const ui = await setup({
      detail: of(guestOf({ status: 'INACTIVE', contract: undefined })),
      months: [],
    });
    ui.service.reactivate.mockReturnValueOnce(
      throwError(() => httpError(409, { code: 'CONCURRENT_MODIFICATION' })),
    );

    await ui.click(within(ui.panel()).getByRole('button', { name: 'Reactivar huésped' }));

    expect(ui.toast()).toBe(
      'El huésped cambió mientras tanto. Cierra este aviso y vuelve a intentarlo.',
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});
