import { HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { credentialsInterceptor } from '@core/http/credentials.interceptor';
import { ActivateAdminComponent } from './activate-admin.component';

const isReset = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/reset-password');
const CODE = 'abc-DEF_123';
const NAME = 'Carmen Rojas Huamán';
const VALID = 'Nueva12345';
const EXPIRED_TEXT =
  'Enlace inválido o expirado, solicita uno nuevo. Escribe el correo con el que te dieron de alta y te enviaremos otro.';

@Component({ selector: 'app-login-stub', template: '' })
class LoginStubComponent {}

async function setup(code: string | null = CODE) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'login', component: LoginStubComponent }]),
      provideHttpClient(withInterceptors([credentialsInterceptor])),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { queryParamMap: convertToParamMap(code === null ? {} : { code }) },
        },
      },
    ],
  });
  const controller = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ActivateAdminComponent);
  await fixture.whenStable();
  const ui = within(fixture.nativeElement as HTMLElement);
  const fill = async (name: string, password: string) => {
    fireEvent.input(ui.getByLabelText('Nombre completo'), { target: { value: name } });
    fireEvent.input(ui.getByLabelText('Contraseña'), { target: { value: password } });
    await fixture.whenStable();
  };
  const submit = async () => {
    fireEvent.click(ui.getByRole('button', { name: 'Activar mi cuenta' }));
    await fixture.whenStable();
  };
  const request = () => vi.waitFor(() => controller.expectOne(isReset));
  return { ui, controller, fill, submit, request };
}

describe('ActivateAdminComponent (A0.5, RF-22)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks for the name and a password when the link brought a code', async () => {
    const { ui } = await setup();

    expect(ui.getByRole('heading', { name: 'Activa tu cuenta de administrador' })).toBeTruthy();
    expect(ui.getByLabelText('Nombre completo')).toBeTruthy();
    expect(ui.getByLabelText('Contraseña')).toBeTruthy();
    expect(
      ui.getByText('Así te verán los demás administradores y quedará en lo que revises.'),
    ).toBeTruthy();
  });

  it('shows and hides the password with «Mostrar» / «Ocultar»', async () => {
    const { ui } = await setup();
    const field = ui.getByLabelText('Contraseña');

    fireEvent.click(ui.getByRole('button', { name: 'Mostrar' }));

    await vi.waitFor(() => {
      expect(field.getAttribute('type')).toBe('text');
    });
    expect(ui.getByRole('button', { name: 'Ocultar' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('explains that the link is not valid when it has no code, and offers a new one', async () => {
    const { ui } = await setup(null);

    expect(ui.getByRole('heading', { name: 'Enlace no válido' })).toBeTruthy();
    expect(ui.getByText(EXPIRED_TEXT)).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Pedir un enlace nuevo' }).getAttribute('href')).toBe(
      '/forgot-password',
    );
    expect(ui.queryByLabelText('Nombre completo')).toBeNull();
  });

  it('treats an empty code like a missing one', async () => {
    const { ui } = await setup('');

    expect(ui.getByText(EXPIRED_TEXT)).toBeTruthy();
  });

  it('asks for a name that is not only spaces and not longer than 100 characters', async () => {
    const { ui, controller, fill, submit } = await setup();

    await fill('   ', VALID);
    await submit();
    expect(ui.getByText('Escribe tu nombre completo')).toBeTruthy();
    expect(ui.getByLabelText('Nombre completo').getAttribute('aria-invalid')).toBe('true');

    await fill('a'.repeat(101), VALID);
    await submit();
    expect(ui.getByText('Máximo 100 caracteres')).toBeTruthy();

    await fill('Rosa	Quispe', VALID);
    await submit();
    expect(ui.getByText('El nombre no admite saltos de línea ni tabulaciones')).toBeTruthy();

    controller.expectNone(isReset);
  });

  it('applies the rules of a new password before calling the BFF', async () => {
    const { ui, controller, fill, submit } = await setup();

    await fill(NAME, 'corta12');
    await submit();
    expect(ui.getByText('Mínimo 8 caracteres')).toBeTruthy();

    controller.expectNone(isReset);
  });

  it('sends the code, the password and the trimmed name, then goes to the login', async () => {
    const { fill, submit, request } = await setup();
    await fill(`  ${NAME}  `, VALID);

    await submit();
    const req = await request();
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: CODE, newPassword: VALID, name: NAME });
    req.flush(null, { status: 204, statusText: 'No Content' });

    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/login?updated=1');
    });
  });

  it('shows a missing name from the server under the field and lets the person retry', async () => {
    const { ui, controller, fill, submit, request } = await setup();
    await fill(NAME, VALID);
    await submit();

    (await request()).flush(
      { code: 'VALIDATION_ERROR', message: 'x', field: 'name' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText('Escribe tu nombre completo')).toBeTruthy();
    expect(ui.getByLabelText('Nombre completo').getAttribute('aria-invalid')).toBe('true');
    expect(ui.queryByRole('link', { name: 'Pedir un enlace nuevo' })).toBeNull();

    // The code was not used up: the same one goes again.
    await fill('Carmen Rojas', VALID);
    await submit();
    const retry = await vi.waitFor(() => controller.expectOne(isReset));
    expect(retry.request.body).toEqual({ code: CODE, newPassword: VALID, name: 'Carmen Rojas' });
    retry.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('shows a weak-password error under the field and keeps the form', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(NAME, VALID);
    await submit();

    (await request()).flush(
      { code: 'AUTH_WEAK_PASSWORD', message: 'x', field: 'newPassword' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText('Mínimo 8 caracteres')).toBeTruthy();
    expect(ui.getByLabelText('Contraseña').getAttribute('aria-invalid')).toBe('true');
  });

  it('says the link expired and offers a new one when the code cannot be used', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(NAME, VALID);
    await submit();

    (await request()).flush(
      { code: 'AUTH_INVALID_OR_EXPIRED_CODE', message: 'x' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText(EXPIRED_TEXT)).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Pedir un enlace nuevo' })).toBeTruthy();
    expect(ui.queryByLabelText('Nombre completo')).toBeNull();
  });

  it('shows a general error when the server cannot be reached', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(NAME, VALID);
    await submit();

    (await request()).error(new ProgressEvent('error'));

    expect(
      await ui.findByText('No se pudo conectar con el servidor. Inténtalo de nuevo.'),
    ).toBeTruthy();
    expect(ui.getByLabelText('Nombre completo')).toBeTruthy();
  });
});
