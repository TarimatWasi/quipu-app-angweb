import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import { Observable, of, throwError } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { CHANGE_PASSWORD_ACTION } from '@shared/ui/account-actions/change-password-action';
import { ToastService } from '@shared/ui/toast/toast.service';
import { GuestProfileService } from '../data/guest-profile.service';
import { OwnContractService } from '../data/own-contract.service';
import type { OwnContracts } from '../data/own-contract.service';
import type { OwnDocument, OwnDocumentRef, OwnProfile } from '../data/own-profile';
import { TemporaryGuestPaymentsService } from '../data/temporary-guest-payments.service';
import { TemporaryGuestProfileService } from '../data/temporary-guest-profile.service';
import { OwnProfileComponent } from './own-profile.component';

type Contract = components['schemas']['Contract'];
type Audience = 'CONTRACT' | 'TEMPORARY';

const DOCUMENT: OwnDocumentRef = {
  id: 'd1',
  originalName: 'dni-ana.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 1_258_291,
  uploadedAt: '2026-03-02T15:00:00Z',
};

function profileOf(fields: Partial<OwnProfile> = {}): OwnProfile {
  return {
    documentType: 'DNI',
    documentNumber: '12345678',
    name: 'Ana Quispe',
    phone: '987 654 321',
    email: 'ana@correo.pe',
    pendingEmail: null,
    emergencyContact: { name: 'Rosa Mamani', relationship: 'Madre', phone: '+51 951 234 567' },
    documents: [DOCUMENT],
    documentsLimit: 5,
    ...fields,
  };
}

const CONTRACT = {
  environmentType: 'ROOM',
  environmentCode: '201',
  monthlyAmount: 800,
  paymentDay: 5,
  startDate: '2026-03-01',
  endDate: '2027-02-28',
} as Contract;

const httpError = (status: number, body: object | null = null) =>
  new HttpErrorResponse({ status, error: body, statusText: 'Error' });
const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();

interface Answers {
  stay?: Observable<object>;
  profile?: Observable<OwnProfile>;
  contract?: Observable<OwnContracts>;
}

async function setup(audience: Audience = 'CONTRACT', answers: Answers = {}) {
  const api = {
    profile: vi.fn<() => Observable<OwnProfile>>(() => answers.profile ?? of(profileOf())),
    update: vi.fn<(changes: object) => Observable<unknown>>(() => of({ id: 'g1' })),
    emailVerification: {
      request: vi.fn<(email: string) => Observable<unknown>>(() => of(null)),
      confirm: vi.fn<(code: string) => Observable<unknown>>(() => of(null)),
    },
    upload: vi.fn<(file: File) => Observable<OwnDocumentRef>>(() => of({ ...DOCUMENT, id: 'd2' })),
    document: vi.fn<(id: string) => Observable<OwnDocument>>(() =>
      of({ ...DOCUMENT, url: 'https://files.example/d1', urlExpiresAt: '2999-01-01T00:00:00Z' }),
    ),
  };
  const contracts = {
    get: vi.fn<() => Observable<OwnContracts>>(
      () => answers.contract ?? of({ current: CONTRACT, next: null }),
    ),
  };
  const stays = {
    paymentStatus: vi.fn(
      () =>
        answers.stay ??
        of({
          startDate: '2026-10-20',
          endDate: '2026-10-31',
          agreedAmount: 380,
          environmentCode: 'C1',
          environmentType: 'CABIN',
        }),
    ),
  };
  const changePassword = vi.fn<(restoreFocus?: HTMLElement) => Promise<void>>(() =>
    Promise.resolve(),
  );
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'guest/contract', children: [] },
        { path: 'profile', component: OwnProfileComponent, data: { audience } },
      ]),
      { provide: GuestProfileService, useValue: api },
      { provide: TemporaryGuestProfileService, useValue: api },
      { provide: OwnContractService, useValue: contracts },
      { provide: TemporaryGuestPaymentsService, useValue: stays },
      { provide: CHANGE_PASSWORD_ACTION, useValue: changePassword },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await TestBed.inject(Router).navigateByUrl('/profile');
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
  const type = async (label: string | RegExp, value: string) => {
    fireEvent.input(page().getByLabelText(label), { target: { value } });
    await settle();
  };
  const pick = async (file: File) => {
    const input = page().getByLabelText<HTMLInputElement>('Archivo del documento');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    await settle();
  };
  const toast = () => TestBed.inject(ToastService).current();
  const save = () =>
    page().getByRole<HTMLButtonElement>('button', { name: /Guardar cambios|Guardando/ });
  return { api, contracts, changePassword, page, settle, click, type, pick, toast, save };
}

const pdf = (name = 'constancia.pdf') => new File(['x'], name, { type: 'application/pdf' });

describe('OwnProfileComponent (H5, guest with a contract)', () => {
  it('shows the data in the form, what the administration keeps and the documents', async () => {
    const ui = await setup();

    expect(ui.page().getByRole('heading', { level: 1 }).textContent).toBe('Mis datos');
    expect(ui.page().getByLabelText(/Nombre completo/)).toHaveProperty('value', 'Ana Quispe');
    expect(ui.page().getByLabelText(/Teléfono/)).toHaveProperty('value', '987 654 321');
    // The email is shown, not edited: it changes with a code (TAR-349).
    expect(ui.page().getByText('ana@correo.pe')).toBeTruthy();
    expect(ui.page().getByRole('button', { name: 'Cambiar correo' })).toBeTruthy();
    expect(ui.page().getByLabelText('Parentesco')).toHaveProperty('value', 'Madre');
    const deal = ui.page().getByRole('region', { name: 'Tu contrato' });
    expect([...deal.querySelectorAll('app-fact-tile')].map((tile) => text(tile))).toEqual([
      'AmbienteHabitación 201',
      'CuotaS/ 800.00',
      'Contrato1 mar 2026 – 28 feb 2027',
      'Día de pago5 de cada mes',
      'DocumentoDNI 12345678',
    ]);
    expect(ui.page().getByRole('link', { name: 'Ver mi contrato' }).getAttribute('href')).toBe(
      '/guest/contract',
    );
    expect(ui.page().getByText('(1 de 5)')).toBeTruthy();
    expect(ui.page().getByText('dni-ana.jpg', { selector: 'strong' })).toBeTruthy();
    expect(ui.save().disabled).toBe(true);
  });

  it('keeps showing the data when the contract does not load, with only what the profile has', async () => {
    const ui = await setup('CONTRACT', { contract: throwError(() => httpError(404)) });

    expect(ui.page().getByLabelText(/Nombre completo/)).toHaveProperty('value', 'Ana Quispe');
    const deal = ui.page().getByRole('region', { name: 'Tu contrato' });
    expect([...deal.querySelectorAll('app-fact-tile dt')].map((term) => text(term))).toEqual([
      'Documento',
    ]);
    expect(ui.page().queryByRole('link', { name: 'Ver mi contrato' })).toBeNull();
  });

  it('keeps the title and offers «Reintentar» when the data does not load', async () => {
    const ui = await setup('CONTRACT', { profile: throwError(() => httpError(500)) });
    expect(ui.page().getByText('No se pudieron cargar tus datos.')).toBeTruthy();
    expect(ui.page().getByRole('heading', { level: 1 }).textContent).toBe('Mis datos');

    ui.api.profile.mockReturnValue(of(profileOf()));
    await ui.click(ui.page().getByRole('button', { name: 'Reintentar' }));

    expect(ui.page().getByLabelText(/Nombre completo/)).toHaveProperty('value', 'Ana Quispe');
  });

  it('saves only what changed, tells it and reads the data again', async () => {
    const ui = await setup();

    await ui.type(/Teléfono/, ' 912 345 678 ');
    expect(ui.save().disabled).toBe(false);
    ui.api.profile.mockReturnValue(of(profileOf({ phone: '912 345 678' })));
    await ui.click(ui.save());

    expect(ui.api.update).toHaveBeenCalledWith({ phone: '912 345 678' });
    expect(ui.toast()?.text).toBe('Datos actualizados.');
    expect(ui.api.profile).toHaveBeenCalledTimes(2);
    expect(ui.page().getByLabelText(/Teléfono/)).toHaveProperty('value', '912 345 678');
    expect(ui.save().disabled).toBe(true);
  });

  it('says what is wrong before calling the BFF', async () => {
    const ui = await setup();

    await ui.type(/Nombre completo/, '');
    await ui.type(/Teléfono/, '12');
    await ui.click(ui.save());

    expect(ui.page().getByText('Escribe tu nombre completo.')).toBeTruthy();
    expect(ui.page().getByText('Revisa el teléfono.')).toBeTruthy();
    expect(ui.api.update).not.toHaveBeenCalled();
  });

  it('puts a refused phone under its field and a busy server above the buttons', async () => {
    const ui = await setup();
    await ui.type(/Teléfono/, '912 345 678');

    ui.api.update.mockReturnValueOnce(
      throwError(() => httpError(400, { code: 'VALIDATION_ERROR', field: 'phone' })),
    );
    await ui.click(ui.save());
    expect(ui.page().getByText('Revisa el teléfono.')).toBeTruthy();
    expect(ui.page().queryByRole('alert')).toBeNull();

    // What the BFF refused stays under the field until the guest changes it.
    await ui.type(/Teléfono/, '912 345 679');
    ui.api.update.mockReturnValueOnce(throwError(() => httpError(429, { code: 'RATE_LIMITED' })));
    await ui.click(ui.save());
    expect(ui.page().getByRole('alert').textContent).toContain('Demasiados intentos');
  });

  it('gives back what is saved on «Cancelar»', async () => {
    const ui = await setup();
    await ui.type(/Teléfono/, '912 345 678');

    await ui.click(ui.page().getByRole('button', { name: 'Cancelar' }));

    expect(ui.page().getByLabelText(/Teléfono/)).toHaveProperty('value', '987 654 321');
    expect(ui.page().queryByRole('button', { name: 'Cancelar' })).toBeNull();
  });

  it('does not pretend to remove a saved emergency contact: it says so and calls nothing', async () => {
    const ui = await setup();
    await ui.type('Nombre', '');

    await ui.click(ui.save());

    expect(ui.page().getByRole('alert').textContent).toContain(
      'no se puede quitar un dato guardado',
    );
    expect(ui.api.update).not.toHaveBeenCalled();
  });

  it('fills the relationship with a shortcut without replacing the field', async () => {
    const ui = await setup();

    await ui.click(ui.page().getByRole('button', { name: 'Pareja' }));
    expect(ui.page().getByLabelText('Parentesco')).toHaveProperty('value', 'Pareja');
    await ui.type('Parentesco', 'Prima');

    expect(ui.page().getByLabelText('Parentesco')).toHaveProperty('value', 'Prima');
    expect(ui.page().getByRole('button', { name: 'Pareja' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
  });

  it('opens «Cambiar contraseña» from the shell, with the button as the place to come back to', async () => {
    const ui = await setup();
    const button = ui.page().getByRole('button', { name: 'Cambiar contraseña' });

    await ui.click(button);

    expect(ui.changePassword).toHaveBeenCalledWith(button);
  });
});

describe('OwnProfileComponent (T3, temporary guest)', () => {
  it('shows the stay instead of the contract, and no link to a contract', async () => {
    const ui = await setup('TEMPORARY');

    const deal = ui.page().getByRole('region', { name: 'Tu estadía' });
    expect([...deal.querySelectorAll('app-fact-tile')].map((tile) => text(tile))).toEqual([
      'AmbienteCabaña C1',
      'AcordadoS/ 380.00',
      'Estadía20 – 31 oct',
      'DocumentoDNI 12345678',
    ]);
    expect(ui.page().queryByRole('link', { name: 'Ver mi contrato' })).toBeNull();
  });

  it('leaves the environment out for an old stay that has none', async () => {
    const ui = await setup('TEMPORARY', {
      stay: of({
        startDate: '2026-10-20',
        endDate: '2026-10-31',
        agreedAmount: 380,
        environmentCode: null,
        environmentType: null,
      }),
    });

    const deal = ui.page().getByRole('region', { name: 'Tu estadía' });
    expect(text(deal)).not.toContain('Ambiente');
    expect(text(deal)).toContain('AcordadoS/ 380.00');
  });

  it('offers «Agregar correo» without one, and the code of the email waiting for it', async () => {
    const ui = await setup('TEMPORARY', {
      profile: of(profileOf({ email: null, pendingEmail: 'ana@nuevo.pe' })),
    });

    expect(ui.page().getByText('Sin correo')).toBeTruthy();
    expect(ui.page().getByRole('button', { name: 'Agregar correo' })).toBeTruthy();
    expect(
      ui.page().getByText('Falta confirmar ana@nuevo.pe: escribe el código que te enviamos.'),
    ).toBeTruthy();
    expect(ui.page().getByRole('button', { name: 'Escribir el código' })).toBeTruthy();
  });
});

describe('OwnProfileComponent documents (H5, T3)', () => {
  it('keeps the file «Por subir» with «Quitar» until it is sent, and tells it once uploaded', async () => {
    const ui = await setup();
    await ui.pick(pdf());
    expect(ui.page().getByText('Por subir')).toBeTruthy();
    expect(ui.page().getByText('constancia.pdf', { selector: 'strong' })).toBeTruthy();
    await ui.click(ui.page().getByRole('button', { name: /^Quitar/ }));
    expect(ui.page().queryByText('Por subir')).toBeNull();

    const file = pdf();
    await ui.pick(file);
    ui.api.profile.mockReturnValue(
      of(
        profileOf({
          documents: [DOCUMENT, { ...DOCUMENT, id: 'd2', originalName: 'constancia.pdf' }],
        }),
      ),
    );
    await ui.click(ui.page().getByRole('button', { name: 'Subir documento' }));

    expect(ui.api.upload).toHaveBeenCalledWith(file);
    expect(ui.toast()?.text).toBe('Documento subido.');
    expect(ui.page().queryByText('Por subir')).toBeNull();
    expect(ui.page().getByText('(2 de 5)')).toBeTruthy();
  });

  it('does not let a file that is not JPG, PNG or PDF go up', async () => {
    const ui = await setup();

    await ui.pick(new File(['x'], 'foto.heic', { type: 'image/heic' }));

    expect(ui.page().getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB')).toBeTruthy();
    expect(
      ui.page().getByRole<HTMLButtonElement>('button', { name: 'Subir documento' }).disabled,
    ).toBe(true);
    expect(ui.api.upload).not.toHaveBeenCalled();
  });

  it('keeps the file for another try when the storage fails, with a toast', async () => {
    const ui = await setup();
    await ui.pick(pdf());
    ui.api.upload.mockReturnValueOnce(
      throwError(() => httpError(503, { code: 'FILE_STORAGE_UNAVAILABLE' })),
    );

    await ui.click(ui.page().getByRole('button', { name: 'Subir documento' }));

    expect(ui.toast()?.text).toBe('No se pudo acceder al archivo; inténtalo de nuevo más tarde.');
    expect(ui.page().getByText('Por subir')).toBeTruthy();
    expect(
      ui.page().getByRole<HTMLButtonElement>('button', { name: 'Subir documento' }).disabled,
    ).toBe(false);
  });

  it('puts the BFF refusing the file under it', async () => {
    const ui = await setup();
    await ui.pick(pdf());
    ui.api.upload.mockReturnValueOnce(
      throwError(() => httpError(400, { code: 'DOCUMENT_INVALID_FILE', field: 'file' })),
    );

    await ui.click(ui.page().getByRole('button', { name: 'Subir documento' }));

    expect(ui.page().getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB')).toBeTruthy();
  });

  it('says the limit and offers no more uploads when there are five', async () => {
    const five = Array.from({ length: 5 }, (_, n) => ({ ...DOCUMENT, id: `d${String(n)}` }));
    const ui = await setup('CONTRACT', { profile: of(profileOf({ documents: five })) });

    expect(ui.page().getByText('(5 de 5)')).toBeTruthy();
    expect(ui.page().getByText('Ya subiste el máximo de 5 documentos')).toBeTruthy();
    expect(ui.page().queryByText('Subir documento')).toBeNull();
  });

  it('opens a document with a fresh link in another tab', async () => {
    const ui = await setup();
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    await ui.click(ui.page().getByRole('button', { name: /Ver documento/ }));

    expect(ui.api.document).toHaveBeenCalledWith('d1');
    expect(open).toHaveBeenCalledWith('https://files.example/d1', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('says why a document does not open, and reloads the list when it is gone', async () => {
    const ui = await setup();
    ui.api.document.mockReturnValueOnce(
      throwError(() => httpError(503, { code: 'FILE_STORAGE_UNAVAILABLE' })),
    );
    await ui.click(ui.page().getByRole('button', { name: /Ver documento/ }));
    expect(ui.toast()?.text).toBe('No se pudo acceder al archivo; inténtalo de nuevo más tarde.');
    expect(ui.api.profile).toHaveBeenCalledTimes(1);

    ui.api.document.mockReturnValueOnce(throwError(() => httpError(404)));
    await ui.click(ui.page().getByRole('button', { name: /Ver documento/ }));

    expect(ui.toast()?.text).toBe('Ese documento ya no está disponible.');
    expect(ui.api.profile).toHaveBeenCalledTimes(2);
  });
});
