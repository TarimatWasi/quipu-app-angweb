import { TestBed } from '@angular/core/testing';
import { ChangeResourcesService } from '@core/changes/change-resources.service';
import { MatDialog } from '@angular/material/dialog';
import { fireEvent, screen, within } from '@testing-library/dom';
import { of, Subject, throwError } from 'rxjs';
import { AccessHandoffService, GENERATE_ACCESS_STATE } from '../data/access-handoff.service';
import { squash, words, httpError, guestOf, month, GRANT, setup } from './guest-detail.testing';

describe('GuestDetailComponent actions (A3.3, A3.4, A3.6 and the account email)', () => {
  afterEach(() => {
    TestBed.inject(MatDialog).closeAll();
  });

  it('preserves the account email dialog draft when its guest changes', async () => {
    const ui = await setup();
    await ui.click(ui.page().getByRole('button', { name: /^Cambiar correo/ }));
    const dialog = within(screen.getByRole('dialog', { name: 'Cambiar correo' }));
    const field = dialog.getByLabelText<HTMLInputElement>('Correo');
    fireEvent.input(field, { target: { value: 'borrador@example.test' } });
    const calls = ui.service.get.mock.calls.length;
    TestBed.inject(ChangeResourcesService).changed(['admin.guest:g1']);
    TestBed.tick();
    expect(field.value).toBe('borrador@example.test');
    expect(ui.service.get).toHaveBeenCalledTimes(calls);
    expect(ui.page().getByText('Hay cambios en la información de esta pantalla.')).toBeTruthy();
  });

  const noContract = () => of(guestOf({ contract: undefined }));

  it('deactivates a guest without a contract in force and reloads it', async () => {
    const ui = await setup({ detail: noContract(), months: [] });

    await ui.click(ui.page().getByRole('button', { name: 'Desactivar huésped' }));
    const dialog = within(screen.getByRole('alertdialog', { name: '¿Desactivar a Luis Huamán?' }));
    expect(
      dialog.getByText(
        'No podrá entrar a Quipu. Sus datos y su historial se conservan, y puedes reactivar su cuenta cuando quieras.',
      ),
    ).toBeTruthy();
    ui.service.get.mockReturnValue(of(guestOf({ status: 'INACTIVE', contract: undefined })));
    const confirm = dialog.getByRole('button', { name: 'Desactivar huésped' });
    // On the canvas the confirmation is the green primary button.
    expect(confirm.classList.contains('quipu-button--primary')).toBe(true);
    await ui.click(confirm);

    expect(ui.service.deactivate).toHaveBeenCalledWith('g1');
    await vi.waitFor(() => {
      expect(ui.toast()).toBe('Huésped desactivado.');
    });
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('Inactivo');
    expect(ui.more()).toEqual(['Ver documentos 2 documentos', 'Reactivar huésped']);
  });

  it('turns «Desactivar» into the notice of a contract in force, known or answered', async () => {
    const known = await setup();
    await known.click(known.page().getByRole('button', { name: 'Desactivar huésped' }));
    const notice = within(
      screen.getByRole('alertdialog', { name: 'Este huésped tiene un contrato vigente' }),
    );
    expect(
      notice.getByText('Este huésped tiene un contrato vigente: finalízalo primero.'),
    ).toBeTruthy();
    expect(notice.getAllByRole('button').map((button) => squash(button.textContent))).toEqual([
      'Cerrar',
    ]);
    expect(notice.getByRole('link', { name: 'Ver contrato vigente' }).getAttribute('href')).toMatch(
      /^[/]admin[/]contracts[/].+/,
    );
    expect(known.service.deactivate).not.toHaveBeenCalled();
    await known.click(notice.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('turns «Desactivar» into the notice when the BFF answers a contract in force', async () => {
    const ui = await setup({ detail: noContract(), months: [] });
    ui.service.deactivate.mockReturnValueOnce(
      throwError(() => httpError(409, { code: 'GUEST_HAS_ACTIVE_CONTRACT', contractId: 'c1' })),
    );
    await ui.click(ui.page().getByRole('button', { name: 'Desactivar huésped' }));
    await ui.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar huésped' }),
    );

    expect(
      screen.getByRole('alertdialog', { name: 'Este huésped tiene un contrato vigente' }),
    ).toBeTruthy();
    expect(ui.toast()).toBe('');
  });

  it('keeps «Desactivar» open with a red notice when it fails otherwise', async () => {
    const ui = await setup({ detail: noContract(), months: [] });
    ui.service.deactivate.mockReturnValueOnce(throwError(() => httpError(0)));
    await ui.click(ui.page().getByRole('button', { name: 'Desactivar huésped' }));
    const dialog = within(screen.getByRole('alertdialog'));
    await ui.click(dialog.getByRole('button', { name: 'Desactivar huésped' }));

    expect(squash(dialog.getByRole('alert').textContent)).toBe(
      'No se pudo conectar con el servidor. Inténtalo de nuevo.',
    );
    expect(dialog.getByRole('button', { name: 'Desactivar huésped' })).toBeTruthy();
  });

  it('generates another access and hands it to A3.7 in memory, never in the address', async () => {
    const ui = await setup();
    const handoff = TestBed.inject(AccessHandoffService);
    const put = vi.spyOn(handoff, 'put');

    await ui.click(ui.page().getByRole('button', { name: 'Generar otro acceso' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Generar otro acceso' }));
    expect(
      dialog.getByText(
        'Su contraseña actual sigue sirviendo hasta que use el acceso nuevo. ¿Cómo se lo entregas?',
      ),
    ).toBeTruthy();
    const group = within(dialog.getByRole('radiogroup', { name: 'Cómo se lo entregas' }));
    expect(
      group.getByRole<HTMLInputElement>('radio', { name: 'Enlace (recomendado)' }).checked,
    ).toBe(true);
    await ui.click(group.getByRole('radio', { name: 'Contraseña temporal' }));
    expect(
      dialog.getByText(
        'Los dos valen 30 minutos y sirven una sola vez. Después verás el mensaje listo para enviarle.',
      ),
    ).toBeTruthy();
    await ui.click(dialog.getByRole('button', { name: 'Generar acceso' }));

    expect(ui.service.generateAccess).toHaveBeenCalledWith('g1', 'TEMPORARY_PASSWORD');
    await vi.waitFor(() => {
      expect(ui.router.url).toBe('/admin/guests/g1/access');
    });
    expect(put).toHaveBeenCalledWith({
      guestId: 'g1',
      documentType: 'DNI',
      documentNumber: '70412233',
      type: 'CONTRACT',
      phone: '987 654 321',
      email: 'luis@example.com',
      access: GRANT,
      regenerated: true,
    });
    expect(ui.router.url).not.toContain('K7');
  });

  it('keeps «Generar otro acceso» open with its failure in red', async () => {
    const ui = await setup();
    ui.service.generateAccess.mockReturnValueOnce(
      throwError(() => httpError(409, { code: 'GUEST_INACTIVE', guestId: 'g1' })),
    );
    await ui.click(ui.page().getByRole('button', { name: 'Generar otro acceso' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Generar otro acceso' }));
    await ui.click(dialog.getByRole('button', { name: 'Generar acceso' }));

    expect(squash(dialog.getByRole('alert').textContent)).toBe(
      'El huésped está inactivo: reactívalo antes de seguir.',
    );
    expect(ui.router.url).toBe('/admin/guests/g1');
  });

  it('opens «Generar otro acceso» when A3.7 asks for it through the navigation state', async () => {
    await setup({ state: { [GENERATE_ACCESS_STATE]: true } });

    const dialog = within(screen.getByRole('dialog', { name: 'Generar otro acceso' }));
    expect(dialog.getByText(/^Su contraseña actual sigue sirviendo/)).toBeTruthy();
  });

  it('checks the account email, says a taken one under the field and saves it', async () => {
    const ui = await setup();
    await ui.click(ui.page().getByRole('button', { name: /^Cambiar correo/ }));
    const dialog = within(screen.getByRole('dialog', { name: 'Cambiar correo' }));
    const field = dialog.getByLabelText<HTMLInputElement>('Correo');
    expect(field.value).toBe('luis@example.com');
    const errorOf = () =>
      (field.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id))
        .find((element) => element?.classList.contains('quipu-field-error'))
        ?.textContent.trim();

    fireEvent.input(field, { target: { value: '' } });
    await ui.click(dialog.getByRole('button', { name: 'Guardar correo' }));
    expect(errorOf()).toBe('Escribe el correo.');
    fireEvent.input(field, { target: { value: 'no-es-correo' } });
    await ui.click(dialog.getByRole('button', { name: 'Guardar correo' }));
    expect(errorOf()).toBe('Escribe un correo válido.');
    expect(ui.service.setAccountEmail).not.toHaveBeenCalled();

    ui.service.setAccountEmail.mockReturnValueOnce(
      throwError(() => httpError(409, { code: 'ACCOUNT_EMAIL_TAKEN', field: 'email' })),
    );
    fireEvent.input(field, { target: { value: ' otra@example.com ' } });
    await ui.click(dialog.getByRole('button', { name: 'Guardar correo' }));
    await vi.waitFor(() => {
      expect(errorOf()).toBe('Ese correo ya está en uso por otra cuenta');
    });
    expect(ui.service.setAccountEmail).toHaveBeenLastCalledWith('g1', 'otra@example.com');

    fireEvent.input(field, { target: { value: 'nueva@example.com' } });
    await ui.click(dialog.getByRole('button', { name: 'Guardar correo' }));
    expect(ui.service.setAccountEmail).toHaveBeenLastCalledWith('g1', 'nueva@example.com');
    await vi.waitFor(() => {
      expect(ui.toast()).toBe('Correo guardado.');
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('reactivates without a confirmation and says so', async () => {
    const inactive = guestOf({ status: 'INACTIVE', contract: undefined });
    const ui = await setup({ detail: of(inactive), months: [] });
    ui.service.get.mockReturnValue(of(guestOf({ contract: undefined })));

    await ui.click(within(ui.panel()).getByRole('button', { name: 'Reactivar huésped' }));

    expect(ui.service.reactivate).toHaveBeenCalledWith('g1');
    await vi.waitFor(() => {
      expect(ui.toast()).toBe('Huésped reactivado.');
    });
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('Sin contrato');
  });

  it('keeps the notice of a failed reload while the clock ticks, until a reload succeeds', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    try {
      const ui = await setup({
        detail: of(guestOf({ status: 'INACTIVE', contract: undefined })),
        months: [],
      });
      ui.service.get.mockReturnValue(throwError(() => httpError(503)));
      await ui.click(within(ui.panel()).getByRole('button', { name: 'Reactivar huésped' }));
      await new Promise((resolve) => setTimeout(resolve, 0));
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();
      expect(squash(ui.page().getByRole('alert').textContent)).toContain(
        'No se pudo cargar el huésped',
      );

      vi.advanceTimersByTime(60_000);
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();
      expect(squash(ui.page().getByRole('alert').textContent)).toContain(
        'No se pudo cargar el huésped',
      );

      ui.service.get.mockReturnValue(of(guestOf({ contract: undefined })));
      await ui.click(ui.page().getByRole('button', { name: 'Reintentar' }));
      expect(ui.page().queryByRole('alert')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('says the access expired while inactive once reactivated, and offers another', async () => {
    const lapsed = {
      contract: undefined,
      name: null,
      accessExpiresAt: '2026-10-11T16:00:00Z',
    };
    const ui = await setup({
      detail: of(guestOf({ ...lapsed, status: 'INACTIVE', onboardingProgress: 'NOT_STARTED' })),
      months: [],
    });
    ui.service.reactivate.mockReturnValueOnce(of({ id: 'g1', status: 'PENDING_ACTIVATION' }));
    ui.service.get.mockReturnValue(
      of(
        guestOf({
          ...lapsed,
          status: 'PENDING_ACTIVATION',
          onboardingProgress: 'NOT_STARTED',
          version: 2,
        }),
      ),
    );

    await ui.click(within(ui.panel()).getByRole('button', { name: 'Reactivar huésped' }));

    await vi.waitFor(() => {
      expect(ui.toast()).toBe('Huésped reactivado. Su acceso venció: genera otro.');
    });
    expect(squash(ui.panel().querySelector('.figure')?.textContent)).toBe('Vencido');
    expect(
      within(ui.panel()).getByText(
        'Venció mientras estaba inactivo. Genera otro y entrégaselo: el anterior ya no sirve.',
      ),
    ).toBeTruthy();
    expect(within(ui.panel()).getByRole('button', { name: 'Generar otro acceso' })).toBeTruthy();
  });

  it('explains the debt that blocks reactivating and opens the direct payment', async () => {
    const ui = await setup({
      detail: of(guestOf({ status: 'INACTIVE', contract: undefined })),
      months: [month('2026-10', 'OVERDUE')],
    });
    ui.service.reactivate.mockReturnValueOnce(
      throwError(() =>
        httpError(409, {
          code: 'GUEST_HAS_PENDING_DEBT',
          periods: ['2026-10'],
          debts: [
            {
              period: '2026-10',
              stayId: null,
              stayStartDate: null,
              stayEndDate: null,
              amountDue: 800,
            },
          ],
        }),
      ),
    );
    expect(ui.more()).toEqual([
      'Ver documentos 2 documentos',
      'Reactivar huésped después de saldar su deuda',
    ]);

    const more = within(ui.page().getByRole('region', { name: 'Más acciones' }));
    await ui.click(more.getByRole('button', { name: 'Reactivar huésped' }));

    const debt = within(screen.getByRole('alertdialog', { name: 'Primero salda su deuda' }));
    expect(
      debt.getByText(
        'El huésped tiene deuda pendiente: salda sus períodos impagos antes de crear un contrato nuevo o reactivarlo',
      ),
    ).toBeTruthy();
    expect(
      [...debt.getByRole('list', { name: 'Lo que debe' }).querySelectorAll('li')].map((li) =>
        words(li),
      ),
    ).toEqual(['Octubre 2026 S/ 800.00', 'Total S/ 800.00']);
    await ui.click(debt.getByRole('button', { name: 'Registrar pago' }));
    await vi.waitFor(() => {
      expect(ui.router.url).toBe('/admin/payments/new?guestId=g1');
    });
  });

  it('says why reactivating failed in a toast', async () => {
    const ui = await setup({
      detail: of(guestOf({ status: 'INACTIVE', contract: undefined })),
      months: [],
    });
    ui.service.reactivate.mockReturnValueOnce(
      throwError(() => httpError(409, { code: 'CONCURRENT_MODIFICATION' })),
    );

    await ui.click(within(ui.panel()).getByRole('button', { name: 'Reactivar huésped' }));

    expect(ui.toast()).toBe(
      'El huésped cambió mientras tanto. Cierra este aviso y vuelve a intentarlo.',
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  describe('answers of another guest', () => {
    const other = guestOf({ id: 'g2', name: 'Ana Torres', contract: undefined });

    async function leaveWhileReactivating() {
      const reactivation = new Subject<unknown>();
      const ui = await setup({
        detail: of(guestOf({ status: 'INACTIVE', contract: undefined })),
        months: [],
      });
      ui.service.get.mockImplementation((id) =>
        of(id === 'g2' ? other : guestOf({ contract: undefined })),
      );
      ui.service.reactivate.mockReturnValueOnce(reactivation);
      await ui.click(within(ui.panel()).getByRole('button', { name: 'Reactivar huésped' }));
      await ui.router.navigateByUrl('/admin/guests/g2');
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();
      expect(ui.page().getByRole('heading', { level: 1, name: 'Ana Torres' })).toBeTruthy();
      ui.service.get.mockClear();
      return { ui, reactivation };
    }

    it('keeps the new guest when a late reactivation of the previous one succeeds', async () => {
      const { ui, reactivation } = await leaveWhileReactivating();

      reactivation.next({ id: 'g1', status: 'ACTIVE' });
      reactivation.complete();
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();
      await new Promise((resolve) => setTimeout(resolve, 0));
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();

      expect(ui.service.get).not.toHaveBeenCalled();
      expect(ui.router.url).toBe('/admin/guests/g2');
      expect(ui.page().getByRole('heading', { level: 1, name: 'Ana Torres' })).toBeTruthy();
      expect(ui.toast()).toBe('');
      expect(within(ui.panel()).queryByRole('button', { name: 'Reactivar huésped' })).toBeNull();
    });

    it('opens no debt dialog when a late reactivation of the previous one is refused', async () => {
      const { ui, reactivation } = await leaveWhileReactivating();

      reactivation.error(
        httpError(409, { code: 'GUEST_HAS_PENDING_DEBT', periods: ['2026-10'], debts: [] }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(ui.toast()).toBe('');
      expect(ui.page().getByRole('heading', { level: 1, name: 'Ana Torres' })).toBeTruthy();
    });

    it('opens nothing over another screen when a late reactivation is refused', async () => {
      const reactivation = new Subject<unknown>();
      const ui = await setup({
        detail: of(guestOf({ status: 'INACTIVE', contract: undefined })),
        months: [],
      });
      ui.service.reactivate.mockReturnValueOnce(reactivation);
      await ui.click(within(ui.panel()).getByRole('button', { name: 'Reactivar huésped' }));
      await ui.router.navigateByUrl('/admin/guests');
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();
      ui.service.get.mockClear();

      reactivation.error(
        httpError(409, { code: 'GUEST_HAS_PENDING_DEBT', periods: ['2026-10'], debts: [] }),
      );
      await new Promise((resolve) => setTimeout(resolve, 0));
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();

      expect(screen.queryByRole('alertdialog')).toBeNull();
      expect(ui.service.get).not.toHaveBeenCalled();
      expect(ui.router.url).toBe('/admin/guests');
    });

    it('ignores a dialog of the previous guest that closes after leaving it', async () => {
      const ui = await setup({ detail: of(guestOf({ contract: undefined })), months: [] });
      const deactivation = new Subject<unknown>();
      ui.service.deactivate.mockReturnValueOnce(deactivation);
      ui.service.get.mockImplementation((id) => of(id === 'g2' ? other : guestOf()));
      await ui.click(ui.page().getByRole('button', { name: 'Desactivar huésped' }));
      await ui.click(
        within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar huésped' }),
      );
      await ui.router.navigateByUrl('/admin/guests/g2');
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();
      ui.service.get.mockClear();

      deactivation.next(null);
      deactivation.complete();
      await new Promise((resolve) => setTimeout(resolve, 0));
      // A resource keeps the app unstable while it reads: tick instead of waiting for it.
      TestBed.tick();

      expect(ui.service.get).not.toHaveBeenCalled();
      expect(ui.toast()).toBe('');
      expect(ui.page().getByRole('heading', { level: 1, name: 'Ana Torres' })).toBeTruthy();
    });
  });
});
