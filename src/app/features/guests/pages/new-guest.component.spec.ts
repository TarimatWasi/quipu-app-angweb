import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, screen, within } from '@testing-library/dom';
import { Subject } from 'rxjs';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import type {
  GuestAlreadyRegistered,
  GuestCreated,
  GuestInput,
  NonInactiveGuestSummary,
} from '@core/api/clients/admin-guests.service';
import { AccessHandoffService } from '../data/access-handoff.service';
import { NewGuestComponent } from './new-guest.component';

const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

function httpError(status: number, body: object | null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error: body, statusText: 'Error' });
}

const CREATED: GuestCreated = {
  alreadyRegistered: false,
  guest: {
    id: 'g/new',
    documentType: 'DNI',
    documentNumber: '70412233',
    name: null,
    type: 'CONTRACT',
    status: 'PENDING_ACTIVATION',
    hasLoginAccess: false,
  },
  access: {
    mode: 'LINK',
    activationUrl: 'https://quipu.example/activate#token=t',
    expiresAt: '2026-11-05T16:42:00Z',
    emailSent: true,
    shareMessage: 'Hola',
  },
};

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

async function setup() {
  const creates = new Subject<GuestCreated | GuestAlreadyRegistered>();
  const reactivations = new Subject<NonInactiveGuestSummary>();
  const service = {
    create: vi.fn<(input: GuestInput) => typeof creates>(() => creates),
    reactivate: vi.fn<(id: string) => typeof reactivations>(() => reactivations),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/guests', children: [] },
        { path: 'admin/guests/new', component: NewGuestComponent },
        { path: 'admin/guests/:id', children: [] },
        { path: 'admin/guests/:id/access', children: [] },
        { path: 'admin/payments/new', children: [] },
      ]),
      { provide: AdminGuestsService, useValue: service },
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await harness.navigateByUrl('/admin/guests/new');
  const router = TestBed.inject(Router);
  const page = () => within(harness.routeNativeElement ?? document.body);
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const type = async (label: string, value: string) => {
    fireEvent.input(page().getByLabelText(label), { target: { value } });
    await settle(harness);
  };
  const choose = async (group: string, option: string) => {
    await click(
      within(page().getByRole('group', { name: group })).getByRole('button', { name: option }),
    );
  };
  const submit = () => click(page().getByRole('button', { name: 'Crear huésped' }));
  const answer = async (body: GuestCreated | GuestAlreadyRegistered) => {
    creates.next(body);
    creates.complete();
    await vi.waitFor(async () => {
      await settle(harness);
      expect(page().queryByRole('button', { name: 'Creando…' })).toBeNull();
    });
  };
  const fail = async (status: number, body: object | null) => {
    creates.error(httpError(status, body));
    await vi.waitFor(async () => {
      await settle(harness);
      // A dialog may be open over the page, which then is hidden from the accessibility tree.
      expect(page().getByRole('button', { name: 'Crear huésped', hidden: true })).toBeTruthy();
    });
  };
  const errorOf = (label: string) => {
    const ids = (page().getByLabelText(label).getAttribute('aria-describedby') ?? '').split(' ');
    return ids
      .map((id) => document.getElementById(id))
      .find((element) => element?.classList.contains('quipu-field-error'))
      ?.textContent.trim();
  };
  const facts = () =>
    [...(harness.routeNativeElement?.querySelectorAll('.summary app-fact-tile') ?? [])].map(
      (tile) => [
        squash(tile.querySelector('dt')?.textContent),
        squash(tile.querySelector('dd')?.textContent),
      ],
    );
  const dialog = (name: string) => within(screen.getByRole('dialog', { name }));
  return {
    harness,
    router,
    service,
    creates,
    reactivations,
    page,
    click,
    type,
    choose,
    submit,
    answer,
    fail,
    errorOf,
    facts,
    dialog,
  };
}

describe('NewGuestComponent (A3.1 «Nuevo huésped»)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    document.body.querySelectorAll('mat-snack-bar-container').forEach((el) => {
      el.remove();
    });
  });

  it('shows the header, the three sections with their defaults and the empty summary', async () => {
    const ui = await setup();

    expect(ui.page().getByRole('heading', { level: 1, name: 'Nuevo huésped' })).toBeTruthy();
    expect(ui.page().getByText(/^Hoy, \S+ \d{1,2} de \S+$/)).toBeTruthy();
    expect(ui.page().getByRole('link', { name: 'Volver a Huéspedes' }).getAttribute('href')).toBe(
      '/admin/guests',
    );
    const pressed = (group: string) =>
      within(ui.page().getByRole('group', { name: group }))
        .getAllByRole('button')
        .map((button) => [squash(button.textContent), button.getAttribute('aria-pressed')]);
    expect(pressed('Tipo de huésped')).toEqual([
      ['Con contrato', 'true'],
      ['Temporal', 'false'],
    ]);
    expect(pressed('Tipo de documento')).toEqual([
      ['DNI', 'true'],
      ['Carné de extranjería', 'false'],
      ['Pasaporte', 'false'],
    ]);
    expect(pressed('Cómo entregar el acceso')).toEqual([
      ['Link de activación', 'true'],
      ['Clave temporal', 'false'],
    ]);
    expect(ui.page().getByLabelText('Número de documento').getAttribute('inputmode')).toBe(
      'numeric',
    );
    // Only the document number is a short field (max. 320 px); phone and email take the form's width.
    const short = (label: string) =>
      ui.page().getByLabelText(label).closest('app-form-field')?.classList.contains('narrow');
    expect([short('Número de documento'), short('Teléfono'), short('Correo')]).toEqual([
      true,
      false,
      false,
    ]);
    expect(ui.facts()).toEqual([
      ['Documento', 'Falta el número'],
      ['Tipo', 'Con contrato'],
      ['Acceso', 'Link'],
      ['Se le avisa por', 'El mensaje que copies'],
    ]);
    const note = ui.page().getByText(/hasta que use su acceso/);
    expect(squash(note.textContent)).toBe(
      'Queda en Pendiente de activación hasta que use su acceso. Su nombre y sus datos los completa el huésped.',
    );
    expect(ui.page().getByRole('link', { name: 'Cancelar' }).getAttribute('href')).toBe(
      '/admin/guests',
    );
  });

  it('changes the summary and the helps as the administrator types and chooses', async () => {
    const ui = await setup();

    await ui.choose('Tipo de huésped', 'Temporal');
    await ui.choose('Tipo de documento', 'Pasaporte');
    await ui.type('Número de documento', 'PX-77');
    await ui.choose('Cómo entregar el acceso', 'Clave temporal');
    await ui.type('Teléfono', '987 654 321');
    expect(ui.facts()).toEqual([
      ['Documento', 'Pasaporte PX-77'],
      ['Tipo', 'Temporal'],
      ['Acceso', 'Clave temporal'],
      ['Se le avisa por', 'WhatsApp'],
    ]);
    await ui.type('Correo', 'ana@example.com');
    expect(ui.facts()[3]).toEqual(['Se le avisa por', 'WhatsApp y correo']);
    await ui.type('Teléfono', '');
    expect(ui.facts()[3]).toEqual(['Se le avisa por', 'Correo']);

    expect(ui.page().getByText(/^Paga por estadía: registras su estadía/)).toBeTruthy();
    expect(ui.page().getByText(/^El número de su pasaporte, hasta 20 letras/)).toBeTruthy();
    expect(
      ui
        .page()
        .getByText(
          /^Entra con su documento y la clave, y luego elige su contraseña\. Vence a los 30 minutos/,
        ),
    ).toBeTruthy();
    expect(ui.page().getByLabelText('Número de documento').getAttribute('inputmode')).toBe('text');
  });

  it('checks the document, the phone and the email before calling the BFF', async () => {
    const ui = await setup();

    await ui.submit();
    expect(ui.errorOf('Número de documento')).toBe('Escribe el número de documento.');
    expect(document.activeElement).toBe(ui.page().getByLabelText('Número de documento'));

    await ui.type('Número de documento', '7041223');
    expect(ui.errorOf('Número de documento')).toBe('El DNI tiene 8 dígitos.');
    await ui.choose('Tipo de documento', 'Carné de extranjería');
    await ui.type('Número de documento', 'AB 12');
    expect(ui.errorOf('Número de documento')).toBe('Usa solo letras, números o guion, hasta 20.');
    await ui.type('Teléfono', '12345');
    await ui.type('Correo', 'ana@');
    await ui.submit();
    expect(ui.errorOf('Teléfono')).toBe('Revisa el teléfono.');
    expect(ui.errorOf('Correo')).toBe('Escribe un correo válido.');
    expect(ui.service.create).not.toHaveBeenCalled();
  });

  it('creates the guest, hands its access in memory and opens A3.7 with only the id', async () => {
    const ui = await setup();
    await ui.type('Número de documento', ' 70412233 ');
    await ui.type('Teléfono', '+51 987 654 321');
    await ui.type('Correo', 'ana@example.com');

    await ui.submit();
    expect(ui.page().getByRole<HTMLButtonElement>('button', { name: 'Creando…' }).disabled).toBe(
      true,
    );
    expect(ui.service.create).toHaveBeenCalledWith({
      documentType: 'DNI',
      documentNumber: '70412233',
      type: 'CONTRACT',
      phone: '+51 987 654 321',
      contactEmail: 'ana@example.com',
      accessMode: 'LINK',
    });
    await ui.answer(CREATED);

    expect(ui.router.url).toBe('/admin/guests/g%2Fnew/access');
    expect(JSON.stringify(history.state)).not.toContain('activate#token');
    expect(TestBed.inject(AccessHandoffService).take('g/new')).toEqual({
      guestId: 'g/new',
      documentType: 'DNI',
      documentNumber: '70412233',
      type: 'CONTRACT',
      phone: '+51 987 654 321',
      contactEmail: 'ana@example.com',
      access: CREATED.access,
      regenerated: false,
    });
  });

  it('puts each server error under its field, with the texts of this screen', async () => {
    const cases: readonly [object, string, string][] = [
      [
        { code: 'GUEST_DOCUMENT_TAKEN', field: 'documentNumber', message: 'srv' },
        'Número de documento',
        'Ese documento ya pertenece a otro huésped o a una cuenta de administrador',
      ],
      [
        { code: 'ACCOUNT_DOCUMENT_TAKEN', field: 'documentNumber' },
        'Número de documento',
        'Ese documento ya pertenece a otro huésped o a una cuenta de administrador',
      ],
      [
        { code: 'GUEST_EMAIL_TAKEN', field: 'contactEmail' },
        'Correo',
        'Ese correo ya está registrado para otro huésped',
      ],
      [
        { code: 'ACCOUNT_EMAIL_TAKEN', field: 'contactEmail' },
        'Correo',
        'Ese correo ya está registrado para otra cuenta',
      ],
      [{ code: 'VALIDATION_ERROR', field: 'phone' }, 'Teléfono', 'Revisa el teléfono.'],
    ];
    for (const [body, label, text] of cases) {
      TestBed.resetTestingModule();
      const ui = await setup();
      await ui.type('Número de documento', '70412233');
      await ui.submit();
      await ui.fail(409, body);

      expect(ui.errorOf(label)).toBe(text);
      expect(ui.page().queryByText('srv')).toBeNull();
      expect(document.activeElement).toBe(ui.page().getByLabelText(label));
    }
  });

  it('says to wait when there were too many attempts', async () => {
    const ui = await setup();
    await ui.type('Número de documento', '70412233');
    await ui.submit();
    await ui.fail(429, { code: 'RATE_LIMITED', message: 'srv' });

    const alert = ui.page().getByRole('alert');
    expect(squash(alert.textContent)).toBe(
      'Demasiados intentos, espera un momento antes de volver a intentar.',
    );
    expect(ui.page().getByRole('form').getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('shows the guest already registered, with its real state, and opens its file', async () => {
    const ui = await setup();
    await ui.type('Número de documento', '70412233');
    await ui.submit();
    await ui.answer({
      alreadyRegistered: true,
      guest: { ...CREATED.guest, id: 'g7', name: null, status: 'PENDING_ACTIVATION' },
    });

    const dialog = ui.dialog('Este documento ya está registrado');
    expect(dialog.getByText('DNI 70412233')).toBeTruthy();
    expect(dialog.getByText('Sin nombre aún')).toBeTruthy();
    expect(squash(dialog.getByText(/Pendiente de activación/).textContent)).toBe(
      'Pendiente de activación',
    );
    expect(
      dialog.getByText(
        'No se creó otro huésped ni se modificó ningún dato. Si perdió su acceso o le venció, genera otro desde su ficha.',
      ),
    ).toBeTruthy();
    await ui.click(dialog.getByRole('button', { name: 'Ver huésped' }));

    expect(ui.router.url).toBe('/admin/guests/g7');
  });

  it('says nothing about a lost access for an active guest, and «Cerrar» stays here', async () => {
    const ui = await setup();
    await ui.type('Número de documento', '70412233');
    await ui.submit();
    await ui.answer({
      alreadyRegistered: true,
      guest: { ...CREATED.guest, id: 'g7', name: 'Ana Torres', status: 'ACTIVE' },
    });

    const dialog = ui.dialog('Este documento ya está registrado');
    expect(dialog.getByText('Ana Torres')).toBeTruthy();
    expect(dialog.getByText('Activo')).toBeTruthy();
    expect(dialog.getByText('No se creó otro huésped ni se modificó ningún dato.')).toBeTruthy();
    await ui.click(dialog.getByRole('button', { name: 'Cerrar' }));

    expect(ui.router.url).toBe('/admin/guests/new');
  });

  it('reactivates an inactive guest from its dialog and opens its file', async () => {
    const ui = await setup();
    await ui.type('Número de documento', '70412233');
    await ui.submit();
    await ui.fail(409, { code: 'GUEST_INACTIVE', guestId: 'g9', message: 'srv' });

    const dialog = ui.dialog('Este huésped está inactivo');
    expect(dialog.getByText('DNI 70412233')).toBeTruthy();
    expect(
      dialog.getByText(
        'Reactiva su cuenta para que vuelva a entrar con su acceso; se conservan sus datos y su historial.',
      ),
    ).toBeTruthy();
    await ui.click(dialog.getByRole('button', { name: 'Reactivar huésped' }));
    expect(ui.service.reactivate).toHaveBeenCalledWith('g9');
    expect(dialog.getByRole<HTMLButtonElement>('button', { name: 'Reactivando…' }).disabled).toBe(
      true,
    );
    ui.reactivations.next({ ...CREATED.guest, id: 'g9', status: 'ACTIVE' });
    ui.reactivations.complete();

    await vi.waitFor(async () => {
      await settle(ui.harness);
      expect(ui.router.url).toBe('/admin/guests/g9');
    });
    expect(document.body.querySelector('mat-snack-bar-container')?.textContent).toContain(
      'Huésped reactivado.',
    );
  });

  it('keeps the dialog with a red notice when the reactivation fails', async () => {
    const ui = await setup();
    await ui.type('Número de documento', '70412233');
    await ui.submit();
    await ui.fail(409, { code: 'GUEST_INACTIVE', guestId: 'g9' });
    const dialog = ui.dialog('Este huésped está inactivo');
    await ui.click(dialog.getByRole('button', { name: 'Reactivar huésped' }));
    ui.reactivations.error(httpError(409, { code: 'CONCURRENT_MODIFICATION', message: 'srv' }));
    await settle(ui.harness);

    expect(squash(dialog.getByRole('alert').textContent)).toBe(
      'El huésped cambió mientras tanto. Cierra este aviso y vuelve a intentarlo.',
    );
    expect(dialog.getByRole('button', { name: 'Reactivar huésped' })).toBeTruthy();
    expect(ui.router.url).toBe('/admin/guests/new');
  });

  it('asks to pay the debt first and opens the direct payment of that guest', async () => {
    const ui = await setup();
    await ui.type('Número de documento', '70412233');
    await ui.submit();
    await ui.fail(409, { code: 'GUEST_INACTIVE', guestId: 'g9' });
    await ui.click(
      ui.dialog('Este huésped está inactivo').getByRole('button', { name: 'Reactivar huésped' }),
    );
    ui.reactivations.error(
      httpError(409, {
        code: 'GUEST_HAS_PENDING_DEBT',
        message: 'srv',
        periods: ['2026-07', '2026-08'],
        debts: [
          {
            period: '2026-07',
            stayId: null,
            stayStartDate: null,
            stayEndDate: null,
            amountDue: 650,
          },
          {
            period: '2026-08',
            stayId: null,
            stayStartDate: null,
            stayEndDate: null,
            amountDue: 650,
          },
        ],
      }),
    );

    await vi.waitFor(async () => {
      await settle(ui.harness);
      expect(screen.getByRole('alertdialog', { name: 'Primero salda su deuda' })).toBeTruthy();
    });
    const debt = within(screen.getByRole('alertdialog', { name: 'Primero salda su deuda' }));
    expect(screen.queryByRole('dialog', { name: 'Este huésped está inactivo' })).toBeNull();
    expect(
      debt
        .getAllByRole('listitem')
        .map((item) => [...item.children].map((cell) => squash(cell.textContent))),
    ).toEqual([
      ['Julio 2026', 'S/ 650.00'],
      ['Agosto 2026', 'S/ 650.00'],
      ['Total', 'S/ 1,300.00'],
    ]);
    expect(debt.getByText(/^Salda sus meses impagos antes de reactivar su cuenta/)).toBeTruthy();
    await ui.click(debt.getByRole('button', { name: 'Registrar pago' }));

    expect(ui.router.url).toBe('/admin/payments/new?guestId=g9');
  });

  it('ignores a late answer once the administrator left the page', async () => {
    const ui = await setup();
    await ui.type('Número de documento', '70412233');
    await ui.submit();
    await ui.harness.navigateByUrl('/admin/guests');

    ui.creates.next(CREATED);
    ui.creates.complete();
    await settle(ui.harness);

    expect(ui.router.url).toBe('/admin/guests');
    expect(TestBed.inject(AccessHandoffService).take('g/new')).toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
