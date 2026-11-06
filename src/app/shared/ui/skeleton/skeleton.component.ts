import { NgTemplateOutlet } from '@angular/common';
import { Component, contentChild, DestroyRef, inject, input, OnInit } from '@angular/core';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { LoadTiming, SKELETON_TIMING } from './load-timing';
import { SkeletonContentDirective } from './skeleton-content.directive';
export { SKELETON_TIMING } from './load-timing';
export type { SkeletonTiming } from './load-timing';
export const SLOW_SERVER_NOTICE =
  'El servidor está despertando; la primera solicitud puede tardar hasta un minuto.';

/** Loading behavior only; the consumer supplies the layout it actually renders. */
@Component({
  selector: 'app-skeleton',
  imports: [NgTemplateOutlet, PageNoticeComponent],
  template: `
    <section aria-busy="true" [attr.aria-label]="'Cargando ' + subject()">
      @if (visible()) {
        <div aria-hidden="true"><ng-container [ngTemplateOutlet]="content().template" /></div>
      }
    </section>
    <!-- Announcements remain outside the busy region. -->
    <output class="slow">
      @if (slow() && announceSlow()) {
        <app-page-notice tone="info">{{ slowNotice }}</app-page-notice>
      }
    </output>
  `,
  styles: `
    :host,
    .slow {
      display: block;
      min-width: 0;
    }
    .slow app-page-notice {
      margin-top: 1.5rem;
    }
  `,
})
export class SkeletonComponent implements OnInit {
  private readonly timing = new LoadTiming(inject(SKELETON_TIMING));
  private readonly destroyRef = inject(DestroyRef);
  readonly subject = input.required<string>();
  /** Siblings backed by the same request delegate its announcement to a single region. */
  readonly announceSlow = input(true);
  protected readonly content = contentChild.required(SkeletonContentDirective);
  protected readonly visible = this.timing.skeleton;
  protected readonly slow = this.timing.slow;
  protected readonly slowNotice = SLOW_SERVER_NOTICE;
  ngOnInit(): void {
    this.timing.start();
    this.destroyRef.onDestroy(() => {
      this.timing.stop();
    });
  }
}
