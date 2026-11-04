import {
  Component,
  DestroyRef,
  inject,
  InjectionToken,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';

/** The three shapes that cover every screen (P-12, Cargando): list, detail and a form that reads first. */
export type SkeletonShape = 'list' | 'detail' | 'form';

/** When the skeleton shows and when the notice of the server waking up appears. */
export interface SkeletonTiming {
  /** An answer faster than this shows nothing, so nothing flickers. */
  readonly showAfterMs: number;
  /** After this long without an answer, the yellow notice (the free Render plan wakes up slowly). */
  readonly slowNoticeAfterMs: number;
}

export const SKELETON_TIMING = new InjectionToken<SkeletonTiming>('SKELETON_TIMING', {
  providedIn: 'root',
  factory: () => ({ showAfterMs: 300, slowNoticeAfterMs: 8_000 }),
});

export const SLOW_SERVER_NOTICE =
  'El servidor está despertando; la primera solicitud puede tardar hasta un minuto.';

const FOUR = [1, 2, 3, 4] as const;
const FIVE = [1, 2, 3, 4, 5] as const;

/**
 * P-12 Cargando: blocks of the same size and place as the content, without a spinner. The screen
 * paints its bar, «Volver a …», title and date at once and puts this where its data will go, only
 * on the first load; it removes it when the answer arrives. The region is busy from the start;
 * the blocks appear after `showAfterMs` and the notice after `slowNoticeAfterMs`.
 */
@Component({
  selector: 'app-skeleton',
  imports: [PageNoticeComponent],
  template: `
    <section aria-busy="true" [attr.aria-label]="'Cargando ' + subject()">
      @if (visible()) {
        @switch (shape()) {
          @case ('list') {
            <div class="sk panel"></div>
            <div class="sk title"></div>
            <div class="tiles">
              @for (tile of four; track tile) {
                <div class="sk tile"></div>
              }
            </div>
            <div class="sk bar"></div>
            @for (row of five; track row) {
              <div class="sk row"></div>
            }
          }
          @case ('detail') {
            <div class="sk panel"></div>
            <div class="split">
              <div class="stack">
                <div class="sk title"></div>
                @for (row of five; track row) {
                  <div class="sk row"></div>
                }
              </div>
              <div class="pairs">
                <div class="sk title wide"></div>
                @for (tile of four; track tile) {
                  <div class="sk tile"></div>
                }
                <div class="sk tile wide"></div>
              </div>
            </div>
          }
          @case ('form') {
            <div class="split">
              <div class="fields">
                <div class="sk title"></div>
                @for (field of four; track field) {
                  <div class="field">
                    <div class="sk label"></div>
                    <div class="sk input"></div>
                  </div>
                }
                <div class="sk button"></div>
              </div>
              <div class="pairs aside">
                <div class="sk title wide"></div>
                @for (tile of four; track tile) {
                  <div class="sk tile"></div>
                }
              </div>
            </div>
          }
        }
      }
      @if (slow()) {
        <output class="slow"
          ><app-page-notice tone="info">{{ slowNotice }}</app-page-notice></output
        >
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .sk {
      border-radius: 4px;
      background: var(--quipu-piedra-oscura);
      animation: pulse var(--quipu-duracion-pulso) ease-in-out infinite;
    }
    @keyframes pulse {
      50% {
        opacity: 0.55;
      }
    }
    .panel {
      height: 150px;
      margin-top: 1.75rem;
    }
    .title {
      width: 13.75rem;
      height: 24px;
      margin-top: 2.5rem;
    }
    .tiles {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 3px;
      margin-top: 0.75rem;
    }
    .tile {
      height: 88px;
    }
    .bar {
      height: 48px;
      margin-top: 1.5rem;
    }
    .row {
      height: 64px;
      margin-top: 3px;
      background: var(--quipu-alpaca);
    }
    .split {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(20rem, 1fr);
      gap: 2.5rem 3.5rem;
      align-items: start;
      margin-top: 2rem;
    }
    .split .title {
      margin: 0 0 0.6875rem;
    }
    .stack,
    .pairs {
      display: grid;
      gap: 3px;
      align-content: start;
    }
    .pairs {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .wide {
      grid-column: 1 / -1;
    }
    .fields {
      display: grid;
      gap: 1.375rem;
    }
    .fields .title {
      margin: 0;
    }
    .field {
      display: grid;
      gap: 0.375rem;
    }
    .label {
      width: 8.75rem;
      height: 14px;
    }
    .input {
      height: 48px;
      background: var(--quipu-alpaca);
    }
    .button {
      width: 12.5rem;
      height: 48px;
    }
    .slow {
      display: block;
      margin-top: 1.5rem;
    }
    @media (max-width: 599.98px) {
      .panel {
        height: 200px;
      }
      .tiles {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .row {
        height: 96px;
      }
      .split {
        grid-template-columns: 1fr;
      }
      .aside {
        order: -1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .sk {
        animation: none;
      }
    }
  `,
})
export class SkeletonComponent implements OnInit {
  private readonly timing = inject(SKELETON_TIMING);
  private readonly destroyRef = inject(DestroyRef);

  readonly shape = input<SkeletonShape>('list');
  /** What is loading, for the accessible name «Cargando …», e.g. «Pagos». */
  readonly subject = input.required<string>();

  protected readonly visible = signal(false);
  protected readonly slow = signal(false);
  protected readonly four = FOUR;
  protected readonly five = FIVE;
  protected readonly slowNotice = SLOW_SERVER_NOTICE;

  ngOnInit(): void {
    const show = setTimeout(() => {
      this.visible.set(true);
    }, this.timing.showAfterMs);
    const notice = setTimeout(() => {
      this.slow.set(true);
    }, this.timing.slowNoticeAfterMs);
    this.destroyRef.onDestroy(() => {
      clearTimeout(show);
      clearTimeout(notice);
    });
  }
}
