import { render, screen } from '@testing-library/angular';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent (P-12 vacío)', () => {
  it('says what is happening and what to do, without «Quitar filtros» (T1 «Sin estadía»)', async () => {
    await render(
      `<app-empty-state heading="Aún no tienes una estadía registrada">
        Cuando la administración la registre, aquí verás sus fechas y el monto.
      </app-empty-state>`,
      { imports: [EmptyStateComponent] },
    );

    const region = screen.getByRole('region', { name: 'Aún no tienes una estadía registrada' });
    expect(region.textContent).toContain('Cuando la administración la registre');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'Aún no tienes una estadía registrada',
    );
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('after a filter without results offers «Quitar filtros», which asks to clear them', async () => {
    const clearFilters = vi.fn<() => void>();
    await render(EmptyStateComponent, {
      inputs: { heading: 'Ningún pago coincide', filtered: true },
      on: { clearFilters },
    });

    screen.getByRole('button', { name: 'Quitar filtros' }).click();

    expect(clearFilters).toHaveBeenCalledTimes(1);
  });

  it('gives each block its own heading id', async () => {
    const { container } = await render(
      `<app-empty-state heading="Uno" /><app-empty-state heading="Dos" />`,
      { imports: [EmptyStateComponent] },
    );

    const ids = [...container.querySelectorAll('h2')].map((h2) => h2.id);
    expect(new Set(ids).size).toBe(2);
    expect(screen.getByRole('region', { name: 'Dos' })).toBeTruthy();
  });

  it('puts a projected action under the text (A3.2 «No encontramos a este huésped.»)', async () => {
    await render(
      `<app-empty-state heading="No encontramos a este huésped.">
        <a emptyAction href="/admin/guests">Volver a Huéspedes</a>
      </app-empty-state>`,
      { imports: [EmptyStateComponent] },
    );

    const region = screen.getByRole('region', { name: 'No encontramos a este huésped.' });
    const link = screen.getByRole('link', { name: 'Volver a Huéspedes' });
    expect(link.closest('.action')).not.toBeNull();
    expect(region.contains(link)).toBe(true);
    expect(region.querySelector('.text')?.textContent.trim()).toBe('');
  });
});
