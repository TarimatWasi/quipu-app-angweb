import { render, screen, within } from '@testing-library/angular';
import { StatusFilterComponent } from './status-filter.component';
import type { StatusSegment } from './status-filter.component';

const SEGMENTS: readonly StatusSegment[] = [
  { key: 'OVERDUE', label: 'Atrasado', count: 1, tone: 'overdue' },
  { key: 'PAID', label: 'Pagado', count: 3, tone: 'paid' },
];

async function setup(selected: string | null = null) {
  const chosen = vi.fn<(key: string | null) => void>();
  const view = await render(StatusFilterComponent, {
    inputs: { segments: SEGMENTS, selected, noun: 'meses' },
    on: { chosen },
  });
  return { chosen, view };
}

describe('StatusFilterComponent (P-05, P-06)', () => {
  it('splits the bar in proportion and names each segment with its state and count', async () => {
    await setup();

    const bar = screen.getByRole('group', { name: 'Estados de los meses' });
    const segments = within(bar).getAllByRole('button');
    expect(segments.map((segment) => segment.getAttribute('aria-label'))).toEqual([
      'Mostrar solo Atrasado (1)',
      'Mostrar solo Pagado (3)',
    ]);
    expect(segments.map((segment) => segment.style.flexGrow)).toEqual(['1', '3']);
    expect(segments[0]?.classList.contains('tone-overdue')).toBe(true);
    expect(segments.every((segment) => segment.getAttribute('aria-pressed') === 'false')).toBe(
      true,
    );
  });

  it('shows «Todos» and one tile per state with its figure, «Todos» pressed', async () => {
    await setup();

    const tiles = within(screen.getByRole('group', { name: 'Filtrar meses por estado' }));
    const buttons = tiles.getAllByRole('button');
    expect(buttons.map((button) => button.textContent.replace(/\s+/g, ' ').trim())).toEqual([
      'Todos: 4',
      'Atrasado: 1',
      'Pagado: 3',
    ]);
    expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  it('emits the state of a segment or a tile, and null for «Todos» or the state in force', async () => {
    const { chosen } = await setup('PAID');

    screen.getByRole('button', { name: 'Mostrar solo Atrasado (1)' }).click();
    expect(chosen).toHaveBeenLastCalledWith('OVERDUE');
    screen.getByRole('button', { name: 'Mostrar solo Pagado (3)' }).click();
    expect(chosen).toHaveBeenLastCalledWith(null);
    const tiles = within(screen.getByRole('group', { name: 'Filtrar meses por estado' }));
    tiles.getByRole('button', { name: /Atrasado/ }).click();
    expect(chosen).toHaveBeenLastCalledWith('OVERDUE');
    tiles.getByRole('button', { name: /Todos/ }).click();
    expect(chosen).toHaveBeenLastCalledWith(null);
    expect(chosen).toHaveBeenCalledTimes(4);
    expect(tiles.getByRole('button', { name: /Pagado/ }).getAttribute('aria-pressed')).toBe('true');
  });
});
