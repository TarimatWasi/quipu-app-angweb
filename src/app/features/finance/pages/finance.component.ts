import { watchChanges } from '@core/changes/change-resources.service';
import { ChangesNoticeComponent } from '@shared/ui/changes-notice/changes-notice.component';
import { toBffErrorWithGone } from '@core/http/bff-error';
import { RefreshErrorComponent } from '@shared/ui/refresh-error/refresh-error.component';
import { countText } from '@shared/text/list-text';
import { ListFiltersSkeletonComponent } from '@shared/ui/list-filters/list-filters-skeleton.component';
import { Component, computed, DestroyRef, inject, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom, map, Observable } from 'rxjs';
import { openConcurrentModificationDialog } from '@shared/concurrent-modification/concurrent-modification-dialog.component';
import { ResourceContent } from '@shared/data/resource-content';
import { PagedList } from '@shared/data/paged-list';
import type { Paged } from '@shared/data/paged-list';
import { limaDay } from '@shared/payments/payment-format';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { ListResultsComponent } from '@shared/ui/list-results/list-results.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { openConfirmActionDialog } from '@shared/ui/confirm-action-dialog/confirm-action-dialog.component';
import { openExpenseDialog } from '../components/expense-dialog.component';
import { openFineDialog } from '../components/fine-dialog.component';
import { MovementsTableComponent } from '../components/movements-table.component';
import { openRefundDialog } from '../components/refund-dialog.component';
import { AdminFinanceService } from '../data/admin-finance.service';
import {
  balanceFacts,
  creditPanel,
  currentMonth,
  deleteNotice,
  DEFAULT_SORT,
  emptyText,
  EXPENSE_CREATED_TEXT,
  EXPENSE_DELETED_TEXT,
  EXPENSE_UPDATED_TEXT,
  expenseDetail,
  expenseRow,
  FINE_CREATED_TEXT,
  FINE_DELETED_TEXT,
  fineDetail,
  fineRow,
  fineWho,
  FIRST_COLUMN,
  LOAD_ERROR_TEXT,
  monthLabel,
  monthOptions,
  monthPhrase,
  refundDoneText,
  refundRow,
  sortMovements,
  TAB_ACTIONS,
  TAB_LABELS,
  TABS,
} from '../model/finance';
import { EXPENSE_GONE_TEXT, FINE_GONE_TEXT } from '../model/finance-forms';
import type {
  Expense,
  Fine,
  MovementRow,
  MovementSort,
  PendingCredit,
  Refund,
  SortKey,
  Summary,
  Tab,
} from '../model/finance';

/** A movement of the list with what it came from: an edit needs the expense, a delete says what it is. */
interface Movement {
  readonly row: MovementRow;
  readonly source: Expense | Fine | Refund;
}

/** A page of movements, with how many the month has: the BFF counts them, whatever the page. */
type MovementPage = Paged<Movement> & { readonly total: number };

/** The query of the list: which kind and which month, so «Mostrar más» never mixes two lists. */
type Key = `${Tab}|${string}`;

const keyOf = (tab: Tab, month: string): Key => `${tab}|${month}`;

/**
 * A6 «Finanzas» (RF-07, RF-18, RF-19, RF-24) on the canvas «Finanzas»: what waits to be refunded, the
 * balance of a month — payments and fines, less refunds, less expenses — and the movements of the
 * month by kind, page by page with the cursor of the BFF. A6.1 to A6.5 are dialogs of this page: it
 * asks the BFF, and after each change reads the balance and the list again.
 */
@Component({
  selector: 'app-finance',
  imports: [
    ChangesNoticeComponent,
    RefreshErrorComponent,
    FactTileComponent,
    FieldControlDirective,
    FormFieldComponent,
    ListFiltersSkeletonComponent,
    ListResultsComponent,
    LoadErrorComponent,
    MovementsTableComponent,
    NowPanelComponent,
    PageHeaderComponent,
    SkeletonBlockComponent,
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonFactsComponent,
  ],
  templateUrl: './finance.component.html',
  styleUrl: './finance.component.scss',
})
export class FinanceComponent {
  private readonly service = inject(AdminFinanceService);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);

  protected readonly tabs = TABS;
  protected readonly tabLabels = TAB_LABELS;
  protected readonly tabNames = TABS.map((tab) => TAB_LABELS[tab]);
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly monthLabel = monthLabel;

  /** The day in Lima: the balance opens on its month and a refund is not dated after it. */
  private readonly today = limaDay(new Date());
  protected readonly month = signal(currentMonth(this.today));
  protected readonly tab = signal<Tab>('EXP');
  protected readonly sort = signal<MovementSort>(DEFAULT_SORT);

  /**
   * The balance of the month shown. Another month is a refresh, not a new identity: the figures of
   * the previous one stay until the new ones arrive, so the month is read untracked and changing it
   * reloads.
   */
  private readonly summaryRead = rxResource<Summary, undefined>({
    stream: () => this.service.summary(untracked(this.month)),
  });
  private readonly summary = new ResourceContent(this.summaryRead, {
    message: () => LOAD_ERROR_TEXT,
  });
  /** The credit that waits for a refund does not depend on the month; if it fails the panel is left out. */
  private readonly creditsRead = rxResource<readonly PendingCredit[], undefined>({
    stream: () => this.service.pendingCredits(),
  });
  private readonly credits = computed(() =>
    this.creditsRead.hasValue() ? this.creditsRead.value() : [],
  );
  private readonly total = signal(0);
  private readonly list = new PagedList<Key, Movement, MovementPage>(
    (key, after) => this.movements(key, after),
    (page) => {
      this.total.set(page.total);
    },
  );

  protected readonly phase = computed(() => this.summary.state().status);
  protected readonly retrying = this.summary.retrying;
  protected readonly refreshing = this.summary.refreshing;
  protected readonly refreshError = this.summary.refreshError;

  protected readonly months = computed(() => monthOptions(currentMonth(this.today), this.month()));
  protected readonly phrase = computed(() => monthPhrase(this.month()));
  protected readonly facts = computed(() => {
    const summary = this.summary.data();
    return summary === null ? [] : balanceFacts(summary);
  });
  protected readonly panel = computed(() => creditPanel(this.credits()));
  protected readonly tabAction = computed(() => TAB_ACTIONS[this.tab()]);
  protected readonly firstColumn = computed(() => FIRST_COLUMN[this.tab()]);
  protected readonly empty = computed(() => emptyText(this.tab(), this.month()));

  protected readonly rows = computed(() =>
    sortMovements(
      this.list.items().map((item) => item.row),
      this.sort(),
    ),
  );
  protected readonly count = computed(() => countText(this.rows().length, this.total(), ''));
  protected readonly nextCursor = this.list.nextCursor;
  protected readonly listLoading = computed(() => this.list.phase() === 'loading');
  protected readonly listFailed = this.list.firstFailed;
  protected readonly moreFailed = this.list.moreFailed;
  protected readonly listRetrying = this.list.retrying;
  protected readonly loadingMore = this.list.loadingMore;

  /** The reads start with the page, from a field: not in `ngOnInit` (FE-ANG-CMP-10) nor in the constructor. */
  protected readonly started = this.start();

  protected readonly changesStale = signal(false);
  protected readonly changesStarted = watchChanges({
    keys: ['admin.finance', 'admin.credits', 'admin.refunds'],
    reload: () => {
      this.summary.reload();
      this.creditsRead.reload();
      this.list.reload(this.key());
    },
    busy: () => this.summaryRead.isLoading() || this.creditsRead.isLoading() || this.list.loading(),
    defer: () => this.dialog.openDialogs.length > 0,
    stale: () => {
      this.changesStale.set(true);
    },
  });

  protected reloadChanges(): void {
    this.dialog.closeAll();
    this.changesStale.set(false);
    this.summary.reload();
    this.creditsRead.reload();
    this.list.reload(this.key());
  }

  private start(): true {
    inject(DestroyRef).onDestroy(() => {
      this.list.dispose();
    });
    this.list.reload(this.key());
    return true;
  }

  private key(): Key {
    return keyOf(this.tab(), this.month());
  }

  protected valueOf(event: Event): string {
    return event.target instanceof HTMLSelectElement ? event.target.value : '';
  }

  protected reload(): void {
    this.summary.reload();
    this.creditsRead.reload();
    this.list.retry(this.key());
  }

  protected chooseMonth(month: string): void {
    if (month === this.month()) return;
    this.month.set(month);
    this.summary.reload();
    this.list.switchTo(this.key());
  }

  protected chooseTab(tab: Tab): void {
    if (tab === this.tab()) return;
    this.tab.set(tab);
    this.sort.set(DEFAULT_SORT);
    this.list.switchTo(this.key());
  }

  protected sortBy(key: SortKey): void {
    this.sort.update((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: key === 'amount' ? 'desc' : 'asc' },
    );
  }

  /** «Ordenar por» of a phone: the amount, the biggest first, or the name from A to Z. */
  protected sortOnPhone(key: string): void {
    if (key === 'amount') this.sort.set(DEFAULT_SORT);
    else if (key === 'title') this.sort.set({ key: 'title', direction: 'asc' });
  }

  protected more(): void {
    this.list.more(this.key());
  }

  protected retry(): void {
    this.list.retry(this.key());
  }

  // What each kind of movement asks the BFF: the rows with what they came from.

  private movements(key: Key, after: string | null): Observable<MovementPage> {
    const [tab, month] = key.split('|') as [Tab, string];
    const cursor = after ?? undefined;
    switch (tab) {
      case 'EXP':
        return this.service.expenses(month, cursor).pipe(
          map((page) => ({
            content: page.content.map((source) => ({ row: expenseRow(source), source })),
            nextCursor: page.nextCursor,
            total: page.totalCount,
          })),
        );
      case 'FIN':
        return this.service.fines(month).pipe(
          map((fines) => ({
            content: fines.map((source) => ({ row: fineRow(source), source })),
            nextCursor: null,
            total: fines.length,
          })),
        );
      case 'REF':
        return this.service.refunds(month, cursor).pipe(
          map((page) => ({
            content: page.content.map((source) => ({ row: refundRow(source), source })),
            nextCursor: page.nextCursor,
            total: page.totalCount,
          })),
        );
    }
  }

  /** After a change: the balance, the list and what waits for a refund are read again. */
  private refresh(message: string, tone: 'success' | null = 'success'): void {
    this.toasts.show(message, { tone });
    this.summary.reload();
    this.creditsRead.reload();
    this.list.reload(this.key());
  }

  // A6.1 to A6.5.

  /** The button of the list: registers what the kind that is shown has. */
  protected register(): void {
    switch (this.tab()) {
      case 'EXP':
        this.openExpense(null);
        break;
      case 'FIN':
        void this.openFine();
        break;
      case 'REF':
        this.registerRefund(this.credits()[0]?.guestId ?? '');
        break;
    }
  }

  protected edit(row: MovementRow): void {
    const item = this.list.items().find((candidate) => candidate.row.key === row.key);
    if (item !== undefined && 'category' in item.source) this.openExpense(item.source);
  }

  private openExpense(expense: Expense | null): void {
    openExpenseDialog(this.dialog, {
      expense,
      month: this.month(),
      months: this.months(),
      save: (input) =>
        expense === null
          ? this.service.createExpense(input)
          : this.service.updateExpense(expense.id, input, expense.version),
    })
      .afterClosed()
      .subscribe((result) => {
        if (result === 'saved') {
          this.refresh(expense === null ? EXPENSE_CREATED_TEXT : EXPENSE_UPDATED_TEXT);
        } else if (result === 'conflict') {
          void this.concurrent();
        }
      });
  }

  /** «El egreso cambió»: nothing was saved; it is read again either way. */
  private async concurrent(): Promise<void> {
    const ref = openConcurrentModificationDialog(this.dialog, {
      title: 'El egreso cambió',
      backLabel: 'Volver a Finanzas',
    });
    await firstValueFrom(ref.afterClosed(), { defaultValue: undefined });
    this.summary.reload();
    this.list.reload(this.key());
  }

  private async openFine(): Promise<void> {
    try {
      const guests = await firstValueFrom(this.service.guests());
      openFineDialog(this.dialog, {
        month: this.month(),
        months: this.months(),
        guests,
        save: (input) => this.service.createFine(input),
      })
        .afterClosed()
        .subscribe((saved) => {
          if (saved === true) this.refresh(FINE_CREATED_TEXT);
        });
    } catch {
      this.toasts.show(LOAD_ERROR_TEXT);
    }
  }

  protected remove(row: MovementRow): void {
    const item = this.list.items().find((candidate) => candidate.row.key === row.key);
    if (item === undefined) return;
    const { source } = item;
    const expense = 'category' in source;
    const kind = expense ? 'EXP' : 'FIN';
    const notice = deleteNotice(kind, this.month());
    const goneText = expense ? EXPENSE_GONE_TEXT : FINE_GONE_TEXT;
    let gone = false;
    openConfirmActionDialog(this.dialog, {
      title: notice.title,
      lead: {
        what: expense ? (source.description ?? row.title) : fineWho(source as Fine),
        detail: expense ? expenseDetail(source) : fineDetail(source as Fine),
      },
      text: notice.text,
      button: notice.button,
      pendingButton: 'Eliminando…',
      failureText: (error) => {
        const failure = toBffErrorWithGone(error, goneText);
        gone = failure.code === 'RESOURCE_NOT_FOUND';
        return failure.message;
      },
      run: () =>
        expense ? this.service.deleteExpense(source.id) : this.service.deleteFine(source.id),
    })
      .afterClosed()
      .subscribe((done) => {
        if (done === true) this.refresh(expense ? EXPENSE_DELETED_TEXT : FINE_DELETED_TEXT);
        // The record is gone: back to the list, which no longer shows it, with the same text.
        else if (gone) this.refresh(goneText, null);
      });
  }

  /** A6.5 from the notice (the guest that waited longest) or from the list of refunds. */
  protected registerRefund(guestId: string): void {
    openRefundDialog(this.dialog, {
      credits: this.credits(),
      guestId,
      today: this.today,
      save: (input) => this.service.createRefund(input),
    })
      .afterClosed()
      .subscribe((refund) => {
        if (refund === undefined) return;
        const month = refund.date.slice(0, 7);
        this.tab.set('REF');
        this.sort.set(DEFAULT_SORT);
        this.month.set(month);
        this.refresh(refundDoneText(refund.guestName, month));
        this.list.switchTo(this.key());
      });
  }
}
