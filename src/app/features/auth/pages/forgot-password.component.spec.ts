import { HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { ForgotPasswordComponent } from './forgot-password.component';

const isForgot = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/forgot-password');

async function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(withInterceptors([credentialsInterceptor])),
      provideHttpClientTesting(),
    ],
  });
  const controller = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ForgotPasswordComponent);
  await fixture.whenStable();
  const ui = within(fixture.nativeElement as HTMLElement);
  const fill = async (value: string) => {
    fireEvent.input(ui.getByLabelText('Correo'), { target: { value } });
    await fixture.whenStable();
  };
  const submit = async () => {
    fireEvent.click(ui.getByRole('button', { name: 'Enviar enlace' }));
    await fixture.whenStable();
  };
  const request = () => vi.waitFor(() => controller.expectOne(isForgot));
  return { ui, controller, fill, submit, request };
}

describe('ForgotPasswordComponent (A0.2, RF-16)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks for the email and offers the way back to the login', async () => {
    const { ui } = await setup();

    expect(ui.getByRole('heading', { name: 'Recuperar contraseña' })).toBeTruthy();
    expect(ui.getByLabelText('Correo')).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Volver a iniciar sesión' }).getAttribute('href')).toBe(
      '/login',
    );
  });

  it('asks for an email without calling the BFF when the field is empty', async () => {
    const { ui, controller, submit } = await setup();

    await submit();

    expect(ui.getByText('Ingresa tu correo')).toBeTruthy();
    controller.expectNone(isForgot);
  });

  it('rejects something that is not an email before calling the BFF', async () => {
    const { ui, controller, fill, submit } = await setup();
    await fill('no-es-un-correo');

    await submit();

    expect(ui.getByText('Ingresa un correo válido')).toBeTruthy();
    controller.expectNone(isForgot);
  });

  it('sends the trimmed email and then says the same thing for any account', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill('  huesped@example.test ');

    await submit();
    const req = await request();
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'huesped@example.test' });
    req.flush(null, { status: 202, statusText: 'Accepted' });

    expect(await ui.findByText(/Si el correo está registrado/)).toBeTruthy();
    expect(ui.queryByLabelText('Correo')).toBeNull();
    expect(ui.getByRole('link', { name: 'Volver a iniciar sesión' })).toBeTruthy();
  });

  it('tells the user to wait when the server rate-limits the request', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill('huesped@example.test');
    await submit();

    (await request()).flush(
      { code: 'RATE_LIMITED', message: 'x' },
      { status: 429, statusText: 'Too Many Requests' },
    );

    expect(
      await ui.findByText('Demasiados intentos, espera un momento antes de volver a intentar'),
    ).toBeTruthy();
    expect(ui.queryByText(/Si el correo está registrado/)).toBeNull();
  });

  it('shows a server validation error under the email field', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill('huesped@example.test');
    await submit();

    (await request()).flush(
      { code: 'VALIDATION_ERROR', message: 'x', field: 'email' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText('Revisa el correo')).toBeTruthy();
    expect(ui.getByLabelText('Correo').getAttribute('aria-invalid')).toBe('true');
  });

  it('shows a general error when the server cannot be reached', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill('huesped@example.test');
    await submit();

    (await request()).error(new ProgressEvent('error'));

    expect(
      await ui.findByText('No se pudo conectar con el servidor. Inténtalo de nuevo.'),
    ).toBeTruthy();
  });
});
