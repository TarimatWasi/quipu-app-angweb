import { fireEvent, screen } from '@testing-library/dom';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { OnboardingPersonalDataComponent } from './personal-data.component';
import type { OnboardingState } from '../data/onboarding.service';
import {
  completed,
  fakeApi,
  httpError,
  openStep,
  toDocuments,
  toPersonalData,
} from './onboarding.testing';

const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();

async function setup(api = fakeApi(toPersonalData)) {
  const opened = await openStep(OnboardingPersonalDataComponent, 'personal-data', api);
  const field = (name: string) => screen.getByLabelText<HTMLInputElement>(name);
  const type = async (name: string, value: string) => {
    fireEvent.input(field(name), { target: { value } });
    await opened.settle();
  };
  const submit = async () => {
    fireEvent.click(screen.getByRole('button', { name: /Guardar y continuar/ }));
    await opened.settle();
  };
  return { ...opened, api, field, type, submit };
}

describe('O1 «Tus datos»', () => {
  it('shows the frame of the registration with the step marked as «Ahora»', async () => {
    await setup();

    expect(screen.getByText('Tu registro · paso 2 de 4')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: 'Tus datos' })).toBeTruthy();
    // The row of bars of a phone is hidden here, so the list beside the step is the only one.
    const items = screen.getByRole('list', { name: 'Pasos de tu registro' }).querySelectorAll('li');
    expect([...items].map(text)).toEqual([
      'Contraseña: Hecho',
      'Tus datos: Ahora',
      'Documentos: Falta · opcional',
      'Consentimiento: Falta',
    ]);
  });

  it('tells under the emergency contact that it can be left empty', async () => {
    await setup();

    expect(screen.getByText('Puedes dejarlo vacío y agregarlo después en Mis datos.')).toBeTruthy();
  });

  it('keeps the frame while it loads and only the fields are a skeleton', async () => {
    const api = fakeApi(toPersonalData);
    api.state.mockReturnValue(NEVER);

    await setup(api);

    expect(screen.getByRole('heading', { level: 1, name: 'Tus datos' })).toBeTruthy();
    expect(screen.getByLabelText('Cargando tu registro')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Guardar y continuar/ })).toBeNull();
  });

  it('says that it could not load and asks again on «Reintentar»', async () => {
    const api = fakeApi(toPersonalData);
    api.state.mockReturnValueOnce(throwError(() => httpError(500)));
    const { settle } = await setup(api);

    expect(screen.getByText('No se pudo cargar tu registro.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await settle();

    expect(api.state).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('button', { name: /Guardar y continuar/ })).toBeTruthy();
  });

  it('does not send without name and phone, and says what is missing', async () => {
    const { api, submit } = await setup();

    await submit();

    expect(api.savePersonalData).not.toHaveBeenCalled();
    expect(screen.getByText('Escribe tu nombre completo.')).toBeTruthy();
    expect(screen.getByText('Revisa el teléfono.')).toBeTruthy();
  });

  it('sends the data trimmed, without what was left empty, and goes to the documents', async () => {
    const { api, type, submit, router, auth } = await setup();

    await type('Nombre completo', '  Sonia Ccama Flores ');
    await type('Teléfono', ' 984 112 730 ');
    await submit();

    expect(api.savePersonalData).toHaveBeenCalledWith({
      name: 'Sonia Ccama Flores',
      phone: '984 112 730',
    });
    expect(router.url).toBe('/onboarding/documents');
    expect(auth.onboardingAdvanced).toHaveBeenCalledWith('DOCUMENTS', 'Sonia Ccama Flores');
  });

  it('puts an email already taken under its field', async () => {
    const api = fakeApi(toPersonalData);
    api.savePersonalData.mockReturnValue(
      throwError(() => httpError(409, { code: 'GUEST_EMAIL_TAKEN', message: 'x' })),
    );
    const { type, submit, router } = await setup(api);

    await type('Nombre completo', 'Sonia');
    await type('Teléfono', '984 112 730');
    await type('Correo (opcional)', 'ana@correo.pe');
    await submit();

    expect(screen.getByText('Ese correo ya está registrado para otro huésped')).toBeTruthy();
    expect(router.url).toBe('/onboarding/personal-data');
  });

  it('says that the registration is already complete and goes home', async () => {
    const api = fakeApi(toPersonalData);
    api.savePersonalData.mockReturnValue(
      throwError(() => httpError(409, { code: 'ONBOARDING_ALREADY_COMPLETED', message: 'x' })),
    );
    const { type, submit, settle, router } = await setup(api);
    await type('Nombre completo', 'Sonia');
    await type('Teléfono', '984 112 730');

    await submit();

    expect(screen.getByRole('alertdialog', { name: 'Tu registro ya está completo' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ir a mi cuenta' }));
    await vi.waitFor(() => {
      expect(router.url).toBe('/home');
    });
    await settle();
  });

  it('goes to the step that comes first when the BFF says it is another one', async () => {
    const { router } = await setup(fakeApi(toDocuments));

    expect(router.url).toBe('/onboarding/documents');
  });

  it('ignores the late answer of a page the guest already left', async () => {
    const api = fakeApi(toPersonalData);
    const reading = new Subject<OnboardingState>();
    api.state.mockReturnValue(reading);
    const { router, settle } = await setup(api);

    await router.navigateByUrl('/home');
    reading.next(toDocuments);
    reading.complete();
    await settle();

    expect(router.url).toBe('/home');
  });

  it('goes home when there is nothing left to do', async () => {
    const api = fakeApi(toPersonalData);
    api.state.mockReturnValue(of(completed));

    const { router } = await setup(api);

    expect(router.url).toBe('/home');
  });
});
