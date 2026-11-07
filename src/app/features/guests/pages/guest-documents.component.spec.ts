import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, within } from '@testing-library/dom';
import { Observable, of, throwError } from 'rxjs';
import { AdminGuestDocumentsService } from '@core/api/clients/admin-guest-documents.service';
import type {
  DocumentActionRequest,
  GuestDocument,
  GuestDocumentAction,
} from '@core/api/clients/admin-guest-documents.service';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import type { GuestDetail } from '@core/api/clients/admin-guests.service';
import { ToastService } from '@shared/ui/toast/toast.service';
import { GuestDocumentsComponent } from './guest-documents.component';
import { guestOf, httpError, settle, squash, words } from './guest-detail.testing';

const IN_AN_HOUR = new Date(Date.now() + 60 * 60 * 1000).toISOString();

function documentOf(fields: Partial<GuestDocument> = {}): GuestDocument {
  return {
    id: 'd1',
    originalName: 'dni-luis.jpg',
    contentType: 'image/jpeg',
    sizeBytes: 1_258_291,
    uploadedAt: '2026-03-02T15:00:00Z',
    url: 'https://files.example/d1',
    urlExpiresAt: IN_AN_HOUR,
    ...fields,
  };
}

const DOCUMENTS = [
  documentOf(),
  documentOf({
    id: 'd2',
    originalName: 'recibo-de-luz.pdf',
    contentType: 'application/pdf',
    sizeBytes: 317_440,
  }),
];

const ACTION: GuestDocumentAction = {
  id: 'a1',
  action: 'REPLACE',
  documentId: 'd0',
  replacementDocumentId: 'd1',
  reason: 'UPLOAD_ERROR',
  requestedAt: null,
  requestChannel: null,
  note: null,
  contentType: 'image/jpeg',
  sizeBytes: 4_718_592,
  actorId: 'x1',
  actorName: 'Rosa Quispe',
  performedAt: '2026-10-20T15:00:00Z',
};

interface Answers {
  guest?: Observable<GuestDetail>;
  documents?: Observable<GuestDocument[]>;
  actions?: GuestDocumentAction[];
}

async function setup(answers: Answers = {}) {
  const guests = {
    get: vi.fn<(id: string) => Observable<GuestDetail>>(() => answers.guest ?? of(guestOf())),
  };
  const documents = {
    list: vi.fn<(id: string) => Observable<GuestDocument[]>>(
      () => answers.documents ?? of(DOCUMENTS),
    ),
    allActions: vi.fn<(id: string) => Observable<GuestDocumentAction[]>>(() =>
      of(answers.actions ?? [ACTION]),
    ),
    delete: vi.fn<
      (id: string, documentId: string, request: DocumentActionRequest) => Observable<null>
    >(() => of(null)),
    replace: vi.fn<
      (
        id: string,
        documentId: string,
        file: File,
        request: DocumentActionRequest,
      ) => Observable<GuestDocument>
    >(() => of(documentOf({ id: 'd9', originalName: 'nuevo.png' }))),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/guests', children: [] },
        { path: 'admin/guests/:id', children: [] },
        { path: 'admin/guests/:id/documents', component: GuestDocumentsComponent },
      ]),
      { provide: AdminGuestsService, useValue: guests },
      { provide: AdminGuestDocumentsService, useValue: documents },
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
    ],
  });
  const harness = await RouterTestingHarness.create();
  await TestBed.inject(Router).navigateByUrl('/admin/guests/g1/documents');
  await settle(harness);
  const page = () => within(harness.routeNativeElement ?? document.body);
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle(harness);
  };
  const dialogElement = () => document.body.querySelector<HTMLElement>('mat-dialog-container');
  const dialog = () => {
    const element = dialogElement();
    if (element === null) throw new Error('no dialog is open');
    return within(element);
  };
  const type = async (element: HTMLElement, value: string) => {
    fireEvent.input(element, { target: { value } });
    await settle(harness);
  };
  const pick = async (file: File) => {
    const input = dialogElement()?.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error('the dialog has no file field');
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    fireEvent.change(input);
    await settle(harness);
  };
  const toast = () => TestBed.inject(ToastService).current()?.text ?? '';
  return { harness, guests, documents, page, click, dialog, dialogElement, type, pick, toast };
}

type Ui = Awaited<ReturnType<typeof setup>>;

const png = (name = 'nuevo.png') => new File(['x'], name, { type: 'image/png' });

describe('GuestDocumentsComponent (A3.8)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('shows the documents, the evidence and who they belong to', async () => {
    const ui = await setup();

    expect(ui.guests.get).toHaveBeenCalledWith('g1');
    expect(ui.page().getByRole('heading', { level: 1 }).textContent).toBe('Documentos');
    const back = ui.page().getByRole('link', { name: /Volver a Luis Huamán/ });
    expect(back.getAttribute('href')).toBe('/admin/guests/g1');
    const documents = within(
      present(ui.page().getByRole('region', { name: 'Sus documentos' }).querySelector('ul')),
    );
    expect(
      documents.getAllByRole('listitem').map((li) => words(present(li.querySelector('.what')))),
    ).toEqual([
      'dni-luis.jpg Imagen JPG · 1.2 MB · subido el 2 mar 2026',
      'recibo-de-luz.pdf PDF · 310 KB · subido el 2 mar 2026',
    ]);
    expect(documents.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      'https://files.example/d1',
      'https://files.example/d2'.replace('d2', 'd1'),
    ]);
    const history = ui.page().getByRole('region', { name: 'Borrados y reemplazos' });
    expect(squash(history.textContent)).toContain('Reemplazado · error de carga');
    expect(squash(history.textContent)).toContain(
      'JPG, 4.5 MB. Error de carga. Lo hizo Rosa Quispe.',
    );
    const tiles = [
      ...ui
        .page()
        .getByRole('complementary', { name: 'De quién son' })
        .querySelectorAll('app-fact-tile'),
    ].map((tile) => [
      squash(tile.querySelector('dt')?.textContent),
      squash(tile.querySelector('dd')?.textContent),
    ]);
    expect(tiles).toEqual([
      ['Huésped', 'Luis Huamán'],
      ['Documento', 'DNI 70412233'],
      ['Archivos', '2 de 5'],
    ]);
  });

  it('says there are no documents and no evidence instead of showing empty lists', async () => {
    const ui = await setup({ documents: of([]), actions: [] });

    expect(ui.page().getByText('El huésped no subió documentos.')).toBeTruthy();
    expect(ui.page().getByText('Era un paso opcional de su registro.')).toBeTruthy();
    expect(ui.page().getByText('Ningún documento se borró ni se reemplazó.')).toBeTruthy();
    expect(ui.page().queryByRole('button', { name: /Borrar/ })).toBeNull();
  });

  it('keeps the title and offers «Reintentar» when the documents do not load', async () => {
    const ui = await setup({ documents: throwError(() => httpError(500)) });

    expect(ui.page().getByText('No se pudieron cargar los documentos.')).toBeTruthy();
    expect(ui.page().getByRole('heading', { level: 1 }).textContent).toBe('Documentos');
    ui.documents.list.mockReturnValue(of(DOCUMENTS));
    await ui.click(ui.page().getByRole('button', { name: 'Reintentar' }));

    expect(ui.page().queryByText('No se pudieron cargar los documentos.')).toBeNull();
    expect(ui.page().getByText('dni-luis.jpg', { selector: 'strong' })).toBeTruthy();
  });

  it('says the guest is not there on a 404, with the way back to the list', async () => {
    const ui = await setup({ guest: throwError(() => httpError(404)) });

    expect(ui.page().getByText('No encontramos a este huésped.')).toBeTruthy();
    expect(ui.page().getByRole('link', { name: 'Volver a Huéspedes' }).getAttribute('href')).toBe(
      '/admin/guests',
    );
  });

  it('asks for a new link instead of following one that already expired', async () => {
    const ui = await setup({
      documents: of([documentOf({ urlExpiresAt: '2020-01-01T00:00:00Z' })]),
    });
    const link = ui.page().getByRole('link', { name: /Abrir/ });
    ui.documents.list.mockReturnValue(of([documentOf({ url: 'https://files.example/nuevo' })]));

    const followed = fireEvent.click(link);
    await settle(ui.harness);

    expect(followed).toBe(false);
    expect(ui.toast()).toBe('El enlace venció: ya hay uno nuevo, pulsa «Abrir» otra vez.');
    expect(ui.page().getByRole('link', { name: /Abrir/ }).getAttribute('href')).toBe(
      'https://files.example/nuevo',
    );
  });

  it('lets a valid link open as it is, in another tab and without a referrer', async () => {
    const ui = await setup();
    const link = ui.page().getAllByRole('link', { name: /Abrir/ })[0];

    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(ui.documents.list).toHaveBeenCalledTimes(1);
  });
});

describe('GuestDocumentsComponent: delete (A3.8, CU-29)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  const openDelete = async (ui: Ui) => {
    await ui.click(present(ui.page().getAllByRole('button', { name: /^Borrar/ })[0]));
  };

  it('asks for the reason before anything and does not call the BFF without it', async () => {
    const ui = await setup();
    await openDelete(ui);

    expect(ui.dialog().getByRole('heading', { name: '¿Borrar dni-luis.jpg?' })).toBeTruthy();
    expect(ui.dialog().getByText(/Se borra para siempre/)).toBeTruthy();
    expect(ui.dialog().queryByLabelText('Fecha en que lo pidió')).toBeNull();
    await ui.click(ui.dialog().getByRole('button', { name: 'Borrar documento' }));

    expect(ui.dialog().getByText('Elige el motivo.')).toBeTruthy();
    expect(ui.documents.delete).not.toHaveBeenCalled();
  });

  it('deletes for an upload error with only the reason, tells it and reloads', async () => {
    const ui = await setup();
    await openDelete(ui);

    await ui.click(ui.dialog().getByRole('button', { name: 'Error de carga' }));
    ui.documents.list.mockReturnValue(of([present(DOCUMENTS[1])]));
    await ui.click(ui.dialog().getByRole('button', { name: 'Borrar documento' }));

    expect(ui.documents.delete).toHaveBeenCalledWith('g1', 'd1', { reason: 'UPLOAD_ERROR' });
    expect(ui.dialogElement()).toBeNull();
    expect(ui.toast()).toBe('Documento borrado.');
    expect(ui.page().queryByText('dni-luis.jpg', { selector: 'strong' })).toBeNull();
    expect(ui.page().getByText('recibo-de-luz.pdf', { selector: 'strong' })).toBeTruthy();
  });

  it('asks the day and the channel of an ARCO request and sends them with the note', async () => {
    const ui = await setup();
    await openDelete(ui);

    await ui.click(ui.dialog().getByRole('button', { name: 'Lo pidió el titular (ARCO)' }));
    await ui.click(ui.dialog().getByRole('button', { name: 'Borrar documento' }));
    expect(ui.dialog().getByText('Elige la fecha en que lo pidió.')).toBeTruthy();
    expect(ui.dialog().getByText('Elige por dónde lo pidió.')).toBeTruthy();
    expect(ui.documents.delete).not.toHaveBeenCalled();

    await ui.type(ui.dialog().getByLabelText('Fecha en que lo pidió'), '2999-01-01');
    expect(ui.dialog().getByText('La fecha no puede ser futura.')).toBeTruthy();
    await ui.type(ui.dialog().getByLabelText('Fecha en que lo pidió'), '2026-10-27');
    await ui.click(ui.dialog().getByRole('button', { name: 'WhatsApp' }));
    await ui.type(ui.dialog().getByLabelText(/Nota/), '  Mensaje del 27 oct ');
    await ui.click(ui.dialog().getByRole('button', { name: 'Borrar documento' }));

    expect(ui.documents.delete).toHaveBeenCalledWith('g1', 'd1', {
      reason: 'ARCO_REQUEST',
      requestedAt: '2026-10-27',
      requestChannel: 'WHATSAPP',
      note: 'Mensaje del 27 oct',
    });
  });

  it('stays open with the answer above the buttons when the BFF is busy or the storage is down', async () => {
    const ui = await setup();
    await openDelete(ui);
    await ui.click(ui.dialog().getByRole('button', { name: 'Error de carga' }));

    ui.documents.delete.mockReturnValueOnce(
      throwError(() => httpError(429, { code: 'RATE_LIMITED' })),
    );
    await ui.click(ui.dialog().getByRole('button', { name: 'Borrar documento' }));
    expect(ui.dialog().getByRole('alert').textContent).toContain('Demasiados intentos');
    ui.documents.delete.mockReturnValueOnce(
      throwError(() => httpError(503, { code: 'FILE_STORAGE_UNAVAILABLE' })),
    );
    await ui.click(ui.dialog().getByRole('button', { name: 'Borrar documento' }));
    expect(ui.dialog().getByRole('alert').textContent).toContain('No se pudo acceder al archivo');

    await ui.click(ui.dialog().getByRole('button', { name: 'Borrar documento' }));
    expect(ui.dialogElement()).toBeNull();
    expect(ui.toast()).toBe('Documento borrado.');
  });

  it('puts what the BFF refuses of a field under it and clears it when the field changes', async () => {
    const ui = await setup();
    await openDelete(ui);
    await ui.click(ui.dialog().getByRole('button', { name: 'Error de carga' }));
    ui.documents.delete.mockReturnValueOnce(
      throwError(() => httpError(400, { code: 'VALIDATION_ERROR', field: 'note' })),
    );

    await ui.click(ui.dialog().getByRole('button', { name: 'Borrar documento' }));
    expect(ui.dialog().getByText('La nota admite hasta 500 caracteres.')).toBeTruthy();
    await ui.type(ui.dialog().getByLabelText(/Nota/), 'otra');

    expect(ui.dialog().queryByText('La nota admite hasta 500 caracteres.')).toBeNull();
  });

  it('closes on «Cancelar» without calling anything', async () => {
    const ui = await setup();
    await openDelete(ui);

    await ui.click(ui.dialog().getByRole('button', { name: 'Cancelar' }));

    expect(ui.dialogElement()).toBeNull();
    expect(ui.documents.delete).not.toHaveBeenCalled();
    expect(ui.toast()).toBe('');
  });
});

describe('GuestDocumentsComponent: replace (A3.8, CU-29)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  const openReplace = async (ui: Ui) => {
    await ui.click(present(ui.page().getAllByRole('button', { name: /^Reemplazar/ })[0]));
  };

  it('asks for the new file and the reason, and says what is missing', async () => {
    const ui = await setup();
    await openReplace(ui);

    expect(ui.dialog().getByRole('heading', { name: 'Reemplazar dni-luis.jpg' })).toBeTruthy();
    await ui.click(ui.dialog().getByRole('button', { name: 'Reemplazar documento' }));

    expect(
      ui
        .dialog()
        .getByText('Elige el archivo que lo reemplaza.', { selector: '.quipu-field-error' }),
    ).toBeTruthy();
    expect(ui.dialog().getByText('Elige el motivo.')).toBeTruthy();
    expect(ui.documents.replace).not.toHaveBeenCalled();
  });

  it('refuses a file that is not JPG, PNG or PDF of 5 MB at most, and takes a good one after it', async () => {
    const ui = await setup();
    await openReplace(ui);

    await ui.pick(new File(['x'], 'nota.txt', { type: 'text/plain' }));
    expect(
      ui.dialog().getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB'),
    ).toBeTruthy();
    await ui.pick(png());

    expect(
      ui.dialog().queryByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB'),
    ).toBeNull();
    expect(ui.dialog().getByText('nuevo.png')).toBeTruthy();
  });

  it('goes back to asking for the file when the chosen one is removed', async () => {
    const ui = await setup();
    await openReplace(ui);
    await ui.pick(png());

    await ui.click(ui.dialog().getByRole('button', { name: /^Quitar/ }));

    expect(ui.dialog().queryByText('nuevo.png')).toBeNull();
    expect(ui.dialog().getByText('Elige el archivo que lo reemplaza.')).toBeTruthy();
  });

  it('replaces with the new file and the reason, tells it and reloads', async () => {
    const ui = await setup();
    await openReplace(ui);

    const file = png();
    await ui.pick(file);
    await ui.click(ui.dialog().getByRole('button', { name: 'Error de carga' }));
    ui.documents.list.mockReturnValue(
      of([documentOf({ id: 'd9', originalName: 'nuevo.png' }), present(DOCUMENTS[1])]),
    );
    await ui.click(ui.dialog().getByRole('button', { name: 'Reemplazar documento' }));

    expect(ui.documents.replace).toHaveBeenCalledWith('g1', 'd1', file, { reason: 'UPLOAD_ERROR' });
    expect(ui.dialogElement()).toBeNull();
    expect(ui.toast()).toBe('Documento reemplazado.');
    expect(ui.page().getByText('nuevo.png', { selector: 'strong' })).toBeTruthy();
  });

  it('puts a file the BFF refuses in the file zone, not above the buttons', async () => {
    const ui = await setup();
    await openReplace(ui);
    await ui.pick(png());
    await ui.click(ui.dialog().getByRole('button', { name: 'Error de carga' }));
    ui.documents.replace.mockReturnValueOnce(
      throwError(() => httpError(400, { code: 'DOCUMENT_INVALID_FILE', field: 'file' })),
    );

    await ui.click(ui.dialog().getByRole('button', { name: 'Reemplazar documento' }));

    expect(
      ui.dialog().getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB'),
    ).toBeTruthy();
    expect(ui.dialog().queryByRole('alert')).toBeNull();
    expect(ui.dialogElement()).not.toBeNull();
  });
});

function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('expected a value');
  return value;
}
