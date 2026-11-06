import { render, screen, within } from '@testing-library/angular';
import { StepListComponent } from './step-list.component';

const squash = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

describe('StepListComponent (P-25)', () => {
  it('says each step and whether it is done, missing or missing but optional', async () => {
    await render(StepListComponent, {
      inputs: {
        label: 'Pasos de su registro',
        steps: [
          { label: 'Contraseña', done: true, optional: false },
          { label: 'Documentos', done: false, optional: true },
          { label: 'Consentimiento', done: false, optional: false },
        ],
      },
    });

    const list = screen.getByRole('list', { name: 'Pasos de su registro' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((item) => squash(item.textContent))).toEqual([
      'Contraseña: Hecho',
      'Documentos: Falta · opcional',
      'Consentimiento: Falta',
    ]);
    expect(items.map((item) => item.classList.contains('done'))).toEqual([true, false, false]);
    expect(items[0]?.querySelector('.mark svg')).not.toBeNull();
    expect(items[1]?.querySelector('.mark svg')).toBeNull();
    expect(items[0]?.querySelector('.mark')?.getAttribute('aria-hidden')).toBe('true');
  });
});
