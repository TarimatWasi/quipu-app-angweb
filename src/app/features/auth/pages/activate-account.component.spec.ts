import { HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { AuthService } from '@core/auth/auth.service';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { ActivateAccountComponent } from './activate-account.component';

const isActivate = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/activate');
const TOKEN = 'abc-DEF_123';
const VALID = 'Nueva12345';
const DEAD_TEXT =
  'Enlace inválido o expirado. Pídele al administrador uno nuevo: cada enlace sirve una sola vez y vence a los 30 minutos.';
const GUEST = {
  role: 'GUEST',
  guestType: 'CONTRACT',
  name: 'Luis Huamán',
  mustChangePassword: false,
  guestStatus: 'ONBOARDING',
  nextOnboardingStep: 'PERSONAL_DATA',
};

@Component({ selector: 'app-stub', template: '' })
class StubComponent {}

async function setup(fragment: string | null = `token=${TOKEN}`) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'login', component: StubComponent },
        { path: 'home', component: StubComponent },
      ]),
      provideHttpClient(withInterceptors([credentialsInterceptor])),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { fragment } } },
    ],
  });
  const controller = TestBed.inject(HttpTestingController);
  const fixture = TestBed.createComponent(ActivateAccountComponent);
  await fixture.whenStable();
  const ui = within(fixture.nativeElement as HTMLElement);
  const fill = async (password: string) => {
    fireEvent.input(ui.getByLabelText('Contraseña'), { target: { value: password } });
    await fixture.whenStable();
  };
  const submit = async () => {
    fireEvent.click(ui.getByRole('button', { name: 'Activar mi cuenta' }));
    await fixture.whenStable();
  };
  const request = () => vi.waitFor(() => controller.expectOne(isActivate));
  return { ui, controller, fill, submit, request };
}

describe('ActivateAccountComponent (A0.4, CU-24)', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('asks for a password when the link brought a token', async () => {
    const { ui } = await setup();

    expect(ui.getByRole('heading', { name: 'Activa tu cuenta' })).toBeTruthy();
    expect(
      ui.getByText('Elige tu contraseña. Con ella y tu documento entrarás a Quipu.'),
    ).toBeTruthy();
    expect(ui.getByLabelText('Contraseña')).toBeTruthy();
    expect(ui.getByText('Mínimo 8 caracteres.')).toBeTruthy();
  });

  it.each([
    ['no fragment', null],
    ['a fragment without a token', 'otra=cosa'],
    ['an empty token', 'token='],
  ])('explains that the link is not valid with %s, and sends to the login', async (_, fragment) => {
    const { ui } = await setup(fragment);

    expect(ui.getByRole('heading', { name: 'Enlace no válido' })).toBeTruthy();
    expect(ui.getByText(DEAD_TEXT)).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Ir a iniciar sesión' }).getAttribute('href')).toBe(
      '/login',
    );
    expect(ui.queryByLabelText('Contraseña')).toBeNull();
  });

  it('applies the rules of a new password before calling the BFF', async () => {
    const { ui, controller, fill, submit } = await setup();

    await fill('corta12');
    await submit();

    expect(ui.getByText('Mínimo 8 caracteres')).toBeTruthy();
    expect(ui.getByLabelText('Contraseña').getAttribute('aria-invalid')).toBe('true');
    controller.expectNone(isActivate);
  });

  it('sends the token and the password, keeps the session and goes to the home', async () => {
    const { fill, submit, request } = await setup();
    await fill(VALID);

    await submit();
    const req = await request();
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ token: TOKEN, newPassword: VALID });
    req.flush(GUEST);

    await vi.waitFor(() => {
      expect(TestBed.inject(Router).url).toBe('/home');
    });
    expect(TestBed.inject(AuthService).session()).toEqual({
      role: 'GUEST',
      guestType: 'CONTRACT',
      name: 'Luis Huamán',
      mustChangePassword: false,
    });
  });

  it('shows a weak-password error under the field and lets the person retry with the same token', async () => {
    const { ui, controller, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).flush(
      { code: 'AUTH_WEAK_PASSWORD', message: 'x', field: 'newPassword' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText('Mínimo 8 caracteres')).toBeTruthy();
    expect(ui.getByLabelText('Contraseña').getAttribute('aria-invalid')).toBe('true');

    await fill('OtraClave123');
    await submit();
    const retry = await vi.waitFor(() => controller.expectOne(isActivate));
    expect(retry.request.body).toEqual({ token: TOKEN, newPassword: 'OtraClave123' });
    retry.flush(GUEST);
  });

  it('replaces the form when the token cannot be used', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).flush(
      { code: 'AUTH_INVALID_OR_EXPIRED_CODE', message: 'x' },
      { status: 400, statusText: 'Bad Request' },
    );

    expect(await ui.findByText(DEAD_TEXT)).toBeTruthy();
    expect(ui.getByRole('link', { name: 'Ir a iniciar sesión' })).toBeTruthy();
    expect(ui.queryByLabelText('Contraseña')).toBeNull();
  });

  it('shows a disabled account as a general error and keeps the form', async () => {
    const { ui, fill, submit, request } = await setup();
    await fill(VALID);
    await submit();

    (await request()).flush(
      { code: 'AUTH_ACCOUNT_DISABLED', message: 'x' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(
      await ui.findByText('Tu cuenta está deshabilitada. Contacta al administrador.'),
    ).toBeTruthy();
    expect(ui.getByLabelText('Contraseña')).toBeTruthy();
  });
});
