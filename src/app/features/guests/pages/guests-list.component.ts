import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { catchError, map, of, Subject, switchMap } from 'rxjs';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { ListFiltersComponent } from '@shared/ui/list-filters/list-filters.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { ShowMoreComponent } from '@shared/ui/show-more/show-more.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { GuestsNowPanelComponent } from '../components/guests-now-panel.component';
import { GuestsTableComponent } from '../components/guests-table.component';
import { GuestsListService } from '../data/guests-list.service';
import {
  DEFAULT_SORT,
  guestQuery,
  hasFilters,
  NO_FILTERS,
  PHONE_SORTS,
  sameQuery,
  toGuestRow,
  visibleGuests,
} from '../model/guest-list';
import type {
  GuestFilters,
  GuestPage,
  GuestQuery,
  GuestSort,
  GuestSummary,
  GuestView,
  SortKey,
} from '../model/guest-list';
import {
  countText,
  LOAD_ERROR_TEXT,
  NO_CURRENT_HEADING,
  NO_CURRENT_TEXT,
  NO_INACTIVE_HEADING,
  NO_INACTIVE_TEXT,
  NO_MATCH_HEADING,
  nowPanel,
} from '../model/guest-list-texts';
import type { PanelCounts } from '../model/guest-list-texts';
import { nextSort } from '@shared/ui/data-table/list-sort';

type Phase = 'loading' | 'error' | 'ready';

/** One read of the BFF: the first page of a query (`after` null) or the one after a cursor. */
interface PageRequest {
  readonly query: GuestQuery;
  readonly after: string | null;
}

const VIEWS: readonly { readonly view: GuestView; readonly label: string }[] = [
  { view: 'CURRENT', label: 'Actuales' },
  { view: 'INACTIVE', label: 'Inactivos' },
];

/**
 * A3 «Huéspedes» (RF-02): every guest of the residence, the current ones or the inactive ones,
 * page by page with the cursor of the BFF. Type and state are asked to the BFF; the search and the
 * order work on what is loaded, in the page, and never go to the address. «Lo que toca ahora» says
 * who has not activated their access yet. «Nuevo huésped» opens A3.1.
 */
@Component({
  selector: 'app-guests-list',
  imports: [
    EmptyStateComponent,
    FormField,
    GuestsNowPanelComponent,
    GuestsTableComponent,
    ListFiltersComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    RouterLink,
    ShowMoreComponent,
    SkeletonComponent,
  ],
  templateUrl: './guests-list.component.html',
  styleUrl: './guests-list.component.scss',
})
export class GuestsListComponent {
  private readonly service = inject(GuestsListService);

  protected readonly views = VIEWS;
  protected readonly phoneSorts = PHONE_SORTS;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;

  protected readonly view = signal<GuestView>('CURRENT');
  protected readonly filters = signal<GuestFilters>(NO_FILTERS);
  protected readonly filterForm = form(this.filters);
  protected readonly sort = signal<GuestSort>(DEFAULT_SORT);

  private readonly guests = signal<readonly GuestSummary[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  private readonly counts = signal<PanelCounts | null>(null);
  /** The read on its way, or null; the screen stays as it was meanwhile. */
  private readonly pending = signal<PageRequest | null>(null);
  /** The read that failed last, so «Reintentar» asks it again; null after an answer. */
  private readonly failed = signal<PageRequest | null>(null);
  private readonly answered = signal(false);

  private readonly query = computed(() => guestQuery(this.view(), this.filters()), {
    equal: sameQuery,
  });
  private readonly requests = new Subject<PageRequest>();

  protected readonly phase = computed<Phase>(() => {
    if (this.answered()) return 'ready';
    return this.failed() === null ? 'loading' : 'error';
  });
  protected readonly retrying = computed(() => this.failed() !== null && this.pending() !== null);
  protected readonly loadingPage = computed(() => this.pending()?.after === null);
  protected readonly loadingMore = computed(() => {
    const after = this.pending()?.after;
    return after !== undefined && after !== null;
  });
  /** Where a failed read is said: instead of the list (first page) or under it (next page). */
  protected readonly listFailed = computed(() => this.failed()?.after === null);
  protected readonly moreFailed = computed(() => {
    const after = this.failed()?.after;
    return after !== undefined && after !== null;
  });

  protected readonly filtered = computed(() => hasFilters(this.filters()));
  protected readonly rows = computed(() => {
    const now = new Date();
    return visibleGuests(this.guests(), this.filters().search, this.sort()).map((guest) =>
      toGuestRow(guest, now),
    );
  });
  protected readonly loadedCount = computed(() => this.guests().length);
  protected readonly count = computed(() => countText(this.rows().length, this.loadedCount()));
  protected readonly panel = computed(() => {
    const counts = this.counts();
    if (this.view() !== 'CURRENT' || counts === null) return null;
    return nowPanel(counts, this.guests(), new Date());
  });
  protected readonly emptyHeading = computed(() =>
    this.view() === 'CURRENT' ? NO_CURRENT_HEADING : NO_INACTIVE_HEADING,
  );
  protected readonly emptyText = computed(() =>
    this.view() === 'CURRENT' ? NO_CURRENT_TEXT : NO_INACTIVE_TEXT,
  );

  constructor() {
    // switchMap: a new view or filter drops the answer of the previous one.
    this.requests
      .pipe(
        switchMap((request) =>
          this.service.page(request.query, request.after).pipe(
            map((page): GuestPage | null => page),
            catchError(() => of(null)),
            map((page) => ({ request, page })),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ request, page }) => {
        this.receive(request, page);
      });
    toObservable(this.query)
      .pipe(takeUntilDestroyed())
      .subscribe((query) => {
        this.read({ query, after: null });
      });
  }

  protected chooseView(view: GuestView): void {
    if (view === this.view()) return;
    this.view.set(view);
    this.filters.set(NO_FILTERS);
  }

  protected clearFilters(): void {
    this.filters.set(NO_FILTERS);
  }

  /** «Ver sin activar»: only the guests pending activation, without any other filter. */
  protected showPending(): void {
    this.filters.set({ ...NO_FILTERS, state: 'PENDING_ACTIVATION' });
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

  protected more(): void {
    const after = this.nextCursor();
    if (after !== null && !this.loadingPage()) this.read({ query: this.query(), after });
  }

  /** Asks the failed read again, unless the view or a filter changed since: then their first page. */
  protected retry(): void {
    const request = this.failed();
    if (request && sameQuery(request.query, this.query())) {
      this.read(request, true);
    } else {
      this.read({ query: this.query(), after: null });
    }
  }

  /**
   * A new read forgets the failure of another one; a first page also forgets the cursor of the
   * previous query, so «Mostrar más» never mixes two lists.
   */
  private read(request: PageRequest, retrying = false): void {
    if (!retrying) this.failed.set(null);
    if (request.after === null) this.nextCursor.set(null);
    this.pending.set(request);
    this.requests.next(request);
  }

  private receive(request: PageRequest, page: GuestPage | null): void {
    this.pending.set(null);
    if (page === null) {
      this.failed.set(request);
      return;
    }
    this.failed.set(null);
    this.guests.update((loaded) =>
      request.after === null ? page.content : [...loaded, ...page.content],
    );
    this.nextCursor.set(page.nextCursor);
    this.counts.set({
      pendingActivationCount: page.pendingActivationCount,
      onboardingCount: page.onboardingCount,
    });
    this.answered.set(true);
  }
}
