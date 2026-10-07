import { HttpRequest, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MATERIAL_ANIMATIONS } from '@angular/material/core';
import { provideRouter, Router } from '@angular/router';
import { fireEvent, within } from '@testing-library/dom';
import { credentialsInterceptor } from '@core/interceptors/credentials.interceptor';
import { AuthService, LOGIN_TIMING, LoginTiming } from '@core/services/auth.service';
import { LoginComponent } from './login.component';

const isLogin = (req: HttpRequest<unknown>) => req.url.endsWith('/bff/auth/login');
const ADMIN = { role: 'ADMIN', name: 'admin@example.test', mustChangePassword: false };

@Component({ selector: 'app-home-stub', template: '' })
class HomeStubComponent {}

async function setup(timing?: LoginTiming) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'home', component: HomeStubComponent },
        { path: 'forgot-password', component: HomeStubComponent },
      ]),
      provideHttpClient(withInterceptors([credentialsInterceptor])),
      provideHttpClientTesting(),
      { provide: MATERIAL_ANIMATIONS, useValue: { animationsDisabled: true } },
      ...(timing ? [{ provide: LOGIN_TIMING, useValue: timing }] : []),
    ],
  });
  const fixture = TestBed.createComponent(LoginComponent);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const ui = within(root);
  const controller = TestBed.inject(HttpTestingController);
  const fill = async (label: string, value: string) => {
    fireEvent.input(ui.getByLabelText(label), { target: { value } });
    await fixture.whenStable();
  };
  const fillValid = async (password = 'secret-1') => {
    await fill('Número de documento', '12345678');
    await fill('Contraseña', password);
  };
  const submit = async () => {
    fireEvent.click(ui.getByRole('button', { name: 'Ingresar' }));
    await fixture.whenStable();
  };
  const request = () => vi.waitFor(() => controller.expectOne(isLogin));
  const failWith = async (
    status: number,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) => {
    await fillValid();
    await submit();
    (await request()).flush(body, { status, statusText: 'Error', headers });
  };
  const focusedId = () => document.activeElement?.id ?? '';
  const formElement = () => {
    const element = root.querySelector('form');
    if (!element) {
      throw new Error('form not found');
    }
    return element;
  };
  return {
    fixture,
    ui,
    controller,
    fill,
    fillValid,
    submit,
    request,
    failWith,
    focusedId,
    formElement,
  };
}

describe('LoginComponent', () => {
  afterEach(() => {
    vi.useRealTimers();
    TestBed.inject(HttpTestingController).verify();
  });

  describe('form', () => {
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

    it('marks the required fields and asks the browser for the right autofill', async () => {
      const { ui } = await setup();

      const number = ui.getByLabelText('Número de documento');
      const password = ui.getByLabelText('Contraseña');
      expect(number.getAttribute('aria-required')).toBe('true');
      expect(password.getAttribute('aria-required')).toBe('true');
      expect(number.getAttribute('autocomplete')).toBe('username');
      expect(password.getAttribute('autocomplete')).toBe('current-password');
      expect(ui.getByLabelText('Tipo de documento').getAttribute('autocomplete')).toBe('off');
    });
  });

  describe('client validation', () => {
    it('does not call the BFF and explains what is missing when the form is empty', async () => {
      const { ui, controller, submit } = await setup();

      await submit();

      controller.expectNone(isLogin);
      expect(ui.getByText('Ingresa tu número de documento')).toBeTruthy();
      expect(ui.getByText('Ingresa tu contraseña')).toBeTruthy();
    });

    it('treats a document number made only of spaces as empty', async () => {
      const { ui, controller, fill, submit } = await setup();
      await fill('Número de documento', '   ');
      await fill('Contraseña', 'secret-1');

      await submit();

      controller.expectNone(isLogin);
      expect(ui.getByText('Ingresa tu número de documento')).toBeTruthy();
    });

    it('moves the focus to the first invalid field', async () => {
      const { submit, focusedId } = await setup();

      await submit();

      await vi.waitFor(() => {
        expect(focusedId()).toBe('document-number');
      });
    });

    it('ties each field error to its field without a live region (no double announcement)', async () => {
      const { ui, submit } = await setup();

      await submit();

      const input = ui.getByLabelText('Número de documento');
      const error = ui.getByText('Ingresa tu número de documento');
      expect(input.getAttribute('aria-describedby')).toBe(error.id);
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(ui.queryAllByRole('alert')).toHaveLength(0);
    });
  });

  describe('submitting', () => {
    it('sends the credentials with the document number trimmed and goes to /home', async () => {
      const { fill, submit, request } = await setup();
      await fill('Número de documento', '  12345678 ');
      await fill('Contraseña', 'secret-1');

      await submit();

      const req = await request();
      expect(req.request.body).toEqual({
        documentType: 'DNI',
        documentNumber: '12345678',
        password: 'secret-1',
      });
      req.flush(ADMIN);
      await vi.waitFor(() => {
        expect(TestBed.inject(Router).url).toBe('/home');
      });
      expect(TestBed.inject(AuthService).session()).toEqual(ADMIN);
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
      req.flush({ ...ADMIN, role: 'GUEST' });
    });

    it('disables the button and ignores a second submit while one is in flight', async () => {
      const { ui, formElement, fillValid, submit, request, fixture } = await setup();
      await fillValid();

      await submit();
      const button = ui.getByRole<HTMLButtonElement>('button', { name: 'Ingresar' });
      await vi.waitFor(() => {
        expect(button.disabled).toBe(true);
      });
      // Enter in a field submits the form again, and so does a second click on the button.
      fireEvent.submit(formElement());
      fireEvent.click(button);
      await fixture.whenStable();

      const req = await request();
      req.flush(ADMIN);
      await fixture.whenStable();
    });
  });

  describe('failures', () => {
    it('shows its own text, not the server one, when the credentials are wrong', async () => {
      const { ui, failWith, focusedId } = await setup();

      await failWith(401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'Wrong password for 7' });

      const message = await ui.findByText('Documento o contraseña incorrectos');
      expect(message.id).toBe('login-error');
      expect(ui.queryByText(/Wrong password/)).toBeNull();
      expect(TestBed.inject(Router).url).toBe('/');
      await vi.waitFor(() => {
        expect(focusedId()).toBe('login-error');
      });
    });

    it('links the general error to the form', async () => {
      const { ui, formElement, failWith } = await setup();

      await failWith(401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'x' });

      await ui.findByText('Documento o contraseña incorrectos');
      expect(formElement().getAttribute('aria-describedby')).toBe('login-error');
    });

    it('tells the user the account is disabled on a 403', async () => {
      const { ui, failWith } = await setup();

      await failWith(403, { code: 'AUTH_ACCOUNT_DISABLED', message: 'x' });

      expect(
        await ui.findByText('Tu cuenta está deshabilitada. Contacta al administrador.'),
      ).toBeTruthy();
      expect(TestBed.inject(AuthService).session()).toBeNull();
    });

    it('keeps the form open with a plain message on a 423 that does not say how long (SEG-06)', async () => {
      const { ui, failWith } = await setup();

      await failWith(423, { code: 'AUTH_ACCOUNT_LOCKED', message: 'x' });

      expect(
        await ui.findByText(
          'Tu cuenta está bloqueada por intentos fallidos. Inténtalo más tarde o restablece tu contraseña.',
        ),
      ).toBeTruthy();
      expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
      expect(ui.getByLabelText<HTMLInputElement>('Contraseña').disabled).toBe(false);
      expect(TestBed.inject(AuthService).session()).toBeNull();
    });

    it.each([
      ['documentNumber', 'document-number', 'Revisa el número de documento'],
      ['password', 'password', 'Revisa la contraseña'],
      ['documentType', 'document-type', 'Elige un tipo de documento válido'],
    ])('puts a VALIDATION_ERROR on %s on that field and focuses it', async (field, id, text) => {
      const { ui, failWith, focusedId } = await setup();

      await failWith(400, { code: 'VALIDATION_ERROR', message: 'x', field });

      const message = await ui.findByText(text);
      expect(message.id).toBe(`${id}-error`);
      expect(document.getElementById(id)?.getAttribute('aria-describedby')).toBe(message.id);
      await vi.waitFor(() => {
        expect(focusedId()).toBe(id);
      });
    });

    it('shows a VALIDATION_ERROR without a known field as a general error', async () => {
      const { ui, failWith } = await setup();

      await failWith(400, { code: 'VALIDATION_ERROR', message: 'x' });

      expect((await ui.findByText('Revisa los datos ingresados')).id).toBe('login-error');
    });

    it('tells the user to reload on a 415', async () => {
      const { ui, failWith } = await setup();

      await failWith(415, { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'x' });

      expect(
        await ui.findByText(
          'No se pudo enviar el formulario. Recarga la página e inténtalo de nuevo.',
        ),
      ).toBeTruthy();
    });

    it('hides the detail of a code it does not know', async () => {
      const { ui, failWith } = await setup();

      await failWith(409, { code: 'SOMETHING_NEW', message: 'stack trace here' });

      expect(await ui.findByText('Ocurrió un error inesperado. Inténtalo de nuevo.')).toBeTruthy();
      expect(ui.queryByText(/stack trace/)).toBeNull();
    });

    it('tells the user when the server cannot be reached', async () => {
      const { ui, fillValid, submit, request } = await setup();
      await fillValid();

      await submit();

      (await request()).error(new ProgressEvent('error'));
      expect(
        await ui.findByText('No se pudo conectar con el servidor. Inténtalo de nuevo.'),
      ).toBeTruthy();
    });

    it('does not sign in on a 200 whose role is not ADMIN or GUEST', async () => {
      const { ui, fillValid, submit, request } = await setup();
      await fillValid();

      await submit();

      (await request()).flush({ ...ADMIN, role: 'ROOT' });
      expect(await ui.findByText('Ocurrió un error inesperado. Inténtalo de nuevo.')).toBeTruthy();
      expect(TestBed.inject(AuthService).session()).toBeNull();
      expect(TestBed.inject(Router).url).toBe('/');
    });

    it('lets the user try again after a failure', async () => {
      const { ui, fill, failWith, submit, request } = await setup();
      await failWith(401, { code: 'AUTH_INVALID_CREDENTIALS', message: 'x' });
      await ui.findByText('Documento o contraseña incorrectos');

      await fill('Contraseña', 'secret-2');
      await submit();

      const retry = await request();
      expect((retry.request.body as { password: string }).password).toBe('secret-2');
      retry.flush(ADMIN);
      await vi.waitFor(() => {
        expect(ui.queryByText('Documento o contraseña incorrectos')).toBeNull();
      });
    });
  });

  describe('slow server', () => {
    it('explains the wait after a few seconds and removes the hint when the answer arrives', async () => {
      const { ui, fillValid, submit, request } = await setup({
        slowHintAfterMs: 20,
        timeoutMs: 5_000,
      });
      await fillValid();

      await submit();

      const hint = await ui.findByRole('status');
      expect(hint.tagName).toBe('OUTPUT');
      expect(hint.textContent).toMatch(/está despertando/);
      (await request()).flush(ADMIN);
      await vi.waitFor(() => {
        expect(ui.queryByText(/está despertando/)).toBeNull();
      });
    });

    it('does not show the hint when the server answers quickly', async () => {
      const { ui, fillValid, submit, request } = await setup({
        slowHintAfterMs: 200,
        timeoutMs: 5_000,
      });
      await fillValid();

      await submit();
      (await request()).flush(ADMIN);

      await new Promise((resolve) => setTimeout(resolve, 260));
      expect(ui.queryByText(/está despertando/)).toBeNull();
    });

    it('gives up, re-enables the form with a Spanish error, and lets the user retry', async () => {
      const { ui, controller, fillValid, submit, request } = await setup({
        slowHintAfterMs: 10,
        timeoutMs: 60,
      });
      await fillValid();

      await submit();
      const first = await request();

      expect(
        await ui.findByText('El servidor tardó demasiado en responder. Inténtalo de nuevo.'),
      ).toBeTruthy();
      expect(first.cancelled).toBe(true);
      expect(ui.getByRole<HTMLButtonElement>('button', { name: 'Ingresar' }).disabled).toBe(false);
      expect(ui.queryByText(/está despertando/)).toBeNull();
      controller.match(isLogin);

      await submit();
      (await request()).flush(ADMIN);
    });
  });

  describe('a locked account with a countdown (TAR-131)', () => {
    const LOCKED = {
      code: 'AUTH_ACCOUNT_LOCKED',
      message: 'x',
      lockedUntil: '2026-10-07T20:42:00Z',
    };
    const RETRY_AFTER = { 'Retry-After': '900' };
    const body = within(document.body);

    const lockedSetup = async (retryAfter = RETRY_AFTER['Retry-After']) => {
      const page = await setup();
      await page.failWith(423, LOCKED, { 'Retry-After': retryAfter });
      await page.fixture.whenStable();
      return page;
    };
    const closeDialog = async (fixture: { whenStable: () => Promise<unknown> }) => {
      fireEvent.click(body.getByRole('button', { name: 'Entendido' }));
      await fixture.whenStable();
    };

    it('opens an alert dialog once, with the countdown and the time of day in Lima', async () => {
      await lockedSetup();

      const dialog = await body.findByRole('alertdialog', { name: 'Cuenta bloqueada por un rato' });
      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(within(dialog).getByText('15:00')).toBeTruthy();
      expect(within(dialog).getByText(/a las 15:42 \(hora de Lima\)/)).toBeTruthy();
      expect(document.activeElement?.textContent).toContain('Entendido');
    });

    it('hides the digits that change every second from screen readers', async () => {
      await lockedSetup();

      const dialog = await body.findByRole('alertdialog');
      const digits = within(dialog).getByText('15:00');
      expect(digits.closest('[aria-hidden="true"]')).not.toBeNull();
    });

    it('leaves a banner with the countdown and a disabled form once the dialog is closed', async () => {
      const { ui, fixture, focusedId } = await lockedSetup();
      await body.findByRole('alertdialog');

      await closeDialog(fixture);

      await vi.waitFor(() => {
        expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
      });
      expect(ui.getByText('Cuenta bloqueada por intentos fallidos')).toBeTruthy();
      expect(ui.getByText(/^(15:00|14:5\d)$/)).toBeTruthy();
      for (const label of ['Tipo de documento', 'Número de documento', 'Contraseña']) {
        expect(ui.getByLabelText<HTMLInputElement>(label).disabled).toBe(true);
      }
      expect(ui.getByRole<HTMLButtonElement>('button', { name: 'Ingresar' }).disabled).toBe(true);
      expect(focusedId()).toBe('lock-banner');
    });

    it('keeps both ways out enabled while it lasts: the reset link in the banner and the page', async () => {
      const { ui, fixture } = await lockedSetup();
      await body.findByRole('alertdialog');
      await closeDialog(fixture);

      expect(ui.getByRole('link', { name: 'Restablece tu contraseña' }).getAttribute('href')).toBe(
        '/forgot-password',
      );
      expect(ui.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toBeTruthy();
    });

    it('takes the person to the password reset from the dialog and closes it', async () => {
      const { fixture } = await lockedSetup();
      await body.findByRole('alertdialog');

      fireEvent.click(body.getByRole('link', { name: 'Restablecer mi contraseña' }));
      await fixture.whenStable();

      await vi.waitFor(() => {
        expect(document.body.querySelector('[role="alertdialog"]')).toBeNull();
      });
      expect(TestBed.inject(Router).url).toBe('/forgot-password');
    });

    it('announces the lock to screen readers in a polite region that exists from the start', async () => {
      const { fixture } = await setup();
      const root = fixture.nativeElement as HTMLElement;
      const region = root.querySelector('[aria-live="polite"]');
      expect(region).not.toBeNull();
      expect(region?.textContent.trim()).toBe('');
    });

    it('opens the form again at zero: password cleared, focus on it and a notice', async () => {
      const { ui, fixture, focusedId } = await lockedSetup('1');
      await body.findByRole('alertdialog');
      await closeDialog(fixture);

      await vi.waitFor(
        () => {
          expect(ui.getByText('Ya puedes intentarlo de nuevo')).toBeTruthy();
        },
        { timeout: 4000 },
      );

      expect(ui.queryByText('Cuenta bloqueada por intentos fallidos')).toBeNull();
      for (const label of ['Tipo de documento', 'Número de documento', 'Contraseña']) {
        expect(ui.getByLabelText<HTMLInputElement>(label).disabled).toBe(false);
      }
      expect(ui.getByLabelText<HTMLInputElement>('Número de documento').value).toBe('12345678');
      expect(ui.getByLabelText<HTMLInputElement>('Contraseña').value).toBe('');
      expect(ui.getByRole<HTMLButtonElement>('button', { name: 'Ingresar' }).disabled).toBe(false);
      expect(focusedId()).toBe('password');
    });
  });
});
