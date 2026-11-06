import { Component, input, output } from '@angular/core';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import type { NowPanel } from '../model/guest-list-texts';

/**
 * A3 «Lo que toca ahora»: how many guests have not activated their access, in a big figure, what
 * that blocks and «Ver sin activar», which the page turns into the filter Estado = Pendiente.
 */
@Component({
  selector: 'app-guests-now-panel',
  imports: [NowPanelComponent],
  template: `
    <app-now-panel
      headingId="guests-now-title"
      [figure]="panel().figure"
      [label]="panel().label"
      [text]="panel().text"
    >
      <button class="quipu-button quipu-button--primary" type="button" (click)="showPending.emit()">
        Ver sin activar
      </button>
    </app-now-panel>
  `,
})
export class GuestsNowPanelComponent {
  readonly panel = input.required<NowPanel>();
  /** «Ver sin activar»: the page filters Estado = Pendiente de activación. */
  readonly showPending = output();
}
