import { render, screen } from '@testing-library/angular';
import { ShowMoreComponent } from './show-more.component';

describe('ShowMoreComponent (P-22)', () => {
  it('sums up what is shown of what is loaded and asks for the next page', async () => {
    const more = vi.fn<() => void>();
    const { container } = await render(ShowMoreComponent, {
      inputs: { shown: 12, loaded: 20, hasMore: true },
      on: { more },
    });

    expect(container.querySelector('output')?.textContent.trim()).toBe(
      'Mostrando 12 de 20 cargados',
    );
    const button = screen.getByRole('button', { name: 'Mostrar más' });
    expect(button.classList).toContain('quipu-button--secondary');
    button.click();
    expect(more).toHaveBeenCalledTimes(1);
  });

  it('while the page loads the button says «Cargando…» and cannot ask twice', async () => {
    const more = vi.fn<() => void>();
    await render(ShowMoreComponent, {
      inputs: { shown: 20, loaded: 20, hasMore: true, loading: true },
      on: { more },
    });

    const button = screen.getByRole('button', { name: 'Cargando…' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    button.click();
    expect(more).not.toHaveBeenCalled();
  });

  it('the button goes away when there are no more pages; the summary stays', async () => {
    await render(ShowMoreComponent, { inputs: { shown: 45, loaded: 45, hasMore: false } });

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Mostrando 45 de 45 cargados')).toBeTruthy();
  });
});
