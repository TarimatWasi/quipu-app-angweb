import { Component, input, output } from '@angular/core';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';

/**
 * What a screen says while it refreshes what it already shows (TAR-322): the load error with
 * «Reintentar» when the refresh failed and, if the screen asks for it, «Actualizando…» while it
 * goes on. It draws nothing when there is neither, so the screen does not repeat the conditions.
 */
@Component({
  selector: 'app-refresh-error',
  imports: [LoadErrorComponent],
  template: `
    @if (message(); as text) {
      <app-load-error [message]="text" [retrying]="refreshing()" (retry)="retry.emit()" />
    } @else if (progress() && refreshing()) {
      <output>Actualizando…</output>
    }
  `,
  host: { '[class.spaced]': 'spaced()' },
  styles: `
    :host {
      display: block;
    }
    :host(.spaced) {
      margin-top: 1.5rem;
    }
    :host:empty {
      display: none;
    }
  `,
})
export class RefreshErrorComponent {
  /** What failed («No se pudo cargar…»), or null while the refresh has not failed. */
  readonly message = input<string | null>(null);
  /** The refresh is going on (the button says «Cargando…»). */
  readonly refreshing = input(false);
  /** Say «Actualizando…» while it refreshes and nothing has failed. */
  readonly progress = input(false);
  /** The distance of a page notice under the title (the one of its load error). */
  readonly spaced = input(false);
  readonly retry = output();
}
