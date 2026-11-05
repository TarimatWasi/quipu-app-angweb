import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { nextSort } from '@shared/ui/data-table/list-sort';
import { ListFiltersComponent } from '@shared/ui/list-filters/list-filters.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { ShowMoreComponent } from '@shared/ui/show-more/show-more.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { PaymentsTableComponent } from '../components/payments-table.component';
import { AdminPaymentsService } from '../data/admin-payments.service';
import type { PaymentQueueItem, QueueSummary } from '../data/admin-payments.service';
import {
  countText,
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
import type { QueueFilters, QueueSort, QueueView, SortKey } from '../model/payment-queue';

type Phase = 'loading' | 'error' | 'ready';

/**
 * A5 «Pagos» (RF-05): «Lo que toca ahora» with the payments waiting over every page, and the
 * payments of a view («Por revisar», «Aprobados», «Rechazados»), oldest first, page by page with
 * «Mostrar más». «Buscar», «Tipo de huésped» and the order work on what is loaded, in the page.
 * The rows do not carry the amount: the administrator compares it in A5.2.
 */
@Component({
  selector: 'app-payment-queue',
  imports: [
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
  ],
  templateUrl: './payment-queue.component.html',
  styleUrl: './payment-queue.component.scss',
})
export class PaymentQueueComponent {
  private readonly payments = inject(AdminPaymentsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly views = QUEUE_VIEWS;
  protected readonly phoneSorts = PHONE_SORTS;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;

  protected readonly view = signal<QueueView>(QUEUE_VIEWS[0]);
  protected readonly filters = signal<QueueFilters>(NO_FILTERS);
  protected readonly filterForm = form(this.filters);
  protected readonly sort = signal<QueueSort>(DEFAULT_SORT);

  private readonly items = signal<readonly PaymentQueueItem[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loading = signal(false);
  /** Whether the last read failed, and whether it was the first page (instead of the list) or a next one. */
  private readonly failure = signal<'first' | 'more' | null>(null);
  /** True once a first page answered: from then on a new view keeps the page and only the list waits. */
  private readonly answered = signal(false);
  /** The first page of the view on screen answered, so «empty» is never shown while it loads. */
  private readonly viewLoaded = signal(false);
  private readonly summary = signal<QueueSummary | null>(null);

  protected readonly phase = computed<Phase>(() => {
    if (this.answered()) return 'ready';
    return this.failure() === null ? 'loading' : 'error';
  });
  protected readonly retrying = computed(() => this.failure() !== null && this.loading());
  protected readonly listFailed = computed(() => this.failure() === 'first');
  protected readonly moreFailed = computed(() => this.failure() === 'more');
  protected readonly loadingList = computed(() => this.loading() && !this.viewLoaded());
  protected readonly loadingMore = computed(() => this.loading() && this.viewLoaded());
  protected readonly showEmpty = computed(() => this.viewLoaded() && !this.loading());

  protected readonly filtered = computed(() => hasFilters(this.filters()));
  protected readonly rows = computed(() => {
    const now = new Date();
    return visiblePayments(this.items(), this.filters(), this.sort()).map((item) =>
      toQueueRow(item, now),
    );
  });
  protected readonly loadedCount = computed(() => this.items().length);
  protected readonly count = computed(() =>
    countText(this.rows().length, this.loadedCount(), this.nextCursor() !== null),
  );
  protected readonly panel = computed(() => {
    const summary = this.summary();
    return summary === null ? null : queueNowPanel(this.view().status, summary, new Date());
  });

  // Moves with every new read of the list, so a late answer of a previous view or page is ignored.
  private request = 0;
  private started = false;

  constructor() {
    // The address decides the view (?vista=), also when only it changes on this same page.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const view = QUEUE_VIEWS.find((v) => v.param === params.get('vista')) ?? QUEUE_VIEWS[0];
      if (this.started && view === this.view()) return;
      this.started = true;
      this.view.set(view);
      this.filters.set(NO_FILTERS);
      this.sort.set(DEFAULT_SORT);
      void this.load();
    });
    void this.loadSummary();
  }

  protected choose(view: QueueView): void {
    if (view === this.view()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vista: view.param },
      replaceUrl: true,
    });
  }

  protected clearFilters(): void {
    this.filters.set(NO_FILTERS);
  }

  protected sortBy(key: SortKey): void {
    this.sort.update((current) => nextSort(current, key));
  }

  protected searchFor(search: string): void {
    this.filters.update((filters) => ({ ...filters, search }));
  }

  /** «Ordenar por» of a phone: always ascending, as its labels say. */
  protected sortOnPhone(key: string): void {
    const choice = PHONE_SORTS.find((option) => option.key === key);
    if (choice) this.sort.set({ key: choice.key, direction: 'asc' });
  }

  /** «Reintentar» asks again what failed: the first page of the view or the next one. */
  protected retry(): void {
    void this.load(this.failure() === 'more' ? (this.nextCursor() ?? undefined) : undefined);
  }

  protected more(): void {
    const cursor = this.nextCursor();
    if (cursor !== null) {
      void this.load(cursor);
    }
  }

  /** The panel is a help over the list: without it the queue still works. */
  private async loadSummary(): Promise<void> {
    try {
      this.summary.set(await firstValueFrom(this.payments.queueSummary()));
    } catch {
      this.summary.set(null);
    }
  }

  private async load(after?: string): Promise<void> {
    const request = ++this.request;
    const status = this.view().status;
    if (after === undefined) {
      this.items.set([]);
      this.nextCursor.set(null);
      this.viewLoaded.set(false);
    }
    this.loading.set(true);
    this.failure.set(null);
    try {
      const page = await firstValueFrom(this.payments.list(status, after));
      if (request !== this.request) return;
      this.items.update((items) => [...items, ...page.content]);
      this.nextCursor.set(page.nextCursor);
      this.viewLoaded.set(true);
      this.answered.set(true);
    } catch {
      if (request !== this.request) return;
      this.failure.set(after === undefined ? 'first' : 'more');
    } finally {
      if (request === this.request) {
        this.loading.set(false);
      }
    }
  }
}
