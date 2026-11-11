import { PagedListPage } from '@shared/lists/list-page';
import { countText } from '@shared/text/list-text';
import { ListFiltersSkeletonComponent } from '@shared/ui/list-filters/list-filters-skeleton.component';
import { Component, computed, inject, signal } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import type { Observable } from 'rxjs';
import type { PageRequest } from '@shared/data/page-load-state';
import { watchChanges } from '@core/changes/change-resources.service';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { ListFiltersComponent } from '@shared/ui/list-filters/list-filters.component';
import { ListResultsComponent } from '@shared/ui/list-results/list-results.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ContractsTableComponent } from '../components/contracts-table.component';
import { AdminContractsService } from '../data/admin-contracts.service';
import {
  DEFAULT_SORT,
  emptyText,
  hasFilters,
  LOAD_ERROR_TEXT,
  NO_FILTERS,
  NO_MATCH_HEADING,
  PHONE_SORTS,
  soonPanel,
  toRow,
  VIEW_LABELS,
  VIEWS,
  visibleContracts,
} from '../model/contract';
import type {
  ContractFilters,
  ContractPage,
  ContractStatus,
  ContractSummary,
  SortKey,
} from '../model/contract';

/**
 * A4 «Contratos» (RF-09) on the canvas «Contratos»: the Vigentes, the Vencidos or the Finalizados,
 * page by page with the cursor of the BFF. The state is asked to the BFF; the search, «Próximo a
 * vencer» and the order work on what is loaded and never go to the address. «Lo que toca ahora»
 * says how many contracts end in 30 days or fewer (the BFF counts them, whatever the page).
 */
@Component({
  selector: 'app-contracts-list',
  imports: [
    ListFiltersSkeletonComponent,
    ContractsTableComponent,
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
  templateUrl: './contracts-list.component.html',
  styleUrl: './contracts-list.component.scss',
})
export class ContractsListComponent extends PagedListPage<
  ContractStatus,
  ContractSummary,
  ContractPage,
  ContractFilters,
  SortKey
> {
  private readonly service = inject(AdminContractsService);

  protected readonly views = VIEWS;
  protected readonly viewNames = VIEWS.map((option) => VIEW_LABELS[option]);
  protected readonly viewLabels = VIEW_LABELS;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;

  private readonly soon = signal<readonly ContractSummary[]>([]);
  private readonly now = new Date();

  protected readonly filtered = computed(() => hasFilters(this.filters()));
  protected readonly rows = computed(() =>
    visibleContracts(
      this.list.items().map((contract) => toRow(contract, this.now)),
      this.filters(),
      this.sort(),
    ),
  );
  protected readonly count = computed(() => countText(this.rows().length, this.loadedCount()));
  protected readonly panel = computed(() => soonPanel(this.soon()));
  protected readonly empty = computed(() => emptyText(this.view()));

  constructor() {
    super('ACTIVE', { noFilters: NO_FILTERS, defaultSort: DEFAULT_SORT, phoneSorts: PHONE_SORTS });
    this.start();
    watchChanges({
      keys: ['admin.contracts'],
      reload: () => {
        this.list.reload(this.view());
      },
      busy: () => this.list.loading(),
    });
  }

  protected fetchPage(status: ContractStatus, after: string | null): Observable<ContractPage> {
    return this.service.list(status, after ?? undefined);
  }

  protected pageReceived(_page: ContractPage, request: PageRequest<ContractStatus>): void {
    if (request.query === 'ACTIVE' && request.after === null) this.readSoon();
  }

  /** The action of the panel when several contracts are about to end: only those. */
  protected showSoon(): void {
    this.filters.set({ search: '', soon: 'SOON' });
    this.sort.set(DEFAULT_SORT);
  }

  /** The Vigentes also ask for the ones that end soon: a panel that fails to load is left out. */
  private readSoon(): void {
    firstValueFrom(this.service.expiringSoon())
      .then((page) => {
        this.soon.set(page.content);
      })
      .catch(() => {
        this.soon.set([]);
      });
  }
}
