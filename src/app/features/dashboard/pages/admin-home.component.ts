import { ListFilterState } from '@shared/lists/list-page';
import { RefreshErrorComponent } from '@shared/ui/refresh-error/refresh-error.component';
import { countText } from '@shared/text/list-text';
import { Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { FormField } from '@angular/forms/signals';
import { map } from 'rxjs';
import { ResourceContent } from '@shared/data/resource-content';
import { formatPeriod } from '@shared/payments/payment-format';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { ListFiltersComponent } from '@shared/ui/list-filters/list-filters.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { ListFiltersSkeletonComponent } from '@shared/ui/list-filters/list-filters-skeleton.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatusFilterComponent } from '@shared/ui/status-filter/status-filter.component';
import { ChargesTableComponent } from '../components/charges-table.component';
import { DashboardNowComponent } from '../components/dashboard-now.component';
import { FirstStepsComponent } from '../components/first-steps.component';
import { AdminDashboardService } from '../data/admin-dashboard.service';
import {
  DEFAULT_SORT,
  hasFilters,
  isChargeState,
  NO_FILTERS,
  PHONE_SORTS,
  segmentsOf,
  toChargeRow,
  visibleCharges,
} from '../model/dashboard-charges';
import type { AdminDashboard, ChargeFilters, ChargeSortKey } from '../model/dashboard-charges';
import { FIRST_STEPS, isFirstUse, nowOf, pendingOf } from '../model/dashboard-pending';
import { LOAD_ERROR_TEXT, NO_MATCH_HEADING } from '../model/dashboard-texts';
import { limaDay, limaMonth } from '@shared/payments/payment-format';
import { ADMIN_HOME_STYLES } from './admin-home.styles';

interface HomeData {
  readonly dashboard: AdminDashboard;
  /** When the answer came: the day «Lo que toca ahora» and the days ago are counted from. */
  readonly loadedAt: Date;
}

/**
 * A1 «Inicio» of the administrator (CU-04) on the canvas «Inicio»: «Lo que toca ahora» with what
 * else waits, and «Cobros del mes» with its bar of states, its filters and its table. The BFF
 * answers everything in one read; the filters, the search and the order work on it, in the page.
 */
@Component({
  selector: 'app-admin-home',
  imports: [
    RefreshErrorComponent,
    ChargesTableComponent,
    DashboardNowComponent,
    EmptyStateComponent,
    FieldControlDirective,
    FirstStepsComponent,
    FormField,
    FormFieldComponent,
    ListFiltersComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    ListFiltersSkeletonComponent,
    NowPanelComponent,
    SkeletonComponent,
    SkeletonContentDirective,
    StatusFilterComponent,
  ],
  templateUrl: './admin-home.component.html',
  styles: ADMIN_HOME_STYLES,
})
export class AdminHomeComponent extends ListFilterState<ChargeFilters, ChargeSortKey> {
  private readonly service = inject(AdminDashboardService);

  protected readonly title = formatPeriod(limaMonth(new Date()));
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;
  protected readonly firstSteps = FIRST_STEPS;
  protected readonly phoneSorts = PHONE_SORTS;

  /** The read starts with the page, from a field: not in `ngOnInit` (FE-ANG-CMP-10). */
  private readonly read = rxResource<HomeData, undefined>({
    stream: () =>
      this.service.get().pipe(map((dashboard) => ({ dashboard, loadedAt: new Date() }))),
  });
  private readonly loaded = new ResourceContent(this.read, { message: () => LOAD_ERROR_TEXT });
  protected readonly view = this.loaded.state;
  protected readonly retrying = this.loaded.retrying;
  protected readonly refreshing = this.loaded.refreshing;
  protected readonly refreshError = this.loaded.refreshError;

  protected readonly filtered = computed(() => hasFilters(this.filters()));
  private readonly chargesTitle = viewChild<ElementRef<HTMLElement>>('chargesTitle');

  /** What the answer says, apart from the filters. */
  protected readonly content = computed(() => {
    const data = this.loaded.data();
    if (data === null) return null;
    const pending = pendingOf(data.dashboard, data.loadedAt);
    return {
      now: nowOf(data.dashboard, pending, limaDay(data.loadedAt)),
      also: pending.slice(1),
      firstUse: isFirstUse(data.dashboard, pending),
      rows: data.dashboard.charges.map(toChargeRow),
    };
  });
  protected readonly segments = computed(() => segmentsOf(this.content()?.rows ?? []));
  protected readonly rows = computed(() =>
    visibleCharges(this.content()?.rows ?? [], this.filters(), this.sort()),
  );
  protected readonly count = computed(() =>
    countText(this.rows().length, this.content()?.rows.length ?? 0, 'cobros'),
  );

  constructor() {
    super({ noFilters: NO_FILTERS, defaultSort: DEFAULT_SORT, phoneSorts: PHONE_SORTS });
  }

  protected reload(): void {
    this.loaded.reload();
  }

  protected chooseState(key: string | null): void {
    this.filters.update((filters) => ({ ...filters, state: isChargeState(key) ? key : null }));
  }

  /** «Ver atrasados»: only the overdue charges, and the reader goes to them. */
  protected showOverdue(): void {
    this.filters.set({ ...NO_FILTERS, state: 'OVERDUE' });
    this.chargesTitle()?.nativeElement.focus();
  }
}
