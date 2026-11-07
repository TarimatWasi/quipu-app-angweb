import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { within } from '@testing-library/dom';
import { NowPanelComponent } from './now-panel.component';

@Component({
  imports: [NowPanelComponent],
  template: `
    <app-now-panel [figure]="4" label="pagos por revisar" text="El más antiguo es de Pedro Ccori.">
      <a href="/x">Revisar el más antiguo</a>
    </app-now-panel>
  `,
})
class HostComponent {}

@Component({
  imports: [NowPanelComponent],
  template: `<app-now-panel
    figure="S/ 1,450.00"
    label="en cobros atrasados"
    text="Venció."
    [urgent]="true"
  />`,
})
class UrgentHostComponent {}

describe('NowPanelComponent', () => {
  it('names its region and shows the figure, what it counts, the context and the action', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
    const ui = within(fixture.nativeElement as HTMLElement);

    const region = ui.getByRole('region', { name: 'Lo que toca ahora' });
    expect(region.textContent).toContain('4');
    expect(region.textContent).toContain('pagos por revisar');
    expect(region.textContent).toContain('El más antiguo es de Pedro Ccori.');
    expect(within(region).getByRole('link', { name: 'Revisar el más antiguo' })).toBeTruthy();
  });

  it('takes an amount or a word as its figure and marks it urgent in red ink', async () => {
    const fixture = TestBed.createComponent(UrgentHostComponent);
    await fixture.whenStable();

    const figure = (fixture.nativeElement as HTMLElement).querySelector('.figure');

    expect(figure?.textContent).toBe('S/ 1,450.00');
    expect(figure?.classList.contains('urgent')).toBe(true);
  });
});
