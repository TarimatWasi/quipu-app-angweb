import { PagedListPage } from '@shared/lists/list-page';
import { watchChanges } from '@core/changes/change-resources.service';
import { countText } from '@shared/text/list-text';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import type { Observable } from 'rxjs';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { ListFiltersSkeletonComponent } from '@shared/ui/list-filters/list-filters-skeleton.component';
import { ListFiltersComponent } from '@shared/ui/list-filters/list-filters.component';
import { ListResultsComponent } from '@shared/ui/list-results/list-results.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { PaymentHistoryTableComponent } from '../components/payment-history-table.component';
import { GuestPaymentsService } from '../data/guest-payments.service';
import type { GuestHistoryItem, GuestHistoryPage } from '../data/guest-payments.service';
import {
  creditHeading,
  DEFAULT_SORT,
  EMPTY,
  hasFilters,
  LOAD_ERROR_TEXT,
  NO_FILTERS,
  NO_MATCH_HEADING,
  PHONE_SORTS,
  STATE_OPTIONS,
  toRows,
  visibleRows,
} from '../model/payment-history';
import type { HistoryFilters, SortKey } from '../model/payment-history';

/**
 * H4 (CU-19, RF-10) on the canvas «Historial»: the own payments and refunds, newest first and
 * page by page with the cursor of the BFF (RN-09: only the guest's own, without voucher URLs). The
 * state filter and the order work on what is loaded. The credit in favor is a notice over the list
 * (RN-38); the refunds of Quipu are rows of their own, «Devuelto» (RN-39).
 */
@Component({
  selector: 'app-guest-history',
  imports: [
    FieldControlDirective,
    FormField,
    FormFieldComponent,
    ListFiltersComponent,
    ListFiltersSkeletonComponent,
    ListResultsComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    PageNoticeComponent,
    PaymentHistoryTableComponent,
    RouterLink,
  ],
  templateUrl: './guest-history.component.html',
  styleUrl: './guest-history.component.scss',
})
export class GuestHistoryComponent extends PagedListPage<
  'ALL',
  GuestHistoryItem,
  GuestHistoryPage,
  HistoryFilters,
  SortKey
> {
  private readonly service = inject(GuestPaymentsService);

  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;
  protected readonly empty = EMPTY;
  protected readonly stateOptions = STATE_OPTIONS;

  private readonly creditBalance = signal(0);

  protected readonly credit = computed(() => creditHeading(this.creditBalance()));
  protected readonly filtered = computed(() => hasFilters(this.filters()));
  protected readonly rows = computed(() =>
    visibleRows(toRows(this.list.items()), this.filters(), this.sort()),
  );
  protected readonly count = computed(() => countText(this.rows().length, this.loadedCount()));

  constructor() {
    super('ALL', { noFilters: NO_FILTERS, defaultSort: DEFAULT_SORT, phoneSorts: PHONE_SORTS });
    this.start();
    watchChanges({
      keys: ['guest.payments'],
      reload: () => {
        this.list.reload(this.view());
      },
      busy: () => this.list.loading(),
    });
  }

  protected fetchPage(_view: 'ALL', after: string | null): Observable<GuestHistoryPage> {
    return this.service.history(after ?? undefined);
  }

  protected pageReceived(page: GuestHistoryPage): void {
    this.creditBalance.set(page.creditBalance);
  }
}
