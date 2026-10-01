import { HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { LoginComponent } from './login.component';

const isLogin = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/login');
const WRONG_CREDENTIALS = {
  code: 'AUTH_INVALID_CREDENTIALS',
  message: 'Documento o contraseña incorrectos',
};

@Component({ selector: 'app-home-stub', template: '' })
class HomeStubComponent {}

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'home', component: HomeStubComponent }]),
      provideHttpClient(withInterceptors([credentialsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const fixture = TestBed.createComponent(LoginComponent);
  await fixture.whenStable();
  const ui = within(fixture.nativeElement as HTMLElement);
  const controller = TestBed.inject(HttpTestingController);
  const fill = async (label: string, value: string) => {
    fireEvent.input(ui.getByLabelText(label), { target: { value } });
    await fixture.whenStable();
  };
  const submit = async () => {
    fireEvent.click(ui.getByRole('button', { name: 'Ingresar' }));
    await fixture.whenStable();
  };
  const request = () => vi.waitFor(() => controller.expectOne(isLogin));
  const fillValid = async (password = 'secret-1') => {
    await fill('Número de documento', '12345678');
    await fill('Contraseña', password);
  };
  return { fixture, ui, controller, fill, fillValid, submit, request };
}

describe('LoginComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('shows a labelled document type, document number and password', async () => {
    const { ui } = await setup();

    expect(ui.getByLabelText('Tipo de documento')).toBeTruthy();
    expect(ui.getByLabelText('Número de documento')).toBeTruthy();
    expect(ui.getByLabelText<HTMLInputElement>('Contraseña').type).toBe('password');
  });

  it('offers DNI, CE and PASSPORT with DNI selected', async () => {
    const { ui } = await setup();
    const select = ui.getByLabelText<HTMLSelectElement>('Tipo de documento');

    expect(Array.from(select.options).map((option) => option.value)).toEqual([
      'DNI',
      'CE',
      'PASSPORT',
    ]);
    expect(select.value).toBe('DNI');
  });

  it('does not call the BFF and explains what is missing when the form is empty', async () => {
    const { ui, controller, submit } = await setup();

    await submit();

    controller.expectNone(isLogin);
    expect(ui.getByText('Ingresa tu número de documento')).toBeTruthy();
    expect(ui.getByText('Ingresa tu contraseña')).toBeTruthy();
  });

  it('ties each field error to its field for assistive technology', async () => {
    const { ui, submit } = await setup();

    await submit();

    const input = ui.getByLabelText('Número de documento');
    const error = ui.getByText('Ingresa tu número de documento');
    expect(error.getAttribute('role')).toBe('alert');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });

  it('sends the credentials and goes to /home on success', async () => {
    const { fillValid, submit, request } = await setup();
    await fillValid();

    await submit();

    const req = await request();
    expect(req.request.body).toEqual({
      documentType: 'DNI',
      documentNumber: '12345678',
      password: 'secret-1',
    });
    req.flush({ role: 'ADMIN', name: 'admin@example.test', mustChangePassword: false });
    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/home');
    });
  });

  it('sends the document type that was selected', async () => {
    const { ui, fillValid, submit, request, fixture } = await setup();
    const select = ui.getByLabelText('Tipo de documento');
    // A real <select> fires input and then change when the user picks an option.
    fireEvent.input(select, { target: { value: 'CE' } });
    fireEvent.change(select);
    await fixture.whenStable();
    await fillValid();

    await submit();

    const req = await request();
    expect((req.request.body as { documentType: string }).documentType).toBe('CE');
    req.flush({ role: 'GUEST', name: 'a', mustChangePassword: false });
  });

  it('disables the button while the request is in flight', async () => {
    const { ui, fillValid, submit, request, fixture } = await setup();
    await fillValid();

    await submit();

    const req = await request();
    const button = ui.getByRole<HTMLButtonElement>('button', { name: 'Ingresar' });
    await vi.waitFor(() => {
      expect(button.disabled).toBe(true);
    });
    req.flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });
    await fixture.whenStable();
  });

  it('shows the BFF message when the credentials are wrong and stays on the page', async () => {
    const { ui, fillValid, submit, request } = await setup();
    await fillValid('wrong-pass');

    await submit();

    (await request()).flush(WRONG_CREDENTIALS, { status: 401, statusText: 'Unauthorized' });
    const message = await ui.findByText('Documento o contraseña incorrectos');
    expect(message.getAttribute('role')).toBe('alert');
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('puts a VALIDATION_ERROR on the field the BFF names', async () => {
    const { ui, fillValid, submit, request } = await setup();
    await fillValid();

    await submit();

    (await request()).flush(
      { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos', field: 'documentNumber' },
      { status: 400, statusText: 'Bad Request' },
    );
    const message = await ui.findByText('Datos de entrada inválidos');
    expect(ui.getByLabelText('Número de documento').getAttribute('aria-describedby')).toBe(
      message.id,
    );
  });

  it('shows a VALIDATION_ERROR without a known field as a general error', async () => {
    const { ui, fillValid, submit, request } = await setup();
    await fillValid();

    await submit();

    (await request()).flush(
      { code: 'VALIDATION_ERROR', message: 'Datos de entrada inválidos' },
      { status: 400, statusText: 'Bad Request' },
    );
    expect((await ui.findByText('Datos de entrada inválidos')).getAttribute('role')).toBe('alert');
  });

  it('tells the user when the server cannot be reached', async () => {
    const { ui, fillValid, submit, request } = await setup();
    await fillValid();

    await submit();

    (await request()).error(new ProgressEvent('error'));
    expect(await ui.findByText(/No se pudo conectar con el servidor/)).toBeTruthy();
  });

  it('lets the user try again after a failure', async () => {
    const { ui, fill, fillValid, submit, request } = await setup();
    await fillValid('wrong-pass');
    await submit();
    (await request()).flush(WRONG_CREDENTIALS, { status: 401, statusText: 'Unauthorized' });
    await ui.findByText('Documento o contraseña incorrectos');

    await fill('Contraseña', 'secret-1');
    await submit();

    const retry = await request();
    expect((retry.request.body as { password: string }).password).toBe('secret-1');
    retry.flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });
  });
});
