import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { DialogActionKind, MoreAction } from '../model/more-actions';

/**
 * A3.2 «Más acciones»: a list of links and buttons, each with its hint in secondary ink. A link
 * goes where it says; a button asks the page for its dialog (`act`).
 */
@Component({
  selector: 'app-more-actions',
  imports: [RouterLink],
  template: `
    <section aria-labelledby="more-title">
      <h2 id="more-title">Más acciones</h2>
      <ul>
        @for (action of actions(); track action.label) {
          <li>
            @switch (action.kind) {
              @case ('link') {
                <a [routerLink]="linkOf(action)">{{ action.label }}</a>
              }
              @default {
                <button
                  class="quipu-button quipu-button--tertiary"
                  type="button"
                  [disabled]="busy()"
                  (click)="emit(action)"
                >
                  {{ action.label }}
                </button>
              }
            }
            @if (action.hint; as hint) {
              <span class="hint">{{ hint }}</span>
            }
          </li>
        }
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      margin: 0 0 0.5rem;
    }
    ul {
      display: grid;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0 0.625rem;
    }
    a {
      display: inline-flex;
      align-items: center;
      min-height: var(--quipu-toque);
      font: var(--mat-sys-label-large);
    }
    .hint {
      font: var(--mat-sys-body-small);
      color: var(--quipu-tinta-secundaria);
    }
  `,
})
export class MoreActionsComponent {
  readonly actions = input.required<readonly MoreAction[]>();
  /** An action of the page is running: the buttons wait. */
  readonly busy = input(false);
  readonly act = output<DialogActionKind>();

  protected linkOf(action: MoreAction): readonly string[] | null {
    return action.kind === 'link' ? action.link : null;
  }

  protected emit(action: MoreAction): void {
    if (action.kind !== 'link') this.act.emit(action.kind);
  }
}
