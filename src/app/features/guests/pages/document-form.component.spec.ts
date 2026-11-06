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
import { DocumentFormComponent } from './document-form.component';
import { ToastService } from '@shared/ui/toast/toast.service';
/** The text of the toast the screen asked for, or '' when there is none. */
const toastText = () => TestBed.inject(ToastService).current()?.text ?? '';

const isGuest = (req: HttpRequest<unknown>) =>
  req.method === 'GET' && req.url.endsWith('/bff/admin/guests/g1');
const isUpdate = (req: HttpRequest<unknown>) =>
  req.method === 'PATCH' && req.url.endsWith('/bff/admin/guests/g1');

const NUMBER = 'Número de documento';
const CHIPS: Readonly<Record<string, string>> = {
  DNI: 'DNI',
  CE: 'Carné de extranjería',
  PASSPORT: 'Pasaporte',
};

function pending(overrides: Partial<Record<string, unknown>> = {}): object {
  return {
    id: 'g1',
    version: 3,
    documentType: 'DNI',
    documentNumber: '70412233',
    name: null,
    type: 'TEMPORARY',
    hasLoginAccess: true,
    documentCount: 0,
    paymentHistory: [],
    status: 'PENDING_ACTIVATION',
    onboardingProgress: 'NOT_STARTED',
    ...overrides,
  };
}

const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

async function settle(harness: RouterTestingHarness) {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await harness.fixture.whenStable();
}

async function setup(guest: object = pending()) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/guests/:id', children: [] },
        { path: 'admin/guests/:id/document', component: DocumentFormComponent },
      ]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  const http = TestBed.inject(HttpTestingController);
  const router = TestBed.inject(Router);
  await harness.navigateByUrl('/admin/guests/g1/document');
  const expect1 = async (match: (req: HttpRequest<unknown>) => boolean) =>
    vi.waitFor(() => http.expectOne(match));
  const flush = async (req: TestRequest, body: object | null, status = 200) => {
    req.flush(body, { status, statusText: 'x' });
    await settle(harness);
  };
  await flush(await expect1(isGuest), guest);
  const page = () => within(present(harness.routeNativeElement));
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const type = async (value: string) => {
    fireEvent.input(page().getByLabelText(NUMBER), { target: { value } });
    await settle(harness);
  };
  const chooseType = async (kind: string) => {
    await click(page().getByRole('button', { name: CHIPS[kind] }));
  };
  const save = () =>
    page().getByRole<HTMLButtonElement>('button', { name: /^(Corregir documento|Guardando…)$/ });
  const numberError = () => {
    const ids = (page().getByLabelText(NUMBER).getAttribute('aria-describedby') ?? '').split(' ');
    const id = ids.find((each) => each.endsWith('-error'));
    return id ? document.getElementById(id)?.textContent.trim() : undefined;
  };
  return { http, router, page, click, type, chooseType, save, numberError, expect1, flush };
}

describe('DocumentFormComponent (A3.5 document of a pending guest, approved canvas)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    TestBed.inject(HttpTestingController).verify();
  });

  it('starts from the loaded document, says how it is today and waits for a change', async () => {
    const ui = await setup();

    expect(ui.page().getByRole('heading', { level: 1, name: 'Corregir documento' })).toBeTruthy();
    expect(ui.page().getByText(/^Hoy, \S+ \d{1,2} de \S+$/)).toBeTruthy();
    expect(
      ui.page().getByRole('link', { name: 'Volver a DNI 70412233' }).getAttribute('href'),
    ).toBe('/admin/guests/g1');
    const side = ui.page().getByRole('complementary', { name: 'Cómo está hoy' });
    expect(
      [...side.querySelectorAll('dl > div')].map((pair) => [
        squash(pair.querySelector('dt')?.textContent),
        squash(pair.querySelector('dd')?.textContent),
      ]),
    ).toEqual([
      ['Hoy', 'DNI 70412233'],
      ['Estado', 'Pendiente de activación'],
    ]);
    expect(side.querySelector('.badge')?.className).toContain('tone-wait');
    expect(squash(side.querySelector('.note')?.textContent)).toBe(
      'Aún no usa su acceso: el documento todavía se puede corregir. El acceso que ya le diste sigue sirviendo.',
    );
    const group = ui.page().getByRole('group', { name: 'Tipo de documento' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((chip) => [chip.textContent.trim(), chip.getAttribute('aria-pressed')]),
    ).toEqual([
      ['DNI', 'true'],
      ['Carné de extranjería', 'false'],
      ['Pasaporte', 'false'],
    ]);
    const input = ui.page().getByLabelText<HTMLInputElement>(NUMBER);
    expect(input.value).toBe('70412233');
    expect(input.getAttribute('maxlength')).toBe('20');
    expect(input.getAttribute('inputmode')).toBe('numeric');
    expect(
      squash(document.getElementById(input.getAttribute('aria-describedby') ?? '')?.textContent),
    ).toBe('Con este documento entrará a Quipu. Se puede corregir solo hasta que use su acceso.');
    expect(ui.save().disabled).toBe(true);
    await ui.type('70412238');
    expect(ui.save().disabled).toBe(false);
    await ui.type('70412233');
    expect(ui.save().disabled).toBe(true);
  });

  it.each([
    ['DNI', '', 'Escribe el número de documento.'],
    ['DNI', '1234', 'El DNI tiene 8 dígitos.'],
    ['DNI', '1234567A', 'El DNI tiene 8 dígitos.'],
    ['CE', 'AB_12', 'Usa solo letras, números o guion, hasta 20.'],
    ['PASSPORT', 'A B', 'Usa solo letras, números o guion, hasta 20.'],
  ])('with %s and "%s" says "%s" and sends nothing', async (kind, number, text) => {
    const ui = await setup();
    await ui.chooseType(kind);
    await ui.type(number);
    await ui.click(ui.save());

    expect(ui.numberError()).toBe(text);
    expect(document.activeElement).toBe(ui.page().getByLabelText(NUMBER));
    ui.http.expectNone(isUpdate);
  });

  it('corrects the document with the version loaded and goes back with the aviso', async () => {
    const ui = await setup();
    await ui.type(' 70412238 ');
    await ui.click(ui.save());

    const patch = await ui.expect1(isUpdate);
    expect(ui.save().textContent.trim()).toBe('Guardando…');
    expect(patch.request.body).toStrictEqual({ documentNumber: '70412238', version: 3 });
    await ui.flush(patch, { id: 'g1' });

    expect(ui.router.url).toBe('/admin/guests/g1');
    expect(toastText()).toBe('Documento corregido.');
  });

  it('sends the type too when it changed', async () => {
    const ui = await setup();
    await ui.chooseType('CE');
    expect(ui.page().getByLabelText(NUMBER).getAttribute('inputmode')).toBe('text');
    await ui.type('CE-001');
    await ui.click(ui.save());

    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({
      documentType: 'CE',
      documentNumber: 'CE-001',
      version: 3,
    });
    await ui.flush(patch, { id: 'g1' });
  });

  it('opens the shared dialog on 409 and reloads the guest with its new version', async () => {
    const ui = await setup();
    await ui.type('70412238');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'CONCURRENT_MODIFICATION', message: 'x' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'El registro cambió' });
    await ui.click(within(alert).getByRole('button', { name: 'Volver a cargar' }));
    await ui.flush(await ui.expect1(isGuest), pending({ version: 4, documentNumber: '11112222' }));

    expect(ui.page().getByLabelText<HTMLInputElement>(NUMBER).value).toBe('11112222');
    expect(ui.save().disabled).toBe(true);
    await ui.type('70412238');
    await ui.click(ui.save());
    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({ documentNumber: '70412238', version: 4 });
    await ui.flush(patch, { id: 'g1' });
  });

  it('keeps the form as it was after "Cerrar" on the 409 dialog, saving nothing', async () => {
    const ui = await setup();
    await ui.type('70412238');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'CONCURRENT_MODIFICATION', message: 'x' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'El registro cambió' });
    await ui.click(within(alert).getByRole('button', { name: 'Cerrar' }));

    expect(ui.router.url).toBe('/admin/guests/g1/document');
    expect(ui.page().getByLabelText<HTMLInputElement>(NUMBER).value).toBe('70412238');
    ui.http.expectNone(isGuest);
  });

  it.each([
    [
      'GUEST_DOCUMENT_TAKEN',
      'Ese documento ya pertenece a otro huésped o a una cuenta de administrador',
      'documentNumber',
    ],
    [
      'GUEST_DOCUMENT_LOCKED',
      'El documento solo se corrige antes de que el huésped active su acceso',
      'documentNumber',
    ],
    ['VALIDATION_ERROR', 'Tipo de documento no válido', 'documentType'],
  ])('shows %s with the BFF message under the document', async (code, message, field) => {
    const ui = await setup();
    await ui.type('45678912');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code, message, field },
      code === 'VALIDATION_ERROR' ? 400 : 409,
    );

    expect(ui.numberError()).toBe(message);
    expect(ui.page().getByLabelText(NUMBER).getAttribute('aria-invalid')).toBe('true');
    expect(document.body.querySelector('mat-dialog-container')).toBeNull();
    await ui.type('45678913');
    expect(ui.numberError()).toBeUndefined();
  });

  it('offers no form once the guest is no longer pending activation', async () => {
    const ui = await setup(
      pending({ name: 'Carmen Huamán', status: 'ACTIVE', onboardingProgress: 'COMPLETED' }),
    );

    expect(
      ui.page().getByText('El documento solo se corrige antes de que el huésped active su acceso'),
    ).toBeTruthy();
    expect(ui.page().getByRole('link', { name: 'Volver a Carmen Huamán' })).toBeTruthy();
    expect(ui.page().queryByRole('button', { name: 'Corregir documento' })).toBeNull();
    expect(ui.page().queryByLabelText(NUMBER)).toBeNull();
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
}
