import { Component, input } from '@angular/core';

export interface SkeletonCell {
  readonly shape?: 'text' | 'rectangle' | 'circle' | 'badge';
  readonly width?: string;
  readonly height?: string;
}

/** Decorative building block. Its loading region owns timing and announcements. */
@Component({
  selector: 'app-skeleton-block',
  host: {
    'aria-hidden': 'true',
    '[attr.data-shape]': 'shape()',
    '[style.width]': 'width()',
    '[style.height]': 'height()',
  },
  template: '',
  styles: `
    :host {
      display: block;
      width: 75%;
      max-width: 100%;
      height: 1rem;
      border-radius: var(--quipu-radio);
      background: var(--quipu-skeleton-fondo, var(--quipu-piedra-oscura));
      animation: pulse var(--quipu-duracion-pulso) ease-in-out infinite;
    }
    :host([data-shape='rectangle']) {
      width: 100%;
      height: 3rem;
    }
    :host([data-shape='badge']) {
      width: 6rem;
      height: 1.75rem;
    }
    :host([data-shape='circle']) {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
    }
    @keyframes pulse {
      50% {
        opacity: 0.55;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }
    }
  `,
})
export class SkeletonBlockComponent {
  readonly shape = input<NonNullable<SkeletonCell['shape']>>('text');
  readonly width = input<string>();
  readonly height = input<string>();
}
