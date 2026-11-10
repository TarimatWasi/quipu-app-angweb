import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { fireEvent, screen, within } from '@testing-library/dom';
import { Observable, of, throwError } from 'rxjs';
import { ToastService } from '@shared/ui/toast/toast.service';
import { AdminEnvironmentsService } from '../data/admin-environments.service';
import type { EnvironmentChanges } from '../data/admin-environments.service';
import type { Environment } from '../model/environment';
import { contractOf, environmentOf } from '../model/environment.testing';
import { EnvironmentFormComponent } from './environment-form.component';

@Component({ template: 'lista' })
class ListStubComponent {}

const text = (element: Element) => element.textContent.replace(/\s+/g, ' ').trim();
const conflict = () =>
  new HttpErrorResponse({ status: 409, error: { code: 'CONCURRENT_MODIFICATION', message: 'x' } });

async function setup(path: string, loaded: Observable<Environment> = of(environmentOf())) {
  const api = {
    get: vi.fn(() => loaded),
    create: vi.fn((input: { code: string; type: string }) =>
      of(environmentOf({ code: input.code })),
    ),
    update: vi.fn((_id: string, changes: EnvironmentChanges) =>
      of(environmentOf({ code: changes.code ?? '109' })),
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'admin/environments', component: ListStubComponent },
        { path: 'admin/environments/new', component: EnvironmentFormComponent },
        { path: 'admin/environments/:id/edit', component: EnvironmentFormComponent },
      ]),
      { provide: AdminEnvironmentsService, useValue: api },
    ],
  });
  // Before the navigation: an environment that is not found shows its toast while it loads.
  const toast = vi.spyOn(ToastService.prototype, 'show');
  const harness = await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  await router.navigateByUrl(path);
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
  const type = async (label: string, value: string) => {
    fireEvent.input(page().getByLabelText(label), { target: { value } });
    await settle();
  };
  const save = (label = /Crear ambiente|Guardar cambios/) =>
    page().getByRole('button', { name: label });
  return { api, router, toast, page, click, type, save, settle };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('A2.1 «Nuevo ambiente»', () => {
  it('shows what will be created and asks for the type before it can be created', async () => {
    const { page, save, type, click } = await setup('/admin/environments/new');

    expect(page().getByRole('heading', { level: 1 }).textContent).toBe('Nuevo ambiente');
    expect(text(page().getByRole('complementary'))).toContain('Falta el código');
    expect(save().hasAttribute('disabled')).toBe(true);
    expect(text(page().getByText('Elige el tipo para crear el ambiente.'))).toBe(
      'Elige el tipo para crear el ambiente.',
    );

    await type('Código', ' C6 ');
    await click(page().getByRole('button', { name: 'Cabaña' }));

    expect(save().hasAttribute('disabled')).toBe(false);
    expect(text(page().getByRole('complementary'))).toContain('C6');
    expect(page().getByRole('button', { name: 'Cabaña' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('creates it, goes back to A2 and says so', async () => {
    const { api, router, toast, page, click, type, save } = await setup('/admin/environments/new');

    await type('Código', ' C6 ');
    await click(page().getByRole('button', { name: 'Cabaña' }));
    await click(save());

    expect(api.create).toHaveBeenCalledWith({ code: 'C6', type: 'CABIN' });
    await vi.waitFor(() => {
      expect(router.url).toBe('/admin/environments');
    });
    expect(toast).toHaveBeenCalledWith('Ambiente creado.', { tone: 'success' });
  });

  it('points at the code when it is empty, badly written or taken', async () => {
    const { api, page, click, type, save } = await setup('/admin/environments/new');
    await click(page().getByRole('button', { name: 'Habitación' }));

    await click(save());
    expect(page().getByText('Escribe el código del ambiente.')).toBeTruthy();
    expect(page().getByLabelText('Código').getAttribute('aria-invalid')).toBe('true');

    await type('Código', '1@3');
    await click(save());
    expect(page().getByText('Usa solo letras, números, espacio y . _ / -')).toBeTruthy();
    expect(api.create).not.toHaveBeenCalled();

    api.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 409,
            error: { code: 'ENVIRONMENT_CODE_TAKEN', message: 'x', field: 'code' },
          }),
      ),
    );
    await type('Código', '201');
    await click(save());
    expect(page().getByText('Ya existe un ambiente con ese código')).toBeTruthy();
  });

  it('shows another failure in red above the buttons', async () => {
    const { api, page, click, type, save } = await setup('/admin/environments/new');
    api.create.mockReturnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 500,
            error: { code: 'UNEXPECTED_ERROR', message: 'Algo salió mal.' },
          }),
      ),
    );
    await type('Código', 'C7');
    await click(page().getByRole('button', { name: 'Cabaña' }));

    await click(save());

    expect(text(page().getByRole('alert'))).toBe('Algo salió mal.');
  });
});

describe('A2.4 «Editar ambiente»', () => {
  const path = '/admin/environments/e1/edit';

  it('shows how it is today, and nothing to save until something changes', async () => {
    const { api, page, save, type } = await setup(
      path,
      of(environmentOf({ occupant: contractOf() })),
    );

    expect(api.get).toHaveBeenCalledWith('e1');
    expect(page().getByRole('heading', { level: 1 }).textContent).toBe('Editar ambiente 109');
    const side = text(page().getByRole('complementary'));
    expect(side).toContain('Activo');
    expect(side).toContain('Lucía Paredes, contrato hasta 31 mar 2027');
    expect(page().getByLabelText<HTMLInputElement>('Código').value).toBe('109');
    expect(save().hasAttribute('disabled')).toBe(true);
    expect(page().getByText('Cambia el código o el tipo para guardar.')).toBeTruthy();

    await type('Código', '109-A');
    expect(save().hasAttribute('disabled')).toBe(false);
  });

  it('sends only what changed with the version it loaded, then goes back with a toast', async () => {
    const { api, router, toast, type, save, click } = await setup(path);

    await type('Código', ' 109-A ');
    await click(save());

    expect(api.update).toHaveBeenCalledWith('e1', { version: 3, code: '109-A' });
    await vi.waitFor(() => {
      expect(router.url).toBe('/admin/environments');
    });
    expect(toast).toHaveBeenCalledWith('Ambiente actualizado.', { tone: 'success' });
  });

  it('says «El ambiente cambió» on a conflict and reloads it when asked, saving nothing', async () => {
    const { api, page, type, save, click, settle } = await setup(path);
    api.update.mockReturnValueOnce(throwError(conflict));
    await type('Código', '109-A');

    await click(save());
    const dialog = within(await screen.findByRole('alertdialog', { name: 'El ambiente cambió' }));
    expect(dialog.getByRole('button', { name: 'Volver a Ambientes' })).toBeTruthy();
    api.get.mockReturnValue(of(environmentOf({ code: '109-B', version: 4 })));
    await click(dialog.getByRole('button', { name: 'Volver a cargar' }));
    await settle();

    await vi.waitFor(() => {
      expect(page().getByLabelText<HTMLInputElement>('Código').value).toBe('109-B');
    });
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('says so over the form when reloading after a conflict fails, and asks again (Codex en #187)', async () => {
    const { api, page, type, save, click, settle } = await setup(path);
    api.update.mockReturnValueOnce(throwError(conflict));
    await type('Código', '109-A');
    await click(save());
    const dialog = within(await screen.findByRole('alertdialog', { name: 'El ambiente cambió' }));
    api.get.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 500 })));
    await click(dialog.getByRole('button', { name: 'Volver a cargar' }));
    await settle();

    await vi.waitFor(() => {
      expect(page().getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    });
    expect(page().getByLabelText<HTMLInputElement>('Código')).toBeTruthy();
    expect(save().hasAttribute('disabled')).toBe(true);

    api.get.mockReturnValue(of(environmentOf({ code: '109-B', version: 4 })));
    await click(page().getByRole('button', { name: 'Reintentar' }));
    await settle();
    await vi.waitFor(() => {
      expect(page().getByLabelText<HTMLInputElement>('Código').value).toBe('109-B');
    });
  });

  it('goes back to A2 with a toast when it does not exist any more', async () => {
    const { router, toast } = await setup(
      path,
      throwError(
        () => new HttpErrorResponse({ status: 404, error: { code: 'RESOURCE_NOT_FOUND' } }),
      ),
    );

    await vi.waitFor(() => {
      expect(router.url).toBe('/admin/environments');
    });
    expect(toast).toHaveBeenCalledWith('No se encontró el registro.');
  });

  it('says it could not load and asks again on «Reintentar»', async () => {
    const { api, page, click } = await setup(
      path,
      throwError(() => new Error('down')),
    );
    api.get.mockReturnValue(of(environmentOf()));

    expect(text(page().getByRole('alert'))).toContain('No se pudieron cargar los ambientes.');
    await click(page().getByRole('button', { name: 'Reintentar' }));

    expect(page().getByLabelText<HTMLInputElement>('Código').value).toBe('109');
  });
});
