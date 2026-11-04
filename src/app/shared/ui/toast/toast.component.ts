import { Component, effect, inject, InjectionToken, input, output } from '@angular/core';

/** How long a toast without an action stays (P-17). */
export const TOAST_DURATION_MS = new InjectionToken<number>('TOAST_DURATION_MS', {
  providedIn: 'root',
  factory: () => 5_000,
});

/**
 * P-17 Aviso emergente: obsidian with alpaca text, at the bottom center, without covering the main
 * action. It is an <output> (a polite live region) that stays in the page, so that a new message is
 * announced: the screen sets `message` to show one and back to null when `dismissed` fires. Without
 * an action it is dismissed after 5 s; with one («Reintentar») it stays until it is used.
 */
@Component({
  selector: 'app-toast',
  template: `
    <output class="toast" [class.open]="message() !== null">
      @if (message(); as text) {
        <span>{{ text }}</span>
        @if (actionLabel(); as label) {
          <button type="button" (click)="action.emit()">{{ label }}</button>
        }
      }
    </output>
  `,
  styles: `
    .toast {
      position: fixed;
      inset: auto 1rem 1.5rem;
      z-index: 30;
      display: none;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.25rem 1rem;
      width: fit-content;
      max-width: min(36rem, calc(100vw - 2rem));
      margin-inline: auto;
      padding: 0.75rem 1.25rem;
      border-radius: 4px;
      background: var(--quipu-obsidiana);
      color: var(--quipu-alpaca);
      font-size: 1rem;
      line-height: 1.4;
      box-shadow: var(--quipu-sombra-flotante);
    }
    .open {
      display: flex;
      animation: enter var(--quipu-duracion-entrada) var(--quipu-ease-entrada);
    }
    @keyframes enter {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
    button {
      min-height: 44px;
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      font-weight: 800;
      text-decoration: underline;
      text-underline-offset: 4px;
      cursor: pointer;
    }
    button:focus-visible {
      outline-color: var(--quipu-foco-sobre-oscuro);
    }
    @media (prefers-reduced-motion: reduce) {
      .open {
        animation: none;
      }
    }
  `,
})
export class ToastComponent {
  private readonly durationMs = inject(TOAST_DURATION_MS);

  /** What happened; null hides the toast. */
  readonly message = input<string | null>(null);
  /** E.g. «Reintentar»; with an action the toast does not go away by itself. */
  readonly actionLabel = input<string | null>(null);
  readonly action = output();
  readonly dismissed = output();

  constructor() {
    // Only schedules a timer (no asynchronous work starts here); it is cleared when the message changes.
    effect((onCleanup) => {
      if (this.message() === null || this.actionLabel() !== null) return;
      const timer = setTimeout(() => {
        this.dismissed.emit();
      }, this.durationMs);
      onCleanup(() => {
        clearTimeout(timer);
      });
    });
  }
}
