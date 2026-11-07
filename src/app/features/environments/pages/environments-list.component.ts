import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';
import { MatDialog } from '@angular/material/dialog';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
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
import { ToastService } from '@shared/ui/toast/toast.service';
import { openDeactivateEnvironmentDialog } from '../components/deactivate-environment-dialog.component';
import { EnvironmentsTableComponent } from '../components/environments-table.component';
import { AdminEnvironmentsService } from '../data/admin-environments.service';
import { limaDay } from '@shared/payments/payment-format';
import {
  countText,
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
  EnvironmentSort,
  EnvironmentStatus,
  SortKey,
} from '../model/environment';

type Request = PageRequest<EnvironmentStatus>;

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
    EmptyStateComponent,
    EnvironmentsTableComponent,
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
  templateUrl: './environments-list.component.html',
  styleUrl: './environments-list.component.scss',
})
export class EnvironmentsListComponent {
  private readonly service = inject(AdminEnvironmentsService);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);

  protected readonly views = VIEWS;
  protected readonly statusLabels = STATUS_LABELS;
  protected readonly phoneSorts = PHONE_SORTS;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly noMatchHeading = NO_MATCH_HEADING;

  protected readonly view = signal<EnvironmentStatus>('ACTIVE');
  protected readonly filters = signal<EnvironmentFilters>(NO_FILTERS);
  protected readonly filterForm = form(this.filters);
  protected readonly sort = signal<EnvironmentSort>(DEFAULT_SORT);

  private readonly environments = signal<readonly Environment[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  private readonly freeCount = signal<number | null>(null);
  private readonly pageLoad = new PageLoadState<EnvironmentStatus>();

  protected readonly phase = this.pageLoad.phase;
  protected readonly retrying = this.pageLoad.retrying;
  protected readonly loadingMore = this.pageLoad.loadingMore;
  protected readonly listFailed = this.pageLoad.firstFailed;
  protected readonly moreFailed = this.pageLoad.moreFailed;

  protected readonly filtered = computed(() => hasFilters(this.filters()));
  protected readonly loadedCount = computed(() => this.environments().length);
  protected readonly rows = computed(() =>
    visibleEnvironments(this.environments().map(toRow), this.filters(), this.sort()),
  );
  protected readonly count = computed(() => countText(this.rows().length, this.loadedCount()));
  protected readonly panel = computed(() => {
    const count = this.freeCount();
    return this.view() !== 'ACTIVE' || count === null
      ? null
      : freePanel(count, this.environments());
  });
  protected readonly empty = computed(() => emptyText(this.view()));
  protected readonly searchHint = computed(() =>
    this.view() === 'ACTIVE' ? 'Código o huésped' : 'Código',
  );

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.pageLoad.invalidate();
    });
    this.read({ query: 'ACTIVE', after: null });
  }

  protected chooseView(view: EnvironmentStatus): void {
    if (view === this.view()) return;
    this.pageLoad.reset();
    this.environments.set([]);
    this.freeCount.set(null);
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

  /** «Desactivar» opens its dialog; «Reactivar» changes the state at once. */
  protected changeState(row: EnvironmentRow): void {
    if (row.action === 'reactivate') {
      void this.reactivate(row);
      return;
    }
    const environment = this.environments().find((item) => item.id === row.id);
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
        this.read({ query: this.view(), after: null });
      });
  }

  private async reactivate(row: EnvironmentRow): Promise<void> {
    try {
      await firstValueFrom(this.service.reactivate(row.id), { defaultValue: null });
      this.toasts.show(doneText(row.code, 'reactivate'), { tone: 'success' });
    } catch (error: unknown) {
      this.toasts.show(toBffErrorWithServerMessage(error).message);
    }
    this.read({ query: this.view(), after: null });
  }

  /**
   * A new read forgets the failure of another one; a first page also forgets the cursor of the
   * previous one, so «Mostrar más» never mixes two lists.
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
  }

  private receive(sequence: number, request: Request, page: EnvironmentPage): void {
    if (!this.pageLoad.succeed(sequence)) return;
    this.environments.update((loaded) =>
      request.after === null ? page.content : [...loaded, ...page.content],
    );
    this.nextCursor.set(page.nextCursor);
    this.freeCount.set(page.freeCount);
  }
}
