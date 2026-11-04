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

const isGuest = (req: HttpRequest<unknown>) =>
  req.method === 'GET' && req.url.endsWith('/bff/admin/guests/g1');
const isUpdate = (req: HttpRequest<unknown>) =>
  req.method === 'PATCH' && req.url.endsWith('/bff/admin/guests/g1');

function pending(overrides: Partial<Record<string, unknown>> = {}): object {
  return {
    id: 'g1',
    version: 3,
    documentType: 'DNI',
    documentNumber: '12345678',
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
    fireEvent.input(page().getByLabelText('Número de documento'), { target: { value } });
    await settle(harness);
  };
  const chooseType = async (value: string) => {
    const select = page().getByLabelText<HTMLSelectElement>('Tipo de documento');
    select.value = value;
    fireEvent.change(select);
    await settle(harness);
  };
  const save = () => page().getByRole<HTMLButtonElement>('button', { name: 'Guardar' });
  const numberError = () => {
    const id = page().getByLabelText('Número de documento').getAttribute('aria-describedby') ?? '';
    return document.getElementById(id)?.textContent.trim();
  };
  return { http, router, page, click, type, chooseType, save, numberError, expect1, flush };
}

describe('DocumentFormComponent (A3.5 document of a pending guest)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
    document.body.querySelectorAll('mat-snack-bar-container').forEach((el) => {
      el.remove();
    });
    TestBed.inject(HttpTestingController).verify();
  });

  it('starts from the loaded document with Guardar disabled until something changes', async () => {
    const ui = await setup();

    expect(ui.page().getByRole('heading', { level: 1, name: 'Corregir documento' })).toBeTruthy();
    expect(ui.page().getByLabelText<HTMLSelectElement>('Tipo de documento').value).toBe('DNI');
    expect(ui.page().getByLabelText<HTMLInputElement>('Número de documento').value).toBe(
      '12345678',
    );
    expect(ui.save().disabled).toBe(true);
    await ui.type('12345679');
    expect(ui.save().disabled).toBe(false);
    await ui.type('12345678');
    expect(ui.save().disabled).toBe(true);
  });

  it.each([
    ['DNI', '', 'Escribe el número de documento.'],
    ['DNI', '1234', 'El DNI tiene 8 dígitos.'],
    ['DNI', '1234567A', 'El DNI tiene 8 dígitos.'],
    ['CE', 'AB_12', 'Usa solo letras, números o guion, hasta 20.'],
    ['PASSPORT', 'A'.repeat(21), 'Usa solo letras, números o guion, hasta 20.'],
  ])('with %s and "%s" says "%s" and sends nothing', async (kind, number, text) => {
    const ui = await setup();
    await ui.chooseType(kind);
    await ui.type(number);
    await ui.click(ui.save());

    expect(ui.numberError()).toBe(text);
    expect(document.activeElement).toBe(ui.page().getByLabelText('Número de documento'));
    ui.http.expectNone(isUpdate);
  });

  it('corrects the document with the version loaded and goes back with the aviso', async () => {
    const ui = await setup();
    await ui.type(' 87654321 ');
    await ui.click(ui.save());

    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({ documentNumber: '87654321', version: 3 });
    await ui.flush(patch, { id: 'g1' });

    expect(ui.router.url).toBe('/admin/guests/g1');
    expect(screen.getByText('Documento corregido.')).toBeTruthy();
  });

  it('sends the type too when it changed', async () => {
    const ui = await setup();
    await ui.chooseType('CE');
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
    await ui.type('87654321');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'CONCURRENT_MODIFICATION', message: 'x' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'El huésped cambió' });
    await ui.click(within(alert).getByRole('button', { name: 'Volver a cargar' }));
    await ui.flush(await ui.expect1(isGuest), pending({ version: 4, documentNumber: '11112222' }));

    expect(ui.page().getByLabelText<HTMLInputElement>('Número de documento').value).toBe(
      '11112222',
    );
    expect(ui.save().disabled).toBe(true);
    await ui.type('87654321');
    await ui.click(ui.save());
    const patch = await ui.expect1(isUpdate);
    expect(patch.request.body).toStrictEqual({ documentNumber: '87654321', version: 4 });
    await ui.flush(patch, { id: 'g1' });
  });

  it('goes back to A3.2 from the 409 dialog without saving', async () => {
    const ui = await setup();
    await ui.type('87654321');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'CONCURRENT_MODIFICATION', message: 'x' },
      409,
    );

    const alert = await screen.findByRole('alertdialog', { name: 'El huésped cambió' });
    await ui.click(within(alert).getByRole('button', { name: 'Volver al huésped' }));

    expect(ui.router.url).toBe('/admin/guests/g1');
    ui.http.expectNone(isGuest);
  });

  it.each([
    [
      'GUEST_DOCUMENT_TAKEN',
      'Ese documento ya pertenece a otro huésped o a una cuenta de administrador',
    ],
    [
      'GUEST_DOCUMENT_LOCKED',
      'El documento solo se corrige antes de que el huésped active su acceso',
    ],
  ])('shows %s with the BFF message under the number', async (code, message) => {
    const ui = await setup();
    await ui.type('87654321');
    await ui.click(ui.save());
    await ui.flush(await ui.expect1(isUpdate), { code, message, field: 'documentNumber' }, 409);

    expect(ui.numberError()).toBe(message);
    expect(document.body.querySelector('mat-dialog-container')).toBeNull();
  });

  it('shows a document error of the BFF on the type when its field is the type', async () => {
    const ui = await setup();
    await ui.type('87654321');
    await ui.click(ui.save());
    await ui.flush(
      await ui.expect1(isUpdate),
      { code: 'VALIDATION_ERROR', message: 'Tipo de documento no válido', field: 'documentType' },
      400,
    );

    const select = ui.page().getByLabelText('Tipo de documento');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    const id = select.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(id)?.textContent.trim()).toBe('Tipo de documento no válido');
  });

  it('offers no form once the guest is no longer pending activation', async () => {
    const ui = await setup(pending({ status: 'ACTIVE', onboardingProgress: 'COMPLETED' }));

    expect(
      ui.page().getByText('El documento solo se corrige antes de que el huésped active su acceso'),
    ).toBeTruthy();
    expect(ui.page().queryByRole('button', { name: 'Guardar' })).toBeNull();
    expect(ui.page().queryByLabelText('Número de documento')).toBeNull();
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('expected a value');
  }
  return value;
}
