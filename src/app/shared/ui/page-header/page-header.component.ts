import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { formatLimaToday } from './lima-today';

/**
 * P-02 Fila de título: the h1 on the left and the day in Lima on the right, without greeting or
 * subtitle. A child screen passes `backLink` and `backTo` to get «Volver a …» above the h1.
 * Presentation only: the link is a plain RouterLink, nothing is injected.
 */
@Component({
  selector: 'app-page-header',
  imports: [RouterLink],
  template: `
    @if (backLink(); as link) {
      <a class="back" [routerLink]="link" [queryParams]="backQuery()">
        <svg
          aria-hidden="true"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Volver a {{ backTo() }}
      </a>
    }
    <div class="row">
      <h1>{{ heading() }}</h1>
      <p class="today">{{ today() }}</p>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .back {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      min-height: 44px;
      margin-bottom: 0.375rem;
      color: var(--quipu-chilca);
      font-size: 1rem;
      font-weight: 700;
      text-decoration: none;
    }
    .back:hover {
      text-decoration: underline;
      text-underline-offset: 4px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 0.375rem 1.5rem;
    }
    /* The size of h1 is the global one (styles.scss): here only its place in the row. */
    h1 {
      margin: 0;
    }
    .today {
      margin: 0;
      font-size: 1.125rem;
      color: var(--quipu-tinta-secundaria);
      font-variant-numeric: tabular-nums;
    }
  `,
})
export class PageHeaderComponent {
  readonly heading = input.required<string>();
  /** The instant whose day in Lima is shown; by default, when the page opens. */
  readonly date = input<Date>(new Date());
  /** The parent of a child screen; without it there is no «Volver a …». */
  readonly backLink = input<string | readonly unknown[] | null>(null);
  /** Name of the parent, as in «Volver a Huéspedes». */
  readonly backTo = input('');
  /** The query of the back link, such as the view of a list to return to (`?vista=`). */
  readonly backQuery = input<Readonly<Record<string, string>> | null>(null);

  protected readonly today = computed(() => formatLimaToday(this.date()));
}
