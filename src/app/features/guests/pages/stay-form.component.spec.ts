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
import type { Environment } from '@core/services/admin-environments.service';
import type { Stay } from '@core/services/admin-guests.service';
import { StayFormComponent } from './stay-form.component';

const isStays = (req: HttpRequest<unknown>) =>
  req.method === 'GET' && req.url.endsWith('/bff/admin/guests/g1/stays');
const isEnvironments = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/admin/environments');
const isCreate = (req: HttpRequest<unknown>) =>
  req.method === 'POST' && req.url.endsWith('/bff/admin/guests/g1/stays');
const isUpdate = (req: HttpRequest<unknown>) =>
  req.method === 'PATCH' && req.url.endsWith('/bff/admin/guests/g1/stays/s%2F1');

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

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

async function setup(url: string) {
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
  const save = () => page().getByRole<HTMLButtonElement>('button', { name: 'Guardar' });
  const describedBy = (label: string) => {
    const id = page().getByLabelText(label).getAttribute('aria-describedby') ?? '';
    return document.getElementById(id)?.textContent.trim();
  };
  return { harness, http, router, page, click, type, choose, save, describedBy, expect1, flush };
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
  await ui.flush(await ui.expect1(isStays), { content: [stay], nextCursor: null });
  await ui.flush(await ui.expect1(isEnvironments), FREE);
  return ui;
}

describe('StayFormComponent (A3.5 stays)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    document.body.querySelectorAll('mat-snack-bar-container').forEach((el) => {
      el.remove();
    });
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows the literal texts of the SRS and sends nothing while the form is empty', async () => {
    const ui = await setup('/admin/guests/g1/stays/new');
    ui.http.expectNone(isEnvironments);

    await ui.click(ui.save());

    expect(ui.describedBy('Llegada')).toBe('Elige la llegada y la salida.');
    expect(ui.page().getByLabelText('Llegada').getAttribute('aria-invalid')).toBe('true');
    expect(ui.page().getByLabelText('Salida').getAttribute('aria-invalid')).toBe('true');
    expect(ui.describedBy('Ambiente')).toBe('Elige el ambiente de la estadía.');
    expect(ui.describedBy('Monto acordado (S/)')).toBe('Escribe un monto mayor que 0.');
    expect(document.activeElement).toBe(ui.page().getByLabelText('Llegada'));
    ui.http.expectNone(isCreate);
  });

  it('says the exit cannot be before the arrival and asks no environments for those dates', async () => {
    const ui = await setup('/admin/guests/g1/stays/new');
    await ui.type('Llegada', '2026-11-15');
    await ui.type('Salida', '2026-11-10');

    expect(ui.describedBy('Salida')).toBe('La salida no puede ser antes de la llegada.');
    ui.http.expectNone(isEnvironments);
  });

  it('rejects an amount of zero with the literal text', async () => {
    const ui = await registerReady();
    await ui.choose('env/2');
    await ui.type('Monto acordado (S/)', '0');
    await ui.click(ui.save());

    expect(ui.describedBy('Monto acordado (S/)')).toBe('Escribe un monto mayor que 0.');
    ui.http.expectNone(isCreate);
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
      'Elige el ambiente',
      'C1 · Cabaña',
      'H2 · Habitación',
    ]);

    await ui.choose('env/2');
    await ui.type('Monto acordado (S/)', '400,50');
    await ui.click(ui.save());
    const post = await ui.expect1(isCreate);
    expect(post.request.body).toStrictEqual({
      environmentId: 'env/2',
      startDate: '2026-11-10',
      endDate: '2026-11-15',
      agreedAmount: 400.5,
    });
    await ui.flush(post, stayOf({ id: 's9' }), 201);

    expect(ui.router.url).toBe('/admin/guests/g1');
    expect(screen.getByText('Estadía registrada.')).toBeTruthy();
  });

  it('loads the stay to correct, keeps Guardar disabled without changes and sends the version', async () => {
    const ui = await setup('/admin/guests/g1/stays/s%2F1');
    const list = await ui.expect1(isStays);
    expect(list.request.params.get('limit')).toBe('100');
    await ui.flush(list, { content: [stayOf()], nextCursor: null });
    await ui.flush(await ui.expect1(isEnvironments), FREE);

    expect(ui.page().getByRole('heading', { level: 1, name: 'Corregir estadía' })).toBeTruthy();
    expect(ui.page().getByLabelText<HTMLInputElement>('Llegada').value).toBe('2026-11-10');
    expect(ui.page().getByLabelText<HTMLInputElement>('Salida').value).toBe('2026-11-15');
    expect(ui.page().getByLabelText<HTMLSelectElement>('Ambiente').value).toBe('env-1');
    expect(ui.page().getByLabelText<HTMLInputElement>('Monto acordado (S/)').value).toBe('400');
    expect(ui.save().disabled).toBe(true);

    await ui.type('Monto acordado (S/)', '450');
    expect(ui.save().disabled).toBe(false);
    await ui.type('Monto acordado (S/)', '400');
    expect(ui.save().disabled).toBe(true);
    await ui.type('Monto acordado (S/)', '450');

    await ui.click(ui.save());
    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({ agreedAmount: 450, version: 4 });
    await ui.flush(patch, stayOf({ agreedAmount: 450, version: 5 }));

    expect(ui.router.url).toBe('/admin/guests/g1');
    expect(screen.getByText('Estadía corregida.')).toBeTruthy();
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

  it('opens the shared dialog on 409 and reloads the stay with its new version', async () => {
    const ui = await correctReady();
    await ui.type('Monto acordado (S/)', '450');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'CONCURRENT_MODIFICATION', message: 'x' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'La estadía cambió' });
    expect(alert.textContent).toContain(
      'El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo',
    );
    await ui.click(within(alert).getByRole('button', { name: 'Volver a cargar' }));
    await ui.flush(await ui.expect1(isStays), {
      content: [stayOf({ agreedAmount: 420, version: 5 })],
      nextCursor: null,
    });
    await ui.flush(await ui.expect1(isEnvironments), FREE);

    expect(ui.page().getByLabelText<HTMLInputElement>('Monto acordado (S/)').value).toBe('420');
    expect(ui.save().disabled).toBe(true);
    await ui.type('Monto acordado (S/)', '450');
    await ui.click(ui.save());
    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({ agreedAmount: 450, version: 5 });
    await ui.flush(patch, stayOf({ agreedAmount: 450, version: 6 }));
    expect(ui.router.url).toBe('/admin/guests/g1');
  });

  it('goes back to A3.2 from the 409 dialog without saving', async () => {
    const ui = await correctReady();
    await ui.type('Monto acordado (S/)', '450');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'CONCURRENT_MODIFICATION', message: 'x' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'La estadía cambió' });
    await ui.click(within(alert).getByRole('button', { name: 'Volver al huésped' }));

    expect(ui.router.url).toBe('/admin/guests/g1');
    ui.http.expectNone(isStays);
  });

  it('shows STAY_OVERLAP with the BFF message under the dates, not in a dialog', async () => {
    const ui = await registerReady();
    await ui.choose('env/2');
    await ui.type('Monto acordado (S/)', '400');
    await ui.click(ui.save());
    const message =
      'Estas fechas se cruzan con otra estadía del huésped: del 01/11/2026 al 12/11/2026';
    await ui.flush(await ui.expect1(isCreate), { code: 'STAY_OVERLAP', message }, 409);

    expect(ui.describedBy('Llegada')).toBe(message);
    expect(ui.page().getByLabelText('Salida').getAttribute('aria-invalid')).toBe('true');
    expect(document.body.querySelector('mat-dialog-container')).toBeNull();
    expect(ui.router.url).toBe('/admin/guests/g1/stays/new');

    await ui.type('Salida', '2026-11-14');
    expect(ui.describedBy('Llegada')).toBeUndefined();
    await ui.flush(await ui.expect1(isEnvironments), FREE);
  });

  it('shows ENVIRONMENT_OCCUPIED in a dialog that links to the guest of the stay', async () => {
    const ui = await registerReady();
    await ui.choose('env/2');
    await ui.type('Monto acordado (S/)', '400');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isCreate),
      {
        code: 'ENVIRONMENT_OCCUPIED',
        message: 'El ambiente ya está ocupado en esas fechas',
        occupant: {
          kind: 'STAY',
          guestId: 'g/9',
          guestName: 'Otro huésped',
          contractId: null,
          stayId: 's7',
          startDate: '2026-11-09',
          endDate: '2026-11-12',
        },
      },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'Ambiente ocupado' });
    expect(alert.textContent).toContain('El ambiente ya está ocupado en esas fechas');
    await ui.click(within(alert).getByRole('button', { name: 'Ver huésped' }));

    expect(ui.router.url).toBe('/admin/guests/g%2F9');
  });

  it('asks the free environments again after "Entendido" on ENVIRONMENT_OCCUPIED', async () => {
    const ui = await registerReady();
    await ui.choose('env/2');
    await ui.type('Monto acordado (S/)', '400');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isCreate),
      { code: 'ENVIRONMENT_OCCUPIED', message: 'El ambiente ya está ocupado en esas fechas' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'Ambiente ocupado' });
    expect(within(alert).queryByRole('button', { name: 'Ver huésped' })).toBeNull();
    await ui.click(within(alert).getByRole('button', { name: 'Entendido' }));
    await ui.flush(await ui.expect1(isEnvironments), {
      content: [environment({ id: 'env-3', code: 'H2', type: 'ROOM' })],
      nextCursor: null,
      freeCount: 1,
    });

    expect(ui.page().getByLabelText<HTMLSelectElement>('Ambiente').value).toBe('');
    expect(ui.router.url).toBe('/admin/guests/g1/stays/new');
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
    'shows %s in a dialog with the BFF message and goes back to A3.2',
    async (code, title, message) => {
      const ui = await registerReady();
      await ui.choose('env/2');
      await ui.type('Monto acordado (S/)', '400');
      await ui.click(ui.save());
      await ui.flush(await ui.expect1(isCreate), { code, message, guestId: 'g1' }, 409);

      const alert = await screen.findByRole('alertdialog', { name: title });
      expect(alert.textContent).toContain(message);
      await ui.click(within(alert).getByRole('button', { name: 'Volver al huésped' }));

      expect(ui.router.url).toBe('/admin/guests/g1');
    },
  );

  it('shows a field error of the BFF next to its field', async () => {
    const ui = await registerReady();
    await ui.choose('env/2');
    await ui.type('Monto acordado (S/)', '400');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isCreate),
      {
        code: 'VALIDATION_ERROR',
        message: 'El monto admite hasta dos decimales',
        field: 'agreedAmount',
      },
      400,
    );

    expect(ui.describedBy('Monto acordado (S/)')).toBe('El monto admite hasta dos decimales');
    expect(document.activeElement).toBe(ui.page().getByLabelText('Monto acordado (S/)'));
  });

  it('shows an error without a field above the actions', async () => {
    const ui = await registerReady();
    await ui.choose('env/2');
    await ui.type('Monto acordado (S/)', '400');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isCreate),
      { code: 'RATE_LIMITED', message: 'Demasiados intentos, espera un momento' },
      429,
    );

    expect(ui.page().getByRole('alert').textContent).toContain(
      'Demasiados intentos, espera un momento',
    );
  });

  it('says so when the stay to correct does not exist', async () => {
    const ui = await setup('/admin/guests/g1/stays/s%2F1');
    await ui.flush(await ui.expect1(isStays), {
      content: [stayOf({ id: 'other' })],
      nextCursor: null,
    });

    expect(ui.page().getByText('No encontramos la estadía.')).toBeTruthy();
    expect(ui.page().queryByRole('button', { name: 'Guardar' })).toBeNull();
    expect(
      ui.page().getAllByRole('link', { name: 'Volver al huésped' })[0]?.getAttribute('href'),
    ).toBe('/admin/guests/g1');
  });

  it('keeps a stay registered before TAR-237 without an environment', async () => {
    const ui = await correctReady(stayOf({ environmentId: null, environmentCode: null }));

    const select = ui.page().getByLabelText<HTMLSelectElement>('Ambiente');
    expect(select.value).toBe('');
    expect(select.options[0]?.textContent.trim()).toBe('Sin ambiente');
    await ui.type('Monto acordado (S/)', '410');
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
