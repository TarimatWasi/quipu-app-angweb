import { render, screen } from '@testing-library/angular';
import { StatusBadgeComponent, StatusTone } from './status-badge.component';

describe('StatusBadgeComponent (P-08)', () => {
  // The states of T1 and H1 with the label each screen gives them.
  const cases: readonly (readonly [StatusTone, string])[] = [
    ['paid', 'Pagado'],
    ['review', 'Pendiente de revisión'],
    ['unpaid', 'No pagado'],
    ['overdue', 'Atrasado'],
    ['rejected', 'Rechazado'],
  ];

  it.each(cases)('%s says «%s» in words, with a decorative dot', async (tone, label) => {
    const { container } = await render(StatusBadgeComponent, { inputs: { tone, label } });

    const host = container;
    expect(host.textContent.trim()).toBe(label);
    expect(host.classList).toContain(`tone-${tone}`);
    const dot = host.querySelector('.dot');
    expect(dot?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.getByText(label)).toBeTruthy();
  });

  it('changes its tone when the state changes', async () => {
    const { container, fixture } = await render(StatusBadgeComponent, {
      inputs: { tone: 'review', label: 'En revisión' },
    });
    fixture.componentRef.setInput('tone', 'paid');
    fixture.componentRef.setInput('label', 'Pagado');
    await fixture.whenStable();

    expect(container.classList).toContain('tone-paid');
    expect(container.classList).not.toContain('tone-review');
  });
});
