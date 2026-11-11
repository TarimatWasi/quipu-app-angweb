import { ListFilterState } from '@shared/lists/list-page';
import { countText } from '@shared/text/list-text';
import { ResourceContent } from '@shared/data/resource-content';
import { watchChanges } from '@core/changes/change-resources.service';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { PageLoadState } from '@shared/data/page-load-state';
import { ListFiltersSkeletonComponent } from '@shared/ui/list-filters/list-filters-skeleton.component';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { ListFiltersComponent } from '@shared/ui/list-filters/list-filters.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { ShowMoreComponent } from '@shared/ui/show-more/show-more.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { PaymentsTableComponent } from '../components/payments-table.component';
import { AdminPaymentsService } from '../data/admin-payments.service';
import type { PaymentQueueItem, QueueSummary, PaymentStatus } from '../data/admin-payments.service';
import {
  DEFAULT_SORT,
  hasFilters,
  LOAD_ERROR_TEXT,
  NO_FILTERS,
  NO_MATCH_HEADING,
  PHONE_SORTS,
  QUEUE_VIEWS,
  queueNowPanel,
  toQueueRow,
  visiblePayments,
} from '../model/payment-queue';
import type { QueueFilters, QueueView, SortKey } from '../model/payment-queue';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';

/**
 * A5 «Pagos» (RF-05): «Lo que toca ahora» with the payments waiting over every page, and the
 * payments of a view («Por revisar», «Aprobados», «Rechazados»), oldest first, page by page with
 * «Mostrar más». «Buscar», «Tipo de huésped» and the order work on what is loaded, in the page.
 * The rows do not carry the amount: the administrator compares it in A5.2.
 */
@Component({
  selector: 'app-payment-queue',
  imports: [
    ListFiltersSkeletonComponent,
    FieldControlDirective,
    FormFieldComponent,
    EmptyStateComponent,
    FormField,
    ListFiltersComponent,
    LoadErrorComponent,
    NowPanelComponent,
    PageHeaderComponent,
    PaymentsTableComponent,
    RouterLink,
    ShowMoreComponent,
    SkeletonComponent,
    SkeletonContentDirective,
  ],
  templateUrl: './payment-queue.component.html',
  styleUrl: './payment-queue.component.scss',
})
export class PaymentQueueComponent extends ListFilterState<QueueFilters, SortKey> {
  private readonly payments = inject(AdminPaymentsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly views = QUEUE_VIEWS;
  protected readonly viewNames = QUEUE_VIEWS.map((option) => option.label);
  protected readonly phoneSorts = PHONE_SORTS;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;

  protected readonly view = signal<QueueView>(QUEUE_VIEWS[0]);

  private readonly items = signal<readonly PaymentQueueItem[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  private readonly pageLoad = new PageLoadState<PaymentStatus>();
  /** The panel is a help over the list: without it the queue still works. */
  private readonly summaryRead = rxResource<QueueSummary, undefined>({
    stream: () => this.payments.queueSummary(),
  });
  private readonly summary = new ResourceContent(this.summaryRead, {
    message: () => 'No se pudo cargar el resumen de pagos.',
  });
  protected readonly summaryState = this.summary.state;

  protected readonly loading = this.pageLoad.loading;
  protected readonly phase = this.pageLoad.phase;
  protected readonly retrying = this.pageLoad.retrying;
  protected readonly listFailed = this.pageLoad.firstFailed;
  protected readonly moreFailed = this.pageLoad.moreFailed;
  protected readonly loadingList = this.pageLoad.loadingFirst;
  protected readonly loadingMore = this.pageLoad.loadingMore;
  protected readonly showEmpty = this.pageLoad.showEmpty;

  protected readonly filtered = computed(() => hasFilters(this.filters()));
  protected readonly rows = computed(() => {
    const now = new Date();
    return visiblePayments(this.items(), this.filters(), this.sort()).map((item) =>
      toQueueRow(item, now),
    );
  });
  protected readonly loadedCount = computed(() => this.items().length);
  protected readonly count = computed(() =>
    countText(this.rows().length, this.loadedCount(), this.nextCursor() !== null ? 'cargados' : ''),
  );
  protected readonly panel = computed(() => {
    const summary = this.summary.data();
    return summary === null ? null : queueNowPanel(this.view().status, summary, new Date());
  });

  private started = false;

  constructor() {
    super({ noFilters: NO_FILTERS, defaultSort: DEFAULT_SORT, phoneSorts: PHONE_SORTS });
    this.destroyRef.onDestroy(() => {
      this.pageLoad.invalidate();
    });
    watchChanges({
      keys: ['admin.payments.queue', 'admin.dashboard'],
      reload: () => {
        this.summary.reload();
        void this.load(undefined, false, true);
      },
      busy: () => this.pageLoad.loading() || this.summaryRead.isLoading(),
    });
    // The address decides the view (?vista=), also when only it changes on this same page.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const view = QUEUE_VIEWS.find((v) => v.param === params.get('vista')) ?? QUEUE_VIEWS[0];
      if (this.started && view === this.view()) return;
      this.started = true;
      this.view.set(view);
      this.pageLoad.reset();
      this.filters.set(NO_FILTERS);
      this.sort.set(DEFAULT_SORT);
      void this.load();
    });
  }

  protected choose(view: QueueView): void {
    if (view === this.view()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vista: view.param },
      replaceUrl: true,
    });
  }

  /** «Reintentar» asks again what failed: the first page of the view or the next one. */
  protected retry(): void {
    if (this.loading()) return;
    void this.load(this.moreFailed() ? (this.nextCursor() ?? undefined) : undefined, true);
  }

  protected more(): void {
    const cursor = this.nextCursor();
    if (cursor !== null && !this.loading()) {
      void this.load(cursor);
    }
  }

  protected loadSummary(): void {
    this.summary.reload();
  }

  private async load(after?: string, retrying = false, preserve = false): Promise<void> {
    const status = this.view().status;
    if (after === undefined && !preserve) {
      this.items.set([]);
      this.nextCursor.set(null);
    }
    if (after === undefined && preserve) this.nextCursor.set(null);
    const sequence = this.pageLoad.begin({ query: status, after: after ?? null }, retrying);
    try {
      const page = await firstValueFrom(this.payments.list(status, after));
      if (!this.pageLoad.succeed(sequence)) return;
      this.items.update((items) =>
        after === undefined ? [...page.content] : [...items, ...page.content],
      );
      this.nextCursor.set(page.nextCursor);
    } catch {
      this.pageLoad.fail(sequence);
    }
  }
}
