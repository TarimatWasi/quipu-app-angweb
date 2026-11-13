import { TestBed } from '@angular/core/testing';
import { ChangeResourcesService } from '@core/changes/change-resources.service';
import { Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, screen, within } from '@testing-library/dom';
import type { BoundFunctions, queries } from '@testing-library/dom';
import { resetMockSettings, setUpMockBff } from '@core/mock/mock-bff.testing';
import type { MockScenario } from '@core/mock/mock-scenarios';
import { ToastService } from '@shared/ui/toast/toast.service';
import { FinanceComponent } from './finance.component';

type Scope = BoundFunctions<typeof queries>;

/** The first of the buttons that match: the table and its cards on a phone are both in the page. */
function first(buttons: readonly HTMLElement[]): HTMLElement {
  const [button] = buttons;
  if (button === undefined) throw new Error('no button');
  return button;
}

const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();

/** The page over the simulated BFF: what it shows is what the BFF answers, dialogs included. */
async function setup(scenario: MockScenario = 'normal') {
  const mock = setUpMockBff(scenario);
  await mock.signIn('admin');
  const toast = vi.spyOn(ToastService.prototype, 'show');
  const harness = await RouterTestingHarness.create();
  TestBed.inject(Router).resetConfig([{ path: 'admin/finance', component: FinanceComponent }]);
  await harness.navigateByUrl('/admin/finance');
  const settle = async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    // A resource keeps the app unstable while it reads: tick instead of waiting for it.
    TestBed.tick();
  };
  await settle();
  const page = () => within(harness.routeNativeElement ?? document.body);
  const click = async (element: HTMLElement) => {
    fireEvent.click(element);
    await settle();
  };
  const type = async (root: Scope, label: string, value: string) => {
    fireEvent.input(root.getByLabelText(label), { target: { value } });
    await settle();
  };
  const choose = async (root: Scope, label: string, value: string) => {
    const select = root.getByLabelText(label);
    fireEvent.change(select, { target: { value } });
    fireEvent.input(select);
    await settle();
  };
  const titles = () =>
    page()
      .queryAllByRole('rowheader')
      .map((header) => text(header.querySelector('strong') ?? header));
  const action = (name: string) => first(page().getAllByRole('button', { name }));
  const dialog = async (name: string | RegExp) =>
    within(await screen.findByRole('dialog', { name }));
  return { mock, toast, page, click, type, choose, titles, dialog, action, settle };
}

afterEach(() => {
  vi.restoreAllMocks();
  resetMockSettings();
});

describe('A6 «Finanzas»', () => {
  it('keeps an open expense draft when finance data changes', async () => {
    const ui = await setup();
    await ui.click(ui.page().getByRole('button', { name: 'Nuevo egreso' }));
    const form = await ui.dialog('Nuevo egreso');
    await ui.type(form, 'Descripción (opcional)', 'Mi borrador de egreso');
    TestBed.inject(ChangeResourcesService).changed(['admin.finance']);
    await ui.settle();
    expect(form.getByLabelText('Descripción (opcional)')).toHaveProperty(
      'value',
      'Mi borrador de egreso',
    );
    expect(ui.page().getByText('Hay cambios en la información de esta pantalla.')).toBeTruthy();
    await ui.click(form.getByRole('button', { name: 'Cancelar' }));
    await ui.click(await ui.page().findByRole('button', { name: 'Volver a cargar' }));
    await ui.settle();
    expect(ui.page().queryByText('Hay cambios en la información de esta pantalla.')).toBeNull();
  });
  it('says what waits to be refunded, the balance of the month and its expenses, the biggest first', async () => {
    const { page, titles } = await setup();

    const panel = page().getByRole('region', { name: 'Lo que toca ahora' });
    expect(text(panel)).toContain('2');
    expect(text(panel)).toContain('devoluciones por registrar');
    expect(text(panel)).toContain('S/ 85.00 que pagaron de más');
    const balance = text(page().getByRole('region', { name: /^Balance de / }));
    expect(balance).toContain('Ingresos');
    expect(balance).toContain('Egresos');
    expect(balance).toContain('S/ 1,165.50');
    expect(balance).toContain('5 egresos');
    expect(balance).toContain('Neto del mes');
    expect(titles()[0]).toBe('Luz, recibo del mes');
    expect(titles()).toHaveLength(5);
    expect(page().getByText('Mostrando 5 de 5')).toBeTruthy();
  });

  it('shows the fines and the refunds of the month in their own kind, with what each has', async () => {
    const { page, click, titles } = await setup();

    await click(page().getByRole('button', { name: 'Multas' }));
    expect(titles()).toEqual(['Carmen Rosa Quispe Huamán', 'Luis Alberto Huamán Ccori']);
    expect(page().queryByRole('button', { name: /Editar/ })).toBeNull();
    // The table and its cards on a phone are both in the page: two buttons per fine.
    expect(page().getAllByRole('button', { name: /Eliminar/ })).toHaveLength(4);

    await click(page().getByRole('button', { name: 'Devoluciones' }));
    expect(page().getByText('No hay devoluciones en', { exact: false })).toBeTruthy();
    expect(page().queryByRole('button', { name: /Eliminar/ })).toBeNull();
  });

  it('opens another month with its own balance and says when it has nothing', async () => {
    const { page, choose, settle } = await setup();

    await choose(page(), 'Mes', '2025-12');
    await settle();

    expect(text(page().getByRole('region', { name: /^Balance de diciembre 2025/ }))).toContain(
      'S/ 0.00',
    );
    expect(page().getByText('No hay egresos en diciembre.')).toBeTruthy();
  });

  it('registers an expense in a dialog: category, amount and month, and the balance is read again', async () => {
    const { page, click, type, dialog, toast, titles } = await setup();
    await click(page().getByRole('button', { name: 'Nuevo egreso' }));
    const form = await dialog('Nuevo egreso');

    await click(form.getByRole('button', { name: 'Servicios' }));
    await type(form, 'Monto', '85.50');
    await type(form, 'Descripción (opcional)', 'Cambio de chapa');
    expect(form.getByText(/Cuenta en los egresos de/)).toBeTruthy();
    await click(form.getByRole('button', { name: 'Registrar egreso' }));

    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Egreso registrado.', { tone: 'success' });
    });
    await vi.waitFor(() => {
      expect(titles()).toContain('Cambio de chapa');
    });
    expect(text(page().getByRole('region', { name: /^Balance de / }))).toContain('S/ 1,251.00');
  });

  it('points at the category and the amount when they are missing, in the words of the catalog', async () => {
    const { page, click, type, dialog } = await setup();
    await click(page().getByRole('button', { name: 'Nuevo egreso' }));
    const form = await dialog('Nuevo egreso');

    await click(form.getByRole('button', { name: 'Registrar egreso' }));

    expect(form.getByText('Elige una categoría')).toBeTruthy();
    expect(form.getByText('El monto debe ser mayor a 0')).toBeTruthy();
    await type(form, 'Monto', '0');
    expect(form.getByText('El monto debe ser mayor a 0')).toBeTruthy();
  });

  it('edits an expense starting from what it has, and says the neto was recalculated', async () => {
    const { click, type, dialog, toast, page, action } = await setup();
    await click(action('Editar Internet'));
    const form = await dialog('Editar egreso');

    expect(form.getByLabelText<HTMLInputElement>('Monto').value).toBe('150.00');
    await type(form, 'Monto', '160');
    await click(form.getByRole('button', { name: 'Guardar cambios' }));

    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Egreso actualizado. El neto se recalculó.', {
        tone: 'success',
      });
    });
    await vi.waitFor(() => {
      expect(text(page().getByRole('region', { name: /^Balance de / }))).toContain('S/ 1,175.50');
    });
  });

  it('asks the user to reload when the expense changed meanwhile (409)', async () => {
    const { click, type, dialog, action } = await setup('conflict');
    await click(action('Editar Internet'));
    const form = await dialog('Editar egreso');

    await type(form, 'Monto', '160');
    await click(form.getByRole('button', { name: 'Guardar cambios' }));

    expect(await screen.findByRole('alertdialog', { name: 'El egreso cambió' })).toBeTruthy();
  });

  it('asks before deleting an expense and says what leaves the balance', async () => {
    const { page, click, dialog, toast, titles, action } = await setup();
    await click(action('Eliminar Internet'));
    const confirm = await dialog('¿Eliminar este egreso?');

    expect(confirm.getByText('Internet')).toBeTruthy();
    expect(confirm.getByText(/Deja de restar en el balance de/)).toBeTruthy();
    expect(titles()).toContain('Internet');
    await click(confirm.getByRole('button', { name: 'Eliminar egreso' }));

    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Egreso eliminado. El neto se recalculó.', {
        tone: 'success',
      });
    });
    await vi.waitFor(() => {
      expect(titles()).not.toContain('Internet');
    });
    expect(page().getByText('Mostrando 4 de 4')).toBeTruthy();
  });

  it('says the expense no longer exists when it was deleted meanwhile, and reads the list again', async () => {
    const { mock, click, dialog, toast, titles, action } = await setup();
    await click(action('Eliminar Internet'));
    const confirm = await dialog('¿Eliminar este egreso?');
    mock.bff.db.data.expenses.splice(0);

    await click(confirm.getByRole('button', { name: 'Eliminar egreso' }));

    expect(await confirm.findByText('El gasto no existe.')).toBeTruthy();
    await click(confirm.getByRole('button', { name: 'Cancelar' }));
    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith('El gasto no existe.', { tone: null });
    });
    await vi.waitFor(() => {
      expect(titles()).not.toContain('Internet');
    });
  });

  it('keeps the expense when the deletion is cancelled', async () => {
    const { click, dialog, titles, action } = await setup();
    await click(action('Eliminar Internet'));
    const confirm = await dialog('¿Eliminar este egreso?');

    await click(confirm.getByRole('button', { name: 'Cancelar' }));

    await vi.waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(titles()).toContain('Internet');
  });

  it('registers a fine for any guest, active or not, and then deletes it asking first', async () => {
    const { page, click, type, choose, dialog, toast, titles } = await setup();
    await click(page().getByRole('button', { name: 'Multas' }));
    await click(page().getByRole('button', { name: 'Nueva multa' }));
    const form = await dialog('Nueva multa');

    expect(within(form.getByLabelText('Huésped')).getAllByRole('option').length).toBeGreaterThan(5);
    expect(form.getAllByText(/Inactivo/, { selector: 'option' }).length).toBeGreaterThan(0);
    await click(form.getByRole('button', { name: 'Registrar multa' }));
    expect(form.getByText('Elige un huésped', { selector: '.quipu-field-error' })).toBeTruthy();
    await choose(form, 'Huésped', form.getAllByRole('option')[1]?.getAttribute('value') ?? '');
    await type(form, 'Monto', '45.50');
    await type(form, 'Motivo (opcional)', 'Llave perdida');
    await click(form.getByRole('button', { name: 'Registrar multa' }));

    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Multa registrada.', { tone: 'success' });
    });
    await vi.waitFor(() => {
      expect(titles()).toHaveLength(3);
    });
    await click(first(page().getAllByRole('button', { name: /Eliminar/ })));
    const confirm = await dialog('¿Eliminar esta multa?');
    expect(confirm.getByText(/Para corregirla, elimínala y regístrala de nuevo/)).toBeTruthy();
    await click(confirm.getByRole('button', { name: 'Eliminar multa' }));
    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith('Multa eliminada. El neto se recalculó.', {
        tone: 'success',
      });
    });
  });

  it('registers a refund from the notice, with the guest and all its credit chosen', async () => {
    const { page, click, type, dialog, toast, titles } = await setup();
    await click(
      within(page().getByRole('region', { name: 'Lo que toca ahora' })).getByRole('button', {
        name: 'Registrar devolución',
      }),
    );
    const form = await dialog('Registrar devolución');

    expect(
      form.getByLabelText<HTMLSelectElement>('Huésped').selectedOptions[0]?.textContent,
    ).toContain('S/ ');
    expect(form.getByLabelText<HTMLInputElement>('Monto').value).toMatch(/^\d+\.\d{2}$/);
    expect(form.getByText(/Crédito por devolver: S\/ /)).toBeTruthy();
    await click(form.getByRole('button', { name: 'Yape' }));
    expect(form.getByLabelText<HTMLInputElement>('Medio de devolución').value).toBe('Yape');
    await type(form, 'Nota (opcional)', 'Operación 123');
    await click(form.getByRole('button', { name: 'Registrar devolución' }));

    await vi.waitFor(() => {
      expect(toast).toHaveBeenCalledWith(
        expect.stringMatching(/^Devolución a .+ registrada\. El balance de .+ se recalculó\.$/),
        { tone: 'success' },
      );
    });
    await vi.waitFor(() => {
      expect(text(page().getByRole('region', { name: 'Lo que toca ahora' }))).toContain(
        'devolución por registrar',
      );
      expect(text(page().getByRole('region', { name: 'Lo que toca ahora' }))).not.toContain(
        'devoluciones',
      );
    });
    expect(page().getByRole('button', { name: 'Devoluciones' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(titles()).toHaveLength(1);
  });

  it('does not let a refund pass the credit and asks how it was returned', async () => {
    const { page, click, type, dialog } = await setup();
    await click(
      within(page().getByRole('region', { name: 'Lo que toca ahora' })).getByRole('button', {
        name: 'Registrar devolución',
      }),
    );
    const form = await dialog('Registrar devolución');

    await type(form, 'Monto', '9999');
    await click(form.getByRole('button', { name: 'Registrar devolución' }));

    expect(form.getByText(/El monto no puede pasar el crédito de S\/ /)).toBeTruthy();
    expect(form.getByText('Escribe cómo devolviste el dinero')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('says the month is empty, and the panel says nothing waits without a refund button (scenario «empty»)', async () => {
    const { page, titles } = await setup('empty');

    expect(page().getByRole('region', { name: 'Lo que toca ahora' }).textContent).toContain(
      'No hay dinero pendiente de devolver.',
    );
    expect(page().queryByRole('button', { name: 'Registrar devolución' })).toBeNull();
    expect(titles()).toEqual([]);
    expect(page().getByText(/No hay egresos en/)).toBeTruthy();
  });

  it('says it could not load and asks again on «Reintentar» (scenario «load-error»)', async () => {
    const { page } = await setup('load-error');

    expect(text(page().getByRole('alert'))).toContain('No se pudo cargar Finanzas.');
    expect(page().getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});
