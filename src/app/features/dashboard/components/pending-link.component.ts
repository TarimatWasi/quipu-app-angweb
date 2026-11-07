import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { PendingLink } from '../model/dashboard-pending';

/**
 * A link of «Lo que toca ahora» or «También pendiente»: a page of the app, or — «Ver atrasados» —
 * the table of the same screen turned to Atrasado, which the page does (`overdue`).
 */
@Component({
  selector: 'app-pending-link',
  imports: [RouterLink],
  template: `
    @let target = link().to;
    @if (target.kind === 'route') {
      <a [class]="classes()" [routerLink]="target.link" [queryParams]="target.query">{{
        link().label
      }}</a>
    } @else {
      <button [class]="classes()" type="button" (click)="overdue.emit()">{{ link().label }}</button>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
  `,
})
export class PendingLinkComponent {
  readonly link = input.required<PendingLink>();
  /** The action of the panel is a primary button; the ones of the list are links. */
  readonly primary = input(false);
  /** «Ver atrasados» was pressed. */
  readonly overdue = output();

  protected classes(): string {
    return this.primary()
      ? 'quipu-button quipu-button--primary'
      : 'quipu-button quipu-button--tertiary';
  }
}
