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

  it('marks the step the person is on and what a done step adds', async () => {
    await render(StepListComponent, {
      inputs: {
        label: 'Tu registro',
        steps: [
          { label: 'Contraseña', done: true, optional: false },
          { label: 'Documentos', done: true, optional: true, detail: '2 archivos' },
          { label: 'Consentimiento', done: false, optional: false, current: true },
          { label: 'Foto', done: false, optional: true, current: true },
        ],
      },
    });

    const items = within(screen.getByRole('list', { name: 'Tu registro' })).getAllByRole(
      'listitem',
    );
    expect(items.map((item) => squash(item.textContent))).toEqual([
      'Contraseña: Hecho',
      'Documentos: Hecho · 2 archivos',
      'Consentimiento: Ahora',
      'Foto: Ahora · opcional',
    ]);
    expect(items.map((item) => item.getAttribute('aria-current'))).toEqual([
      null,
      null,
      'step',
      'step',
    ]);
  });

  it('draws the same list as a row of bars for a phone', async () => {
    await render(StepListComponent, {
      inputs: {
        label: 'Tu registro',
        variant: 'bar',
        steps: [{ label: 'Contraseña', done: true, optional: false }],
      },
    });

    expect(screen.getByRole('list', { name: 'Tu registro' }).classList.contains('bar')).toBe(true);
  });
});
