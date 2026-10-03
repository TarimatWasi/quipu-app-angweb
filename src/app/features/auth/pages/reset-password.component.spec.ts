import { HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { ResetPasswordComponent } from './reset-password.component';

const isReset = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/reset-password');
const CODE = 'abc-DEF_123';
const VALID = 'Nueva12345';

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
  const fixture = TestBed.createComponent(ResetPasswordComponent);
  await fixture.whenStable();
  const ui = within(fixture.nativeElement as HTMLElement);
  const fill = async (value: string) => {
    fireEvent.input(ui.getByLabelText('Nueva contraseña'), { target: { value } });
    await fixture.whenStable();
  };
  const submit = async () => {
    fireEvent.click(ui.getByRole('button', { name: 'Guardar contraseña' }));
    await fixture.whenStable();
  };
  const request = () => vi.waitFor(() => controller.expectOne(isReset));
  return { ui, controller, fill, submit, request };
}

describe('ResetPasswordComponent (A0.2, RF-16)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks for a new password when the link brought a code', async () => {
    const { ui } = await setup();

    expect(ui.getByRole('heading', { name: 'Elige una contraseña nueva' })).toBeTruthy();
    expect(ui.getByLabelText('Nueva contraseña')).toBeTruthy();
  });

  it('explains that the link is not valid when it has no code, and offers a new one', async () => {
    const { ui } = await setup(null);

    expect(ui.getByText('Este enlace no es válido. Pide uno nuevo.')).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Pedir un enlace nuevo' }).getAttribute('href')).toBe(
      '/forgot-password',
    );
    expect(ui.queryByLabelText('Nueva contraseña')).toBeNull();
  });

  it('applies the rules of a new password before calling the BFF', async () => {
    const { ui, controller, fill, submit } = await setup();

    await submit();
    expect(ui.getByText('Ingresa tu nueva contraseña')).toBeTruthy();
    await fill('corta12');
    await submit();
    expect(ui.getByText('Mínimo 8 caracteres')).toBeTruthy();
    await fill('ñ'.repeat(37));
    await submit();
    expect(ui.getByText('La contraseña es demasiado larga')).toBeTruthy();

    controller.expectNone(isReset);
  });

  it('sends the code with the new password and goes to the login with the notice', async () => {
    const { fill, submit, request } = await setup();
    await fill(VALID);

    await submit();
    const req = await request();
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ code: CODE, newPassword: VALID });
    req.flush(null, { status: 204, statusText: 'No Content' });

    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/login?updated=1');
    });
  });

  it('says the link expired and offers a new one when the code cannot be used', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).flush(
      { code: 'AUTH_INVALID_OR_EXPIRED_CODE', message: 'x' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText('Enlace inválido o expirado, solicita uno nuevo')).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Pedir un enlace nuevo' }).getAttribute('href')).toBe(
      '/forgot-password',
    );
    // The code is known to be dead: the only way forward is a new link, not another attempt.
    expect(ui.queryByLabelText('Nueva contraseña')).toBeNull();
  });

  it('treats an empty code like a missing one', async () => {
    const { ui } = await setup('');

    expect(ui.getByText('Este enlace no es válido. Pide uno nuevo.')).toBeTruthy();
    expect(ui.queryByLabelText('Nueva contraseña')).toBeNull();
  });

  it('tells the user to wait when the server rate-limits the reset', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).flush(
      { code: 'RATE_LIMITED', message: 'x' },
      { status: 429, statusText: 'Too Many Requests' },
    );

    expect(
      await ui.findByText('Demasiados intentos, espera un momento antes de volver a intentar'),
    ).toBeTruthy();
    expect(ui.getByLabelText('Nueva contraseña')).toBeTruthy();
  });

  it('keeps the code after a network failure so the retry sends the same one', async () => {
    const { ui, controller, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();
    (await request()).error(new ProgressEvent('error'));
    await ui.findByText('No se pudo conectar con el servidor. Inténtalo de nuevo.');

    await submit();

    const retry = await vi.waitFor(() => controller.expectOne(isReset));
    expect(retry.request.body).toEqual({ code: CODE, newPassword: VALID });
    retry.flush(null, { status: 204, statusText: 'No Content' });
  });

  it('shows a weak-password error under the field and keeps the form', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).flush(
      { code: 'AUTH_WEAK_PASSWORD', message: 'x', field: 'newPassword' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText('Mínimo 8 caracteres')).toBeTruthy();
    expect(ui.getByLabelText('Nueva contraseña').getAttribute('aria-invalid')).toBe('true');
    expect(ui.queryByRole('link', { name: 'Pedir un enlace nuevo' })).toBeNull();
  });

  it('shows a general error when the server cannot be reached', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).error(new ProgressEvent('error'));

    expect(
      await ui.findByText('No se pudo conectar con el servidor. Inténtalo de nuevo.'),
    ).toBeTruthy();
  });
});
