import { TestBed } from '@angular/core/testing';
import { fireEvent, screen } from '@testing-library/dom';
import { of, Subject, throwError } from 'rxjs';
import { ToastService } from '@shared/ui/toast/toast.service';
import { OnboardingConsentComponent } from './consent.component';
import type { OnboardingState } from '../data/onboarding.service';
import { completed, fakeApi, httpError, openStep, toConsent } from './onboarding.testing';

async function setup(guestType: 'CONTRACT' | 'TEMPORARY' = 'CONTRACT', api = fakeApi(toConsent)) {
  const opened = await openStep(OnboardingConsentComponent, 'consent', api, guestType);
  const box = () => screen.getByRole<HTMLInputElement>('checkbox', { name: /Acepto/ });
  const mark = async () => {
    fireEvent.click(box());
    await opened.settle();
  };
  const finish = async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Terminar registro' }));
    await opened.settle();
  };
  return { ...opened, api, box, mark, finish };
}

describe('O3 «Tu consentimiento»', () => {
  it('shows the text in force with its version, one paragraph each, and the last step marked', async () => {
    await setup();

    expect(screen.getByText('Tu registro · paso 4 de 4')).toBeTruthy();
    expect(screen.getByText('Versión 2026-10')).toBeTruthy();
    expect(screen.getByText('Quién trata tus datos. Tarimat Wasi.')).toBeTruthy();
    expect(screen.getByText('Qué datos tratamos. Tu nombre.')).toBeTruthy();
    expect(screen.getByRole('region', { name: /Consentimiento para el tratamiento/ })).toBeTruthy();
  });

  it('keeps «Terminar registro» off until the box is marked, and says why', async () => {
    const { mark } = await setup();

    const button = screen.getByRole<HTMLButtonElement>('button', { name: 'Terminar registro' });
    expect(button.disabled).toBe(true);
    expect(screen.getByText('Marca la casilla para terminar.')).toBeTruthy();
    await mark();
    expect(button.disabled).toBe(false);
    expect(screen.queryByText('Marca la casilla para terminar.')).toBeNull();
  });

  it('accepts the version it read, tells it is complete and goes home', async () => {
    const { api, mark, finish, router, auth } = await setup();
    const toasts = TestBed.inject(ToastService);
    const show = vi.spyOn(toasts, 'show');

    await mark();
    await finish();

    expect(api.acceptConsent).toHaveBeenCalledWith('2026-10');
    expect(show).toHaveBeenCalledWith('Tu registro está completo.', { tone: 'success' });
    expect(router.url).toBe('/home');
    expect(auth.onboardingAdvanced).toHaveBeenCalledWith(null);
  });

  it('says where the guest goes next by its kind', async () => {
    await setup('TEMPORARY');

    expect(screen.getByText(/subir el voucher de tu estadía/)).toBeTruthy();
    expect(screen.getByText('Después: tu estado de pago.')).toBeTruthy();
  });

  it('puts «not accepted» under the box', async () => {
    const api = fakeApi(toConsent);
    api.acceptConsent.mockReturnValue(
      throwError(() => httpError(400, { code: 'CONSENT_NOT_ACCEPTED', message: 'x' })),
    );
    const { mark, finish, box } = await setup('CONTRACT', api);

    await mark();
    await finish();

    expect(screen.getByText('Debes marcar el consentimiento de datos personales')).toBeTruthy();
    expect(box().getAttribute('aria-invalid')).toBe('true');
  });

  it('reads the new text again and clears the box when the text changed', async () => {
    const api = fakeApi(toConsent);
    api.acceptConsent.mockReturnValue(
      throwError(() =>
        httpError(400, { code: 'VALIDATION_ERROR', message: 'x', field: 'consentVersion' }),
      ),
    );
    const { mark, finish, box, settle } = await setup('CONTRACT', api);
    api.state.mockReturnValue(
      of({
        ...toConsent,
        consent: { version: '2026-11', text: 'Texto nuevo.', accepted: false },
      }),
    );

    await mark();
    await finish();
    await settle();

    expect(screen.getByText('El texto se actualizó mientras lo leías.')).toBeTruthy();
    expect(screen.getByText('Versión 2026-11')).toBeTruthy();
    expect(screen.getByText('Texto nuevo.')).toBeTruthy();
    expect(box().checked).toBe(false);
  });

  it('does not carry a box marked while the new text loads over to that text', async () => {
    const api = fakeApi(toConsent);
    api.acceptConsent.mockReturnValue(
      throwError(() =>
        httpError(400, { code: 'VALIDATION_ERROR', message: 'x', field: 'consentVersion' }),
      ),
    );
    const { mark, finish, box, settle } = await setup('CONTRACT', api);
    const reading = new Subject<OnboardingState>();
    api.state.mockReturnValue(reading);

    await mark();
    await finish();
    // The old text is still on screen while the new one comes: marking now is for the old one.
    await mark();
    expect(box().checked).toBe(true);
    reading.next({
      ...toConsent,
      consent: { version: '2026-11', text: 'Nuevo.', accepted: false },
    });
    reading.complete();
    await settle();

    expect(screen.getByText('Versión 2026-11')).toBeTruthy();
    expect(box().checked).toBe(false);
    expect(
      screen.getByRole<HTMLButtonElement>('button', { name: 'Terminar registro' }).disabled,
    ).toBe(true);
  });

  it('says that the registration is already complete', async () => {
    const api = fakeApi(toConsent);
    api.acceptConsent.mockReturnValue(
      throwError(() => httpError(409, { code: 'ONBOARDING_ALREADY_COMPLETED', message: 'x' })),
    );
    const { mark, finish } = await setup('CONTRACT', api);

    await mark();
    await finish();

    expect(
      screen.getByText('Lo terminaste en otra ventana. Ya puedes usar tu cuenta.'),
    ).toBeTruthy();
  });

  it('shows a failure of the connection above the buttons and lets it try again', async () => {
    const api = fakeApi(toConsent);
    api.acceptConsent.mockReturnValueOnce(throwError(() => httpError(0)));
    const { mark, finish, router } = await setup('CONTRACT', api);

    await mark();
    await finish();
    expect(screen.getByRole('alert').textContent).toContain('No se pudo conectar');

    api.acceptConsent.mockReturnValue(of(completed));
    await finish();
    expect(router.url).toBe('/home');
  });
});
