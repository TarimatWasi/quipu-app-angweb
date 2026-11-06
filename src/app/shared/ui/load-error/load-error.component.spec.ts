import { render, screen } from '@testing-library/angular';
import { LoadErrorComponent } from './load-error.component';

describe('LoadErrorComponent (P-12 error de carga)', () => {
  it('is a red alert with «Reintentar», which asks to load again (H1 «Error de carga»)', async () => {
    const retry = vi.fn<() => void>();
    await render(LoadErrorComponent, {
      inputs: { message: 'No se pudo cargar tu estado de cuenta.' },
      on: { retry },
    });

    const alert = screen.getByRole('alert');
    expect(alert.querySelector('strong')?.textContent).toBe(
      'No se pudo cargar tu estado de cuenta.',
    );
    screen.getByRole('button', { name: 'Reintentar' }).click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('while retrying says «Cargando…» and cannot be pressed again', async () => {
    const retry = vi.fn<() => void>();
    await render(LoadErrorComponent, {
      inputs: { message: 'No se pudo cargar tu estado de pago.', retrying: true },
      on: { retry },
    });

    const button = screen.getByRole('button', { name: 'Cargando…' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    button.click();
    expect(retry).not.toHaveBeenCalled();
  });
});
