import { render, screen } from '@testing-library/angular';
import { FactTileComponent } from './fact-tile.component';

describe('FactTileComponent (P-11)', () => {
  it('pairs the label with its value as a term and its description (T1 «Tu estadía»)', async () => {
    const { container } = await render(FactTileComponent, {
      inputs: { label: 'Monto acordado', value: 'S/ 420.00' },
    });

    expect(screen.getByRole('term').textContent).toBe('Monto acordado');
    expect(screen.getByRole('definition').textContent).toBe('S/ 420.00');
    expect(container.classList).toContain('surface-paper');
  });

  it('can sit on dark stone', async () => {
    const { container } = await render(FactTileComponent, {
      inputs: { label: 'Noches', value: '8', surface: 'stone' },
    });

    expect(container.classList).toContain('surface-stone');
    expect(container.classList).not.toContain('surface-paper');
  });
});
