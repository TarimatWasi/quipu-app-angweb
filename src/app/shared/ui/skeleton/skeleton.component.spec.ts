import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { SkeletonComponent, SKELETON_TIMING, SLOW_SERVER_NOTICE } from './skeleton.component';
import { SkeletonContentDirective } from './skeleton-content.directive';
import { SkeletonFieldsComponent } from './skeleton-fields.component';
import { SkeletonFactsComponent } from './skeleton-facts.component';
import { SkeletonCardsComponent } from './skeleton-cards.component';
import { SkeletonBlockComponent } from './skeleton-block.component';
@Component({
  imports: [
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonFieldsComponent,
    SkeletonFactsComponent,
    SkeletonCardsComponent,
  ],
  template: `<app-skeleton subject="Pagos" [announceSlow]="announceSlow()"
    ><ng-template appSkeletonContent
      ><app-skeleton-fields [labels]="['Monto', 'Medio']" /><app-skeleton-facts
        [labels]="['Nombre', 'Documento']" /><app-skeleton-cards
        [count]="2"
        [action]="true" /></ng-template
  ></app-skeleton>`,
})
class HostComponent {
  readonly announceSlow = signal(true);
}
describe('Skeleton loading region and patterns', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('is busy and shows the projected layout at once, hiding the decorative content', async () => {
    const { fixture, container } = await render(HostComponent);
    expect(screen.getByRole('region', { name: 'Cargando Pagos' }).getAttribute('aria-busy')).toBe(
      'true',
    );
    fixture.detectChanges();
    expect(container.querySelectorAll('app-skeleton-fields .quipu-field')).toHaveLength(2);
    expect(container.querySelectorAll('app-skeleton-facts > app-fact-tile')).toHaveLength(2);
    expect(container.querySelectorAll('app-skeleton-cards .card')).toHaveLength(2);
    expect(
      container.querySelector('app-skeleton-fields')?.closest('[aria-hidden="true"]'),
    ).toBeTruthy();
    expect(container.querySelector('input, button, a')).toBeNull();
  });
  it('announces the slow server outside the busy region only at 8 seconds', async () => {
    const { fixture, container } = await render(HostComponent);
    const live = container.querySelector('app-skeleton > output');
    expect(live?.textContent.trim()).toBe('');
    vi.advanceTimersByTime(7999);
    fixture.detectChanges();
    expect(screen.queryByText(SLOW_SERVER_NOTICE)).toBeNull();
    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(screen.getByText(SLOW_SERVER_NOTICE).closest('output')).toBe(live);
    expect(live?.closest('[aria-busy]')).toBeNull();
  });
  it('uses injectable timing and clears both timers on destruction', async () => {
    const { fixture, container } = await render(HostComponent, {
      providers: [
        { provide: SKELETON_TIMING, useValue: { showAfterMs: 50, slowNoticeAfterMs: 100 } },
      ],
    });
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    expect(container.querySelector('app-skeleton-fields')).toBeTruthy();
    vi.advanceTimersByTime(50);
    fixture.detectChanges();
    expect(screen.getByText(SLOW_SERVER_NOTICE)).toBeTruthy();
    fixture.destroy();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('allows a sibling region of the same request to own the slow announcement', async () => {
    const { fixture, container } = await render(HostComponent);
    fixture.componentInstance.announceSlow.set(false);
    vi.advanceTimersByTime(8000);
    fixture.detectChanges();
    expect(container.querySelector('app-skeleton-fields')).toBeTruthy();
    expect(screen.queryByText(SLOW_SERVER_NOTICE)).toBeNull();
    expect(screen.getByRole('region', { name: 'Cargando Pagos' }).getAttribute('aria-busy')).toBe(
      'true',
    );
  });
  it('centralizes the pulse and reduced motion on the decorative block', async () => {
    await render(SkeletonBlockComponent);
    const styles = Array.from(document.head.querySelectorAll('style'))
      .map((style) => style.textContent)
      .join('\n');
    expect(styles).toContain('quipu-duracion-pulso');
    expect(styles).toContain('prefers-reduced-motion');
    expect(styles).toMatch(/animation:\s*none/);
  });
});
