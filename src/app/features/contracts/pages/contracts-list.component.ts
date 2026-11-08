import { ListFiltersSkeletonComponent } from '@shared/ui/list-filters/list-filters-skeleton.component';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PagedList } from '@shared/data/paged-list';
import { nextSort } from '@shared/ui/data-table/list-sort';
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
  countText,
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
  ContractSort,
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
export class ContractsListComponent {
  private readonly service = inject(AdminContractsService);

  protected readonly views = VIEWS;
  protected readonly viewNames = VIEWS.map((option) => VIEW_LABELS[option]);
  protected readonly viewLabels = VIEW_LABELS;
  protected readonly phoneSorts = PHONE_SORTS;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;

  protected readonly view = signal<ContractStatus>('ACTIVE');
  protected readonly filters = signal<ContractFilters>(NO_FILTERS);
  protected readonly filterForm = form(this.filters);
  protected readonly sort = signal<ContractSort>(DEFAULT_SORT);

  private readonly soon = signal<readonly ContractSummary[]>([]);
  private readonly list = new PagedList<ContractStatus, ContractSummary, ContractPage>(
    (status, after) => this.service.list(status, after ?? undefined),
    (_page, request) => {
      if (request.query === 'ACTIVE' && request.after === null) this.readSoon();
    },
  );
  private readonly now = new Date();

  protected readonly phase = this.list.phase;
  protected readonly retrying = this.list.retrying;
  protected readonly loadingMore = this.list.loadingMore;
  protected readonly listFailed = this.list.firstFailed;
  protected readonly moreFailed = this.list.moreFailed;
  protected readonly nextCursor = this.list.nextCursor;

  protected readonly filtered = computed(() => hasFilters(this.filters()));
  protected readonly loadedCount = computed(() => this.list.items().length);
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
    inject(DestroyRef).onDestroy(() => {
      this.list.dispose();
    });
    this.list.reload('ACTIVE');
  }

  protected chooseView(view: ContractStatus): void {
    if (view === this.view()) return;
    this.view.set(view);
    this.filters.set(NO_FILTERS);
    this.sort.set(DEFAULT_SORT);
    this.list.switchTo(view);
  }

  protected clearFilters(): void {
    this.filters.set(NO_FILTERS);
  }

  protected searchFor(search: string): void {
    this.filters.update((filters) => ({ ...filters, search }));
  }

  /** The action of the panel when several contracts are about to end: only those. */
  protected showSoon(): void {
    this.filters.set({ search: '', soon: 'SOON' });
    this.sort.set(DEFAULT_SORT);
  }

  protected sortBy(key: SortKey): void {
    this.sort.update((current) => nextSort(current, key));
  }

  /** «Ordenar por» of a phone: always ascending, as its labels say. */
  protected sortOnPhone(key: string): void {
    const choice = PHONE_SORTS.find((option) => option.key === key);
    if (choice) this.sort.set({ key: choice.key, direction: 'asc' });
  }

  protected more(): void {
    this.list.more(this.view());
  }

  protected retry(): void {
    this.list.retry(this.view());
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
