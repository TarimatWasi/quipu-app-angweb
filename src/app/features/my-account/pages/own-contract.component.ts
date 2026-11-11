import { watchChanges } from '@core/changes/change-resources.service';
import { RefreshErrorComponent } from '@shared/ui/refresh-error/refresh-error.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ResourceContent } from '@shared/data/resource-content';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonCardsComponent } from '@shared/ui/skeleton/skeleton-cards.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { STORAGE_UNAVAILABLE_TEXT } from '@shared/text/error-text';
import { ToastService } from '@shared/ui/toast/toast.service';
import { ContractDetailComponent } from '../components/contract-detail.component';
import { GuestPaymentsService } from '../data/guest-payments.service';
import type { PeriodStatus } from '../data/guest-payments.service';
import { OwnContractService } from '../data/own-contract.service';
import type { OwnContracts } from '../data/own-contract.service';
import {
  CONTRACT_TITLE,
  currentBlock,
  isLinkStale,
  LINK_EXPIRED_TEXT,
  LOAD_CONTRACT_TEXT,
  nextBlock,
  NO_CONTRACT_TEXT,
  NO_CONTRACT_TITLE,
} from '../model/own-contract';
import type { ContractBlock } from '../model/own-contract';
import { OWN_CONTRACT_STYLES } from './own-contract.styles';

interface ContractData {
  readonly contracts: OwnContracts;
  readonly periods: readonly PeriodStatus[];
  /** When the answer came: the signed links in it last 15 minutes from then. */
  readonly loadedAt: number;
}

interface ContractView {
  readonly current: ContractBlock;
  readonly next: ContractBlock | null;
}

/**
 * H2 «Mi contrato» (CU-18, RN-26) on the canvas «MiContrato»: the contract in force or the latest,
 * with its state, what was agreed and its file, and the next one if a renewal is already loaded.
 * It reads the same whether the contract ended: the account only becomes read-only (RN-26).
 */
@Component({
  selector: 'app-own-contract',
  imports: [
    RefreshErrorComponent,
    ContractDetailComponent,
    EmptyStateComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    SkeletonBlockComponent,
    SkeletonCardsComponent,
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonFactsComponent,
  ],
  templateUrl: './own-contract.component.html',
  styles: OWN_CONTRACT_STYLES,
})
export class OwnContractComponent {
  private readonly contracts = inject(OwnContractService);
  private readonly payments = inject(GuestPaymentsService);
  private readonly toasts = inject(ToastService);

  protected readonly title = CONTRACT_TITLE;
  protected readonly loadErrorText = LOAD_CONTRACT_TEXT;
  protected readonly noContractTitle = NO_CONTRACT_TITLE;
  protected readonly noContractText = NO_CONTRACT_TEXT;

  /** The read starts with the page, from a field: not in `ngOnInit` (FE-ANG-CMP-10). */
  private readonly read = rxResource<ContractData, undefined>({
    stream: () =>
      forkJoin({
        contracts: this.contracts.get(),
        // The account only adds what is still owed and when the first payment is due: without
        // it the contract still reads, so its failure does not fail the page.
        periods: this.payments.accountStatus().pipe(catchError(() => of<PeriodStatus[]>([]))),
      }).pipe(map(({ contracts, periods }) => ({ contracts, periods, loadedAt: Date.now() }))),
  });
  private readonly loaded = new ResourceContent(this.read, { message: () => LOAD_CONTRACT_TEXT });
  protected readonly view = this.loaded.state;
  /** The guest never had a contract (404): an empty state, not an error. */
  protected readonly none = computed(() => {
    const error = this.loaded.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly retrying = this.loaded.retrying;
  protected readonly refreshing = this.loaded.refreshing;
  protected readonly refreshError = this.loaded.refreshError;
  protected readonly content = computed<ContractView | null>(() => {
    const data = this.loaded.data();
    if (data === null) return null;
    const { current, next } = data.contracts;
    const context = { now: new Date(data.loadedAt), periods: data.periods };
    return {
      current: currentBlock(current, next, context),
      next: next === null ? null : nextBlock(next, current, context),
    };
  });

  protected readonly changesStarted = watchChanges({
    keys: ['guest.contract', 'guest.home'],
    reload: () => {
      this.reload();
    },
    busy: () => this.read.isLoading(),
  });

  protected reload(): void {
    this.loaded.reload();
  }

  /**
   * A press on «Ver contrato». The link opens as it is while it is fresh; one that never came (the
   * storage could not sign it) or may have expired is not followed: the notice says so and the
   * contracts are asked again, with new links.
   */
  protected open(event: Event, block: ContractBlock): void {
    const loadedAt = this.loaded.data()?.loadedAt ?? 0;
    if (block.file.url !== null && !isLinkStale(loadedAt, Date.now())) return;
    event.preventDefault();
    if (block.file.url === null) {
      this.toasts.show(STORAGE_UNAVAILABLE_TEXT, {
        actionLabel: 'Reintentar',
        action: () => {
          this.reload();
        },
      });
      return;
    }
    this.toasts.show(LINK_EXPIRED_TEXT);
    this.reload();
  }
}
