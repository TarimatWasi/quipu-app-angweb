import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Existing A3.5 header: preserve its spacing while the reference design is unavailable. */
@Component({
  selector: 'app-guest-form-header',
  imports: [RouterLink],
  template: `
    <a class="back" [routerLink]="['/admin/guests', guestId()]">
      <svg
        aria-hidden="true"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M15 6l-6 6 6 6" />
      </svg>
      {{ backLabel() }}
    </a>
    <div class="title">
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
      gap: 6px;
      padding: 8px 0;
      font-weight: 700;
      text-underline-offset: 4px;
    }
    .title {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: 6px 24px;
      margin-top: 6px;
    }
    h1 {
      margin: 0;
    }
    .today {
      margin: 0;
      font-size: 18px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class GuestFormHeaderComponent {
  readonly guestId = input.required<string>();
  readonly heading = input.required<string>();
  readonly backLabel = input.required<string>();
  readonly today = input.required<string>();
}
