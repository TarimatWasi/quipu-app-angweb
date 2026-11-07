import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { PageLoadState } from '@shared/data/page-load-state';
import type { PageRequest } from '@shared/data/page-load-state';
import { nextSort } from '@shared/ui/data-table/list-sort';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { ListFiltersComponent } from '@shared/ui/list-filters/list-filters.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { ShowMoreComponent } from '@shared/ui/show-more/show-more.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
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

type Request = PageRequest<ContractStatus>;

/**
 * A4 «Contratos» (RF-09) on the canvas «Contratos»: the Vigentes, the Vencidos or the Finalizados,
 * page by page with the cursor of the BFF. The state is asked to the BFF; the search, «Próximo a
 * vencer» and the order work on what is loaded and never go to the address. «Lo que toca ahora»
 * says how many contracts end in 30 days or fewer (the BFF counts them, whatever the page).
 */
@Component({
  selector: 'app-contracts-list',
  imports: [
    ContractsTableComponent,
    EmptyStateComponent,
    FieldControlDirective,
    FormField,
    FormFieldComponent,
    ListFiltersComponent,
    LoadErrorComponent,
    NowPanelComponent,
    PageHeaderComponent,
    RouterLink,
    ShowMoreComponent,
    SkeletonBlockComponent,
    SkeletonComponent,
    SkeletonContentDirective,
  ],
  templateUrl: './contracts-list.component.html',
  styleUrl: './contracts-list.component.scss',
})
export class ContractsListComponent {
  private readonly service = inject(AdminContractsService);

  protected readonly views = VIEWS;
  protected readonly viewLabels = VIEW_LABELS;
  protected readonly phoneSorts = PHONE_SORTS;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;

  protected readonly view = signal<ContractStatus>('ACTIVE');
  protected readonly filters = signal<ContractFilters>(NO_FILTERS);
  protected readonly filterForm = form(this.filters);
  protected readonly sort = signal<ContractSort>(DEFAULT_SORT);

  private readonly contracts = signal<readonly ContractSummary[]>([]);
  private readonly soon = signal<readonly ContractSummary[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  private readonly pageLoad = new PageLoadState<ContractStatus>();
  private readonly now = new Date();

  protected readonly phase = this.pageLoad.phase;
  protected readonly retrying = this.pageLoad.retrying;
  protected readonly loadingMore = this.pageLoad.loadingMore;
  protected readonly listFailed = this.pageLoad.firstFailed;
  protected readonly moreFailed = this.pageLoad.moreFailed;

  protected readonly filtered = computed(() => hasFilters(this.filters()));
  protected readonly loadedCount = computed(() => this.contracts().length);
  protected readonly rows = computed(() =>
    visibleContracts(
      this.contracts().map((contract) => toRow(contract, this.now)),
      this.filters(),
      this.sort(),
    ),
  );
  protected readonly count = computed(() => countText(this.rows().length, this.loadedCount()));
  protected readonly panel = computed(() =>
    this.view() === 'ACTIVE' ? soonPanel(this.soon()) : null,
  );
  protected readonly empty = computed(() => emptyText(this.view()));

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.pageLoad.invalidate();
    });
    this.read({ query: 'ACTIVE', after: null });
  }

  protected chooseView(view: ContractStatus): void {
    if (view === this.view()) return;
    this.pageLoad.reset();
    this.contracts.set([]);
    this.soon.set([]);
    this.view.set(view);
    this.filters.set(NO_FILTERS);
    this.sort.set(DEFAULT_SORT);
    this.read({ query: view, after: null });
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
    const after = this.nextCursor();
    if (after !== null && !this.pageLoad.loading()) this.read({ query: this.view(), after });
  }

  /** Asks the failed read again, unless the view changed since: then its first page. */
  protected retry(): void {
    if (this.pageLoad.loading()) return;
    const request = this.pageLoad.failed();
    if (request?.query === this.view()) this.read(request, true);
    else this.read({ query: this.view(), after: null });
  }

  /**
   * A new read forgets the failure of another one; a first page also forgets the cursor of the
   * previous one, so «Mostrar más» never mixes two lists. The Vigentes also ask for the ones that
   * end soon: a panel that fails to load is left out, the list does not wait for it.
   */
  private read(request: Request, retrying = false): void {
    if (request.after === null) this.nextCursor.set(null);
    const sequence = this.pageLoad.begin(request, retrying);
    firstValueFrom(this.service.list(request.query, request.after ?? undefined))
      .then((page) => {
        this.receive(sequence, request, page);
      })
      .catch(() => {
        this.pageLoad.fail(sequence);
      });
    if (request.query === 'ACTIVE' && request.after === null) this.readSoon(request);
  }

  private readSoon(request: Request): void {
    firstValueFrom(this.service.expiringSoon())
      .then((page) => {
        if (this.view() === request.query) this.soon.set(page.content);
      })
      .catch(() => {
        this.soon.set([]);
      });
  }

  private receive(sequence: number, request: Request, page: ContractPage): void {
    if (!this.pageLoad.succeed(sequence)) return;
    this.contracts.update((loaded) =>
      request.after === null ? page.content : [...loaded, ...page.content],
    );
    this.nextCursor.set(page.nextCursor);
  }
}
