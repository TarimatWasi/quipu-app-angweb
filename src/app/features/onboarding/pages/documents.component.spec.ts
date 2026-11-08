import { fireEvent, screen } from '@testing-library/dom';
import { of, throwError } from 'rxjs';
import { OnboardingDocumentsComponent } from './documents.component';
import {
  document,
  fakeApi,
  httpError,
  openStep,
  toConsent,
  toDocuments,
} from './onboarding.testing';

const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();
const pdf = (name: string) => new File(['bytes'], name, { type: 'application/pdf' });

async function setup(api = fakeApi(toDocuments)) {
  const opened = await openStep(OnboardingDocumentsComponent, 'documents', api);
  const choose = async (...files: File[]) => {
    for (const file of files) {
      fireEvent.change(screen.getByLabelText('Archivo del documento'), {
        target: { files: [file] },
      });
      await opened.settle();
    }
  };
  const press = async (name: RegExp | string) => {
    fireEvent.click(screen.getByRole('button', { name }));
    await opened.settle();
  };
  return { ...opened, api, choose, press };
}

describe('O2 «Tus documentos»', () => {
  it('is optional: without files it continues without documents and goes to the consent', async () => {
    const { api, press, router } = await setup();

    expect(screen.getByText('Tu registro · paso 3 de 4')).toBeTruthy();
    await press('Continuar sin documentos');

    expect(api.uploadDocument).not.toHaveBeenCalled();
    expect(api.finishDocuments).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/onboarding/consent');
  });

  it('lists what it chose as «Por subir», counts it, and «Quitar» takes it away', async () => {
    const { choose, press, settle } = await setup();

    await choose(pdf('dni-anverso.pdf'), pdf('dni-reverso.pdf'));

    expect(screen.getByText('(2 de 5)')).toBeTruthy();
    expect(screen.getByText('Por subir')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Subir y continuar' })).toBeTruthy();
    expect(screen.getByText('Puedes agregar 3 más.')).toBeTruthy();
    const [firstRemove] = screen.getAllByRole('button', { name: /^Quitar/ });
    if (firstRemove) fireEvent.click(firstRemove);
    await settle();
    expect(screen.queryByText('dni-anverso.pdf')).toBeNull();
    expect(screen.getByText('(1 de 5)')).toBeTruthy();
    await press(/Omitir este paso/);
  });

  it('uploads each file, one per call, and then finishes the step', async () => {
    const { api, choose, press, router } = await setup();

    await choose(pdf('a.pdf'), pdf('b.pdf'));
    await press('Subir y continuar');

    expect(api.uploadDocument.mock.calls.map(([file]) => file.name)).toEqual(['a.pdf', 'b.pdf']);
    expect(api.finishDocuments).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/onboarding/consent');
  });

  it('marks the file the BFF refuses, keeps the ones it took and does not finish', async () => {
    const api = fakeApi(toDocuments);
    api.uploadDocument.mockImplementation((file) =>
      file.name === 'b.pdf'
        ? throwError(() => httpError(400, { code: 'DOCUMENT_INVALID_FILE', message: 'x' }))
        : of(document(file.name, file.name)),
    );
    const { choose, press, router } = await setup(api);

    await choose(pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf'));
    await press('Subir y continuar');

    expect(api.uploadDocument).toHaveBeenCalledTimes(3);
    expect(api.finishDocuments).not.toHaveBeenCalled();
    expect(router.url).toBe('/onboarding/documents');
    expect(screen.getByText('Ya subidos')).toBeTruthy();
    expect(screen.getAllByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB')).toHaveLength(
      1,
    );
    expect(screen.getByText('(3 de 5)')).toBeTruthy();
  });

  it('refuses a file that is not JPG, PNG or PDF before sending it', async () => {
    const { api, choose, press } = await setup();

    await choose(new File(['x'], 'foto.heic', { type: 'image/heic' }));

    expect(screen.getByText('Archivo inválido — sube JPG, PNG o PDF de máx. 5MB')).toBeTruthy();
    await press('Subir y continuar');
    expect(api.uploadDocument).not.toHaveBeenCalled();
    expect(api.finishDocuments).not.toHaveBeenCalled();
  });

  it('stops and says it when there are too many attempts', async () => {
    const api = fakeApi(toDocuments);
    api.uploadDocument.mockReturnValue(
      throwError(() => httpError(429, { code: 'RATE_LIMITED', message: 'x' })),
    );
    const { choose, press } = await setup(api);

    await choose(pdf('a.pdf'), pdf('b.pdf'));
    await press('Subir y continuar');

    expect(api.uploadDocument).toHaveBeenCalledTimes(1);
    expect(text(screen.getByRole('alert'))).toContain('Demasiados intentos');
    expect(api.finishDocuments).not.toHaveBeenCalled();
  });

  it('resumes with what is already uploaded and offers «Continuar»', async () => {
    const api = fakeApi({
      ...toDocuments,
      documents: [document('d1', 'dni-anverso.jpg'), document('d2', 'dni-reverso.jpg')],
    });
    const { press } = await setup(api);

    expect(screen.getByText('Ya subidos')).toBeTruthy();
    expect(screen.getByText('dni-anverso.jpg')).toBeTruthy();
    expect(screen.getByText('(2 de 5)')).toBeTruthy();
    expect(screen.queryByText(/Omitir este paso/)).toBeNull();
    await press('Continuar');
    expect(api.finishDocuments).toHaveBeenCalled();
  });

  it('closes the choice at five documents and still lets it continue', async () => {
    const api = fakeApi({
      ...toDocuments,
      documents: ['1', '2', '3', '4', '5'].map((id) => document(id, `d${id}.jpg`)),
    });
    await setup(api);

    expect(screen.getByText('Ya subiste el máximo de 5 documentos')).toBeTruthy();
    expect(screen.queryByLabelText('Archivo del documento')).toBeNull();
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeTruthy();
  });

  it('skips the step without sending what it chose', async () => {
    const { api, choose, press, router } = await setup();

    await choose(pdf('a.pdf'));
    await press('Omitir este paso');

    expect(api.uploadDocument).not.toHaveBeenCalled();
    expect(api.finishDocuments).toHaveBeenCalledTimes(1);
    expect(router.url).toBe('/onboarding/consent');
  });

  it('says that the registration is already complete when the step answers it', async () => {
    const api = fakeApi(toDocuments);
    api.finishDocuments.mockReturnValue(
      throwError(() => httpError(409, { code: 'ONBOARDING_ALREADY_COMPLETED', message: 'x' })),
    );
    const { press } = await setup(api);

    await press('Continuar sin documentos');

    expect(screen.getByText(/Si te faltó subir un documento/)).toBeTruthy();
  });

  it('goes to the consent page the BFF names after finishing', async () => {
    const api = fakeApi(toDocuments);
    api.finishDocuments.mockReturnValue(of(toConsent));
    const { press, router } = await setup(api);

    await press('Continuar sin documentos');

    expect(router.url).toBe('/onboarding/consent');
  });
});
