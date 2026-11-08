import { PagedListPage } from '@shared/lists/list-page';
import { countText } from '@shared/text/list-text';
import { ListFiltersSkeletonComponent } from '@shared/ui/list-filters/list-filters-skeleton.component';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { ListFiltersComponent } from '@shared/ui/list-filters/list-filters.component';
import { ListResultsComponent } from '@shared/ui/list-results/list-results.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { openDeactivateEnvironmentDialog } from '../components/deactivate-environment-dialog.component';
import { EnvironmentsTableComponent } from '../components/environments-table.component';
import { AdminEnvironmentsService } from '../data/admin-environments.service';
import { limaDay } from '@shared/payments/payment-format';
import {
  DEFAULT_SORT,
  doneText,
  emptyText,
  freePanel,
  hasFilters,
  LOAD_ERROR_TEXT,
  NO_FILTERS,
  NO_MATCH_HEADING,
  PHONE_SORTS,
  STATUS_LABELS,
  toRow,
  visibleEnvironments,
} from '../model/environment';
import type {
  Environment,
  EnvironmentFilters,
  EnvironmentPage,
  EnvironmentRow,
  EnvironmentStatus,
  SortKey,
} from '../model/environment';

const VIEWS: readonly EnvironmentStatus[] = ['ACTIVE', 'INACTIVE'];

/**
 * A2 «Ambientes» (RF-01) on the canvas «Ambientes»: the active ones or the inactive ones, page by
 * page with the cursor of the BFF. The state is asked to the BFF; type, occupancy, search and order
 * work on what is loaded and never go to the address. «Lo que toca ahora» says how many are free.
 * «Desactivar» asks first and tells who is in it when it cannot; «Reactivar» does not ask (RN-12).
 */
@Component({
  selector: 'app-environments-list',
  imports: [
    ListFiltersSkeletonComponent,
    EnvironmentsTableComponent,
    FieldControlDirective,
    FormField,
    FormFieldComponent,
    ListFiltersComponent,
    ListResultsComponent,
    LoadErrorComponent,
    NowPanelComponent,
    PageHeaderComponent,
    RouterLink,
    SkeletonComponent,
    SkeletonContentDirective,
  ],
  templateUrl: './environments-list.component.html',
  styleUrl: './environments-list.component.scss',
})
export class EnvironmentsListComponent extends PagedListPage<
  EnvironmentStatus,
  Environment,
  EnvironmentPage,
  EnvironmentFilters,
  SortKey
> {
  private readonly service = inject(AdminEnvironmentsService);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);

  protected readonly views = VIEWS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;

  private readonly freeCount = signal<number | null>(null);

  protected readonly filtered = computed(() => hasFilters(this.filters()));
  protected readonly rows = computed(() =>
    visibleEnvironments(this.list.items().map(toRow), this.filters(), this.sort()),
  );
  protected readonly count = computed(() => countText(this.rows().length, this.loadedCount()));
  protected readonly panel = computed(() => {
    const count = this.freeCount();
    return count === null
      ? null
      : freePanel(count, this.view() === 'ACTIVE' ? this.list.items() : []);
  });
  protected readonly empty = computed(() => emptyText(this.view()));
  protected readonly searchHint = computed(() =>
    this.view() === 'ACTIVE' ? 'Código o huésped' : 'Código',
  );

  constructor() {
    super('ACTIVE', { noFilters: NO_FILTERS, defaultSort: DEFAULT_SORT, phoneSorts: PHONE_SORTS });
    this.start();
  }

  protected fetchPage(
    status: EnvironmentStatus,
    after: string | null,
  ): Observable<EnvironmentPage> {
    return this.service.list(status, after ?? undefined);
  }

  protected pageReceived(page: EnvironmentPage): void {
    if (this.view() === 'ACTIVE') this.freeCount.set(page.freeCount);
  }

  /** «Desactivar» opens its dialog; «Reactivar» changes the state at once. */
  protected changeState(row: EnvironmentRow): void {
    if (row.action === 'reactivate') {
      void this.reactivate(row);
      return;
    }
    const environment = this.list.items().find((item) => item.id === row.id);
    openDeactivateEnvironmentDialog(this.dialog, {
      code: row.code,
      occupant: environment?.occupant ?? environment?.nextOccupant ?? null,
      today: limaDay(new Date()),
      deactivate: () => this.service.deactivate(row.id),
    })
      .afterClosed()
      .subscribe((done) => {
        if (done !== true) return;
        this.toasts.show(doneText(row.code, 'deactivate'), { tone: 'success' });
        this.list.reload(this.view());
      });
  }

  private async reactivate(row: EnvironmentRow): Promise<void> {
    try {
      await firstValueFrom(this.service.reactivate(row.id), { defaultValue: null });
      this.toasts.show(doneText(row.code, 'reactivate'), { tone: 'success' });
    } catch (error: unknown) {
      this.toasts.show(toBffErrorWithServerMessage(error).message);
    }
    this.list.reload(this.view());
  }
}
