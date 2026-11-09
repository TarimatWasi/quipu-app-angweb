import { HttpRequest, provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
  TestRequest,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, screen, within } from '@testing-library/dom';
import type { Environment } from '../data/admin-environments.service';
import type { Stay } from '@core/api/clients/admin-guests.service';
import { StayFormComponent } from './stay-form.component';
import { ToastService } from '@shared/ui/toast/toast.service';
/** The text of the toast the screen asked for, or '' when there is none. */
const toastText = () => TestBed.inject(ToastService).current()?.text ?? '';

const isGuest = (req: HttpRequest<unknown>) =>
  req.method === 'GET' && req.url.endsWith('/bff/admin/guests/g1');
const isStays = (req: HttpRequest<unknown>) =>
  req.method === 'GET' && req.url.endsWith('/bff/admin/guests/g1/stays');
const isEnvironments = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/admin/environments');
const isCreate = (req: HttpRequest<unknown>) =>
  req.method === 'POST' && req.url.endsWith('/bff/admin/guests/g1/stays');
const isUpdate = (req: HttpRequest<unknown>) =>
  req.method === 'PATCH' && req.url.endsWith('/bff/admin/guests/g1/stays/s%2F1');

const AMOUNT = 'Monto acordado';
const GUEST = {
  id: 'g1',
  documentType: 'CE',
  documentNumber: '001234567',
  name: 'Luis Mamani',
  type: 'TEMPORARY',
  hasLoginAccess: true,
  phone: '999 111 222',
  documentCount: 0,
  paymentHistory: [],
  status: 'ACTIVE',
  onboardingProgress: 'COMPLETED',
};

function stayOf(overrides: Partial<Stay> = {}): Stay {
  return {
    id: 's/1',
    environmentId: 'env-1',
    environmentCode: 'H1',
    startDate: '2026-11-10',
    endDate: '2026-11-15',
    agreedAmount: 400,
    paymentStatus: 'UNPAID',
    paymentId: null,
    version: 4,
    ...overrides,
  };
}

function environment(overrides: Partial<Environment> = {}): Environment {
  return {
    id: 'env/2',
    code: 'C1',
    type: 'CABIN',
    status: 'ACTIVE',
    occupant: null,
    nextOccupant: null,
    freeSince: '2026-10-01',
    version: 1,
    ...overrides,
  };
}

const FREE = {
  content: [environment(), environment({ id: 'env-3', code: 'H2', type: 'ROOM' })],
  nextCursor: null,
  freeCount: 2,
};

const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

async function setup(url: string, guest: object | null = GUEST) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/guests/:id', children: [] },
        { path: 'admin/guests/:id/stays/new', component: StayFormComponent },
        { path: 'admin/guests/:id/stays/:stayId', component: StayFormComponent },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const http = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  await harness.navigateByUrl(url);
  await settle(harness);
  const expect1 = async (match: (req: HttpRequest<unknown>) => boolean) =>
    vi.waitFor(() => http.expectOne(match));
  const flush = async (req: TestRequest, body: object | null, status = 200) => {
    req.flush(body, { status, statusText: 'x' });
    await settle(harness);
  };
  if (guest === null) {
    await flush(await expect1(isGuest), { code: 'GUEST_NOT_FOUND', message: 'x' }, 404);
  } else {
    await flush(await expect1(isGuest), guest);
  }
  const page = () => within(present(harness.routeNativeElement));
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const type = async (label: string, value: string) => {
    fireEvent.input(page().getByLabelText(label), { target: { value } });
    await settle(harness);
  };
  const choose = async (value: string) => {
    const select = page().getByLabelText<HTMLSelectElement>('Ambiente');
    select.value = value;
    fireEvent.change(select);
    await settle(harness);
  };
  const save = () =>
    page().getByRole<HTMLButtonElement>('button', {
      name: /^(Registrar estadía|Guardar cambios|Registrando…|Guardando…)$/,
    });
  /** The error a field is described by (its help is described too, after it). */
  const errorOf = (label: string) => {
    const ids = (page().getByLabelText(label).getAttribute('aria-describedby') ?? '').split(' ');
    const id = ids.find((each) => each.endsWith('-error'));
    return id ? document.getElementById(id)?.textContent.trim() : undefined;
  };
  const facts = () =>
    [...present(page().getByRole('complementary')).querySelectorAll('dl > div')].map((pair) => [
      squash(pair.querySelector('dt')?.textContent),
      squash(pair.querySelector('dd')?.textContent),
    ]);
  return { harness, http, router, page, click, type, choose, save, errorOf, facts, expect1, flush };
}

type Ui = Awaited<ReturnType<typeof setup>>;

/** A3.5 opened to register: the dates typed, the free environments answered. */
async function registerReady(): Promise<Ui> {
  const ui = await setup('/admin/guests/g1/stays/new');
  await ui.type('Llegada', '2026-11-10');
  await ui.type('Salida', '2026-11-15');
  await ui.flush(await ui.expect1(isEnvironments), FREE);
  return ui;
}

/** A3.5 opened to correct the stay s/1, loaded with its version and its free environments. */
async function correctReady(stay: Stay = stayOf()): Promise<Ui> {
  const ui = await setup('/admin/guests/g1/stays/s%2F1');
  expect(
    ui.page().getByRole('region', { name: 'Cargando la estad\u00eda' }).getAttribute('aria-busy'),
  ).toBe('true');
  await ui.flush(await ui.expect1(isStays), { content: [stay], nextCursor: null });
  await ui.flush(await ui.expect1(isEnvironments), FREE);
  return ui;
}

async function fillAndSave(ui: Ui) {
  await ui.choose('env/2');
  await ui.type(AMOUNT, '400');
  await ui.click(ui.save());
}

describe('StayFormComponent (A3.5 stays, approved canvas)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the header, the help of each field and what is going to be registered', async () => {
    const ui = await setup('/admin/guests/g1/stays/new');
    ui.http.expectNone(isEnvironments);

    expect(ui.page().getByRole('heading', { level: 1, name: 'Registrar estadía' })).toBeTruthy();
    expect(ui.page().getByText(/^Hoy, \S+ \d{1,2} de \S+$/)).toBeTruthy();
    expect(ui.page().getByRole('link', { name: 'Volver a Luis Mamani' }).getAttribute('href')).toBe(
      '/admin/guests/g1',
    );
    expect(
      ui.page().getByRole('heading', { level: 2, name: 'Lo que se va a registrar' }),
    ).toBeTruthy();
    expect(ui.facts()).toEqual([
      ['Huésped', 'Luis Mamani'],
      ['Ambiente', 'Falta elegirlo'],
      ['Noches', '—'],
      ['Fechas', 'Faltan las fechas'],
      ['Monto acordado', 'Falta el monto'],
    ]);
    expect(
      ui
        .page()
        .getByText(
          'Las noches se calculan de las fechas. Desde la llegada podrá subir su voucher.',
        ),
    ).toBeTruthy();
    const helpOf = (label: string) => {
      const ids = ui.page().getByLabelText(label).getAttribute('aria-describedby') ?? '';
      return squash(document.getElementById(ids)?.textContent);
    };
    expect(helpOf('Ambiente')).toBe(
      'Solo los ambientes activos y libres en esas fechas. Lo ocupa durante la estadía.',
    );
    expect(helpOf('Llegada')).toBe(
      'No puede cruzarse con otra estadía del huésped. Puedes registrar una próxima mientras la actual sigue.',
    );
    expect(helpOf(AMOUNT)).toBe('Lo que paga por toda la estadía, en un solo pago.');
    expect(ui.page().getByRole('link', { name: 'Cancelar' }).getAttribute('href')).toBe(
      '/admin/guests/g1',
    );
  });

  it('names the guest by its document while it has no name, and works without it', async () => {
    const ui = await setup('/admin/guests/g1/stays/new', null);

    expect(ui.page().getByRole('link', { name: 'Volver al huésped' })).toBeTruthy();
    expect(ui.facts()[0]).toEqual(['Huésped', '—']);
    expect(ui.save().disabled).toBe(false);
  });

  it('shows the literal texts of the SRS and sends nothing while the form is empty', async () => {
    const ui = await setup('/admin/guests/g1/stays/new');

    await ui.click(ui.save());

    expect(ui.errorOf('Llegada')).toBe('Elige la llegada y la salida.');
    expect(ui.page().getByLabelText('Llegada').getAttribute('aria-invalid')).toBe('true');
    expect(ui.page().getByLabelText('Salida').getAttribute('aria-invalid')).toBe('true');
    expect(ui.errorOf('Ambiente')).toBe('Elige el ambiente de la estadía.');
    expect(ui.errorOf(AMOUNT)).toBe('Escribe un monto mayor que 0.');
    expect(document.activeElement).toBe(ui.page().getByLabelText('Ambiente'));
    ui.http.expectNone(isCreate);
  });

  it('says the exit cannot be before the arrival once it tries to save, asking no environments', async () => {
    const ui = await setup('/admin/guests/g1/stays/new');
    await ui.type('Llegada', '2026-11-15');
    await ui.type('Salida', '2026-11-10');
    expect(ui.errorOf('Salida')).toBeUndefined();

    await ui.click(ui.save());

    expect(ui.errorOf('Salida')).toBe('La salida no puede ser antes de la llegada.');
    expect(ui.facts()[2]).toEqual(['Noches', '—']);
    ui.http.expectNone(isEnvironments);
    ui.http.expectNone(isCreate);
  });

  it('rejects an amount of zero with the literal text', async () => {
    const ui = await registerReady();
    await ui.choose('env/2');
    await ui.type(AMOUNT, '0');
    await ui.click(ui.save());

    expect(ui.errorOf(AMOUNT)).toBe('Escribe un monto mayor que 0.');
    ui.http.expectNone(isCreate);
  });

  it('keeps a choice from a later page of environments while the new dates are checked', async () => {
    const ui = await setup('/admin/guests/g1/stays/new');
    await ui.type('Llegada', '2026-11-10');
    await ui.type('Salida', '2026-11-15');
    await ui.flush(await ui.expect1(isEnvironments), {
      content: [environment()],
      nextCursor: 'page/2',
      freeCount: 2,
    });
    const second = await ui.expect1(isEnvironments);
    expect(second.request.params.get('after')).toBe('page/2');
    await ui.flush(second, {
      content: [environment({ id: 'env-9', code: 'H9', type: 'ROOM' })],
      nextCursor: null,
      freeCount: 2,
    });
    await ui.choose('env-9');

    await ui.type('Salida', '2026-11-16');
    await ui.flush(await ui.expect1(isEnvironments), {
      content: [environment()],
      nextCursor: 'page/2',
      freeCount: 2,
    });
    await ui.flush(await ui.expect1(isEnvironments), {
      content: [environment({ id: 'env-9', code: 'H9', type: 'ROOM' })],
      nextCursor: null,
      freeCount: 2,
    });

    expect(ui.page().getByLabelText<HTMLSelectElement>('Ambiente').value).toBe('env-9');
  });

  it('registers a stay in a free environment and goes back to A3.2 with the aviso', async () => {
    const ui = await setup('/admin/guests/g1/stays/new');
    await ui.type('Llegada', '2026-11-10');
    await ui.type('Salida', '2026-11-15');
    const environments = await ui.expect1(isEnvironments);
    expect(environments.request.params.get('status')).toBe('ACTIVE');
    expect(environments.request.params.get('freeFrom')).toBe('2026-11-10');
    expect(environments.request.params.get('freeTo')).toBe('2026-11-15');
    await ui.flush(environments, FREE);
    const select = ui.page().getByLabelText<HTMLSelectElement>('Ambiente');
    expect([...select.options].map((option) => option.textContent.trim())).toEqual([
      'Elige un ambiente',
      'Cabaña C1',
      'Habitación H2',
    ]);

    await ui.choose('env/2');
    await ui.type(AMOUNT, '400,50');
    expect(ui.facts()).toEqual([
      ['Huésped', 'Luis Mamani'],
      ['Ambiente', 'Cabaña C1'],
      ['Noches', '5'],
      ['Fechas', '10 – 15 nov'],
      ['Monto acordado', 'S/ 400.50'],
    ]);
    await ui.click(ui.save());
    const post = await ui.expect1(isCreate);
    expect(ui.save().textContent.trim()).toBe('Registrando…');
    expect(ui.save().disabled).toBe(true);
    expect(post.request.body).toStrictEqual({
      environmentId: 'env/2',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      agreedAmount: 400.5,
    });
    await ui.flush(post, stayOf({ id: 's9' }), 201);

    expect(ui.router.url).toBe('/admin/guests/g1');
    expect(toastText()).toBe('Estadía registrada.');
  });

  it('loads the stay to correct, keeps "Guardar cambios" disabled without changes and sends the version', async () => {
    const ui = await setup('/admin/guests/g1/stays/s%2F1');
    const list = await ui.expect1(isStays);
    expect(list.request.params.get('limit')).toBe('100');
    await ui.flush(list, { content: [stayOf()], nextCursor: null });
    await ui.flush(await ui.expect1(isEnvironments), FREE);

    expect(ui.page().getByRole('heading', { level: 1, name: 'Corregir estadía' })).toBeTruthy();
    expect(ui.page().getByRole('heading', { level: 2, name: 'Cómo está hoy' })).toBeTruthy();
    expect(ui.facts()).toEqual([
      ['Ambiente', 'H1'],
      ['Noches', '5'],
      ['Fechas', '10 – 15 nov'],
      ['Monto acordado', 'S/ 400.00'],
    ]);
    expect(
      ui
        .page()
        .getByText(
          'Una estadía no se convierte en otra: si vuelve en otras fechas, registra una estadía nueva.',
        ),
    ).toBeTruthy();
    expect(ui.page().queryByText(/pago pendiente de revisión/)).toBeNull();
    expect(ui.page().getByLabelText<HTMLInputElement>('Llegada').value).toBe('2026-11-10');
    expect(ui.page().getByLabelText<HTMLInputElement>('Salida').value).toBe('2026-11-15');
    const select = ui.page().getByLabelText<HTMLSelectElement>('Ambiente');
    expect(select.value).toBe('env-1');
    expect([...select.options].map((option) => option.textContent.trim())).toEqual([
      'H1',
      'Cabaña C1',
      'Habitación H2',
    ]);
    expect(ui.page().getByLabelText<HTMLInputElement>(AMOUNT).value).toBe('400.00');
    expect(ui.save().textContent.trim()).toBe('Guardar cambios');
    expect(ui.save().disabled).toBe(true);

    await ui.type(AMOUNT, '450');
    expect(ui.save().disabled).toBe(false);
    await ui.type(AMOUNT, '400.00');
    expect(ui.save().disabled).toBe(true);
    await ui.type(AMOUNT, '450');

    await ui.click(ui.save());
    const patch = await ui.expect1(isUpdate);
    expect(ui.save().textContent.trim()).toBe('Guardando…');
    expect(patch.request.body).toStrictEqual({ agreedAmount: 450, version: 4 });
    await ui.flush(patch, stayOf({ agreedAmount: 450, version: 5 }));

    expect(ui.router.url).toBe('/admin/guests/g1');
    expect(toastText()).toBe('Estadía corregida.');
  });

  it('warns that a stay with a payment under review compares it with the new amount', async () => {
    const ui = await correctReady(stayOf({ paymentStatus: 'UNDER_REVIEW', paymentId: 'p1' }));

    expect(
      squash(ui.page().getByText(/pago pendiente de revisión/).parentElement?.textContent),
    ).toBe(
      'Esta estadía tiene un pago pendiente de revisión. Si cambias el monto acordado, la revisión compara el pago con el monto nuevo.',
    );
  });

  it('sends only the dates and the environment that changed, with the version', async () => {
    const ui = await correctReady();
    await ui.type('Salida', '2026-11-18');
    await ui.flush(await ui.expect1(isEnvironments), FREE);
    await ui.choose('env-3');

    await ui.click(ui.save());
    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({
      environmentId: 'env-3',
      endDate: '2026-11-18',
      version: 4,
    });
    await ui.flush(patch, stayOf({ version: 5 }));
  });

  it('prompts again when new dates drop the environment chosen in a correction', async () => {
    const ui = await correctReady();
    await ui.choose('env-3');
    await ui.type('Salida', '2026-11-20');
    await ui.flush(await ui.expect1(isEnvironments), {
      content: [environment()],
      nextCursor: null,
      freeCount: 1,
    });

    const select = ui.page().getByLabelText<HTMLSelectElement>('Ambiente');
    expect(select.value).toBe('');
    expect([...select.options].map((option) => option.textContent.trim())).toEqual([
      'Elige un ambiente',
      'H1',
      'Cabaña C1',
    ]);
    await ui.click(ui.save());
    expect(ui.errorOf('Ambiente')).toBe('Elige el ambiente de la estadía.');
    ui.http.expectNone(isUpdate);
  });

  it('opens the shared dialog on 409 and reloads the stay with its new version', async () => {
    const ui = await correctReady();
    await ui.type(AMOUNT, '450');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'CONCURRENT_MODIFICATION', message: 'x' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'El registro cambió' });
    expect(alert.textContent).toContain(
      'El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo',
    );
    await ui.click(within(alert).getByRole('button', { name: 'Volver a cargar' }));
    await ui.flush(await ui.expect1(isStays), {
      content: [stayOf({ agreedAmount: 420, version: 5 })],
      nextCursor: null,
    });
    await ui.flush(await ui.expect1(isEnvironments), FREE);

    expect(ui.page().getByLabelText<HTMLInputElement>(AMOUNT).value).toBe('420.00');
    expect(ui.save().disabled).toBe(true);
    await ui.type(AMOUNT, '450');
    await ui.click(ui.save());
    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({ agreedAmount: 450, version: 5 });
    await ui.flush(patch, stayOf({ agreedAmount: 450, version: 6 }));
    expect(ui.router.url).toBe('/admin/guests/g1');
  });

  it('keeps the form as it was after "Cerrar" on the 409 dialog, saving nothing', async () => {
    const ui = await correctReady();
    await ui.type(AMOUNT, '450');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'CONCURRENT_MODIFICATION', message: 'x' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'El registro cambió' });
    await ui.click(within(alert).getByRole('button', { name: 'Cerrar' }));

    expect(ui.router.url).toBe('/admin/guests/g1/stays/s%2F1');
    expect(ui.page().getByLabelText<HTMLInputElement>(AMOUNT).value).toBe('450');
    ui.http.expectNone(isStays);
    ui.http.expectNone(isUpdate);
  });

  it('shows STAY_OVERLAP with the BFF message under the dates, not in a dialog', async () => {
    const ui = await registerReady();
    await fillAndSave(ui);
    const message =
      'Estas fechas se cruzan con otra estadía del huésped: del 01/11/2026 al 12/11/2026';
    await ui.flush(await ui.expect1(isCreate), { code: 'STAY_OVERLAP', message }, 409);

    expect(ui.errorOf('Llegada')).toBe(message);
    expect(ui.page().getByLabelText('Salida').getAttribute('aria-invalid')).toBe('true');
    expect(document.body.querySelector('mat-dialog-container')).toBeNull();
    expect(ui.router.url).toBe('/admin/guests/g1/stays/new');

    await ui.type('Salida', '2026-11-14');
    expect(ui.errorOf('Llegada')).toBeUndefined();
    await ui.flush(await ui.expect1(isEnvironments), FREE);
  });

  it('shows ENVIRONMENT_OCCUPIED as the canvas words it and asks the free environments again', async () => {
    const ui = await registerReady();
    await fillAndSave(ui);
    await ui.flush(
      await ui.expect1(isCreate),
      { code: 'ENVIRONMENT_OCCUPIED', message: 'El ambiente ya está ocupado en esas fechas' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', {
      name: 'El ambiente ya está ocupado en esas fechas',
    });
    expect(alert.textContent).toContain(
      'Otra persona lo ocupa en esas fechas. Elige otro ambiente libre.',
    );
    expect(within(alert).getAllByRole('button')).toHaveLength(1);
    await ui.click(within(alert).getByRole('button', { name: 'Elegir otro ambiente' }));
    await ui.flush(await ui.expect1(isEnvironments), {
      content: [environment({ id: 'env-3', code: 'H2', type: 'ROOM' })],
      nextCursor: null,
      freeCount: 1,
    });

    const select = ui.page().getByLabelText<HTMLSelectElement>('Ambiente');
    expect(select.value).toBe('');
    expect(document.activeElement).toBe(select);
    expect(ui.router.url).toBe('/admin/guests/g1/stays/new');
  });

  it('stops offering the own environment of the stay once the BFF says it is taken in the new dates', async () => {
    const ui = await correctReady();
    await ui.type('Salida', '2026-11-20');
    await ui.flush(await ui.expect1(isEnvironments), FREE);
    expect(ui.page().getByLabelText<HTMLSelectElement>('Ambiente').value).toBe('env-1');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'ENVIRONMENT_OCCUPIED', message: 'El ambiente ya está ocupado en esas fechas' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', {
      name: 'El ambiente ya está ocupado en esas fechas',
    });
    await ui.click(within(alert).getByRole('button', { name: 'Elegir otro ambiente' }));
    await ui.flush(await ui.expect1(isEnvironments), FREE);

    const select = ui.page().getByLabelText<HTMLSelectElement>('Ambiente');
    expect(select.value).toBe('');
    expect([...select.options].map((option) => option.textContent.trim())).toEqual([
      'Elige un ambiente',
      'Cabaña C1',
      'Habitación H2',
    ]);
    await ui.choose('env-3');
    await ui.click(ui.save());
    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({
      environmentId: 'env-3',
      endDate: '2026-11-20',
      version: 4,
    });
    await ui.flush(patch, stayOf({ version: 5 }));
  });

  it.each([
    [
      'GUEST_NOT_ACTIVE',
      'El huésped no está activo',
      'Este huésped aún no está activo: no admite contratos ni pagos',
    ],
    [
      'GUEST_NOT_TEMPORARY',
      'El huésped no es temporal',
      'Solo los huéspedes temporales tienen estadías',
    ],
  ])(
    'shows %s in a dialog with the catalog text and goes back to A3.2',
    async (code, title, message) => {
      const ui = await registerReady();
      await fillAndSave(ui);
      await ui.flush(
        await ui.expect1(isCreate),
        { code, message: 'texto del servidor', guestId: 'g1' },
        409,
      );

      const alert = await screen.findByRole('alertdialog', { name: title });
      expect(alert.textContent).toContain(message);
      await ui.click(within(alert).getByRole('button', { name: 'Volver al huésped' }));

      expect(ui.router.url).toBe('/admin/guests/g1');
    },
  );

  it('shows the catalog text of a field the BFF points at next to its field', async () => {
    const ui = await registerReady();
    await fillAndSave(ui);
    await ui.flush(
      await ui.expect1(isCreate),
      {
        code: 'VALIDATION_ERROR',
        message: 'texto del servidor',
        field: 'agreedAmount',
      },
      400,
    );

    expect(ui.errorOf(AMOUNT)).toBe('Escribe un monto mayor que 0.');
    expect(document.activeElement).toBe(ui.page().getByLabelText(AMOUNT));
  });

  it('shows an error without a field above the actions', async () => {
    const ui = await registerReady();
    await fillAndSave(ui);
    await ui.flush(
      await ui.expect1(isCreate),
      { code: 'RATE_LIMITED', message: 'texto del servidor' },
      429,
    );

    expect(ui.page().getByRole('alert').textContent).toContain(
      'Demasiados intentos, espera un momento antes de volver a intentar',
    );
  });

  it('goes back to A3.2 with the catalog text when the stay is gone on save', async () => {
    const ui = await correctReady();
    await ui.type(AMOUNT, '450');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'STAY_NOT_FOUND', message: 'texto del servidor' },
      404,
    );

    expect(ui.router.url).toBe('/admin/guests/g1');
    expect(toastText()).toBe('La estadía no existe');
  });

  it('says so when the stay to correct does not exist', async () => {
    const ui = await setup('/admin/guests/g1/stays/s%2F1');
    await ui.flush(await ui.expect1(isStays), {
      content: [stayOf({ id: 'other' })],
      nextCursor: null,
    });

    expect(ui.page().getByText('No encontramos la estadía.')).toBeTruthy();
    expect(ui.page().queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
    expect(
      ui.page().getAllByRole('link', { name: 'Volver al huésped' })[0]?.getAttribute('href'),
    ).toBe('/admin/guests/g1');
  });

  it('keeps a stay registered before TAR-237 without an environment', async () => {
    const ui = await correctReady(stayOf({ environmentId: null, environmentCode: null }));

    const select = ui.page().getByLabelText<HTMLSelectElement>('Ambiente');
    expect(select.value).toBe('');
    expect(select.options[0]?.textContent.trim()).toBe('Sin ambiente');
    expect(ui.facts()[0]).toEqual(['Ambiente', 'Sin ambiente']);
    await ui.type(AMOUNT, '410');
    await ui.click(ui.save());
    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({ agreedAmount: 410, version: 4 });
    await ui.flush(patch, stayOf({ version: 5 }));
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
}
