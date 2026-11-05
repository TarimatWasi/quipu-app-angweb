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
});
