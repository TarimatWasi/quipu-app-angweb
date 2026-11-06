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
 * an action it is dismissed after 5 s; with one («Reintentar») it stays until it is used. The
 * `success` tone puts a check (hidden from screen readers) before the text, in bold.
 */
@Component({
  selector: 'app-toast',
  template: `
    <output class="toast">
      @if (message(); as text) {
        <span class="box">
          <span class="message" [class.success]="tone() === 'success'">
            @if (tone() === 'success') {
              <svg
                class="check"
                aria-hidden="true"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M5 12l5 5L20 7" />
              </svg>
            }
            <span>{{ text }}</span>
          </span>
          @if (actionLabel(); as label) {
            <button type="button" (click)="action.emit()">{{ label }}</button>
          }
        </span>
      }
    </output>
  `,
  // The <output> is never display:none: an idle live region stays in the accessibility tree, so
  // the text put into it is announced. Only the box inside is drawn, and only with a message.
  styles: `
    .toast {
      position: fixed;
      inset: auto 1rem 1.5rem;
      z-index: 30;
      display: flex;
      justify-content: center;
      pointer-events: none;
    }
    .box {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.25rem 1rem;
      max-width: min(36rem, calc(100vw - 2rem));
      padding: 0.75rem 1.25rem;
      border-radius: var(--quipu-radio);
      background: var(--quipu-obsidiana);
      color: var(--quipu-alpaca);
      font-size: 1rem;
      line-height: 1.4;
      box-shadow: var(--quipu-sombra-flotante);
      pointer-events: auto;
      animation: enter var(--quipu-duracion-entrada) var(--quipu-ease-entrada);
    }
    @keyframes enter {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
    }
    .message {
      display: inline-flex;
      align-items: center;
      gap: var(--quipu-espacio-icono);
    }
    .success {
      font-weight: var(--quipu-peso-enfasis);
    }
    .check {
      flex: none;
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
      .box {
        animation: none;
      }
    }
  `,
})
export class ToastComponent {
  private readonly durationMs = inject(TOAST_DURATION_MS);

  /** What happened; null hides the toast. */
  readonly message = input<string | null>(null);
  /** `success` adds the check and the bold text of the canvas («Contraseña cambiada.»). */
  readonly tone = input<'success' | null>(null);
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
