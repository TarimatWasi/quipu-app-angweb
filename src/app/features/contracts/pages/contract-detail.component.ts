import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, switchMap } from 'rxjs';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import { AsyncContentState } from '@shared/data/async-content';
import { PeriodPaymentsComponent } from '@shared/payments/period-payments.component';
import { toPeriodRow } from '@shared/payments/period-rows';
import type { PeriodRow } from '@shared/payments/period-rows';
import { environmentLabel } from '@shared/text/environment-text';
import { guestName } from '@shared/text/guest-text';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonFieldsComponent } from '@shared/ui/skeleton/skeleton-fields.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import { openTerminateContractDialog } from '../components/terminate-contract-dialog.component';
import { AdminContractsService } from '../data/admin-contracts.service';
import type { Contract } from '../model/contract';
import {
  confirmPoints,
  confirmTitle,
  detailFacts,
  detailPanel,
  FILE_ERROR_TEXT,
  fileText,
  LOAD_ERROR_TEXT,
  monthsNote,
  noMonthsText,
  NOT_FOUND_TEXT,
  ownPeriods,
  TERMINATED_TEXT,
} from '../model/contract-detail';
import { CONTRACT_DETAIL_STYLES } from './contract-detail.styles';

const LIST = '/admin/contracts';

/** The contract and its months, once read together. */
interface Loaded {
  readonly contract: Contract;
  readonly rows: readonly PeriodRow[];
}

/**
 * A4.2 «Detalle del contrato» (CU-07, RF-09) and A4.3 «Finalizar» (CU-12) on the canvas
 * «ContratoDetalle»: what waits on the contract, the months it charges, what was agreed and its PDF.
 * The signed link lasts 15 minutes, so reading again gives a new one. «Finalizar contrato» says
 * what changes before changing it and does not erase the debt (RN-25).
 */
@Component({
  selector: 'app-contract-detail',
  imports: [
    FactTileComponent,
    LoadErrorComponent,
    NowPanelComponent,
    PageHeaderComponent,
    PeriodPaymentsComponent,
    RouterLink,
    SkeletonBlockComponent,
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonFactsComponent,
    SkeletonFieldsComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './contract-detail.component.html',
  styles: CONTRACT_DETAIL_STYLES,
})
export class ContractDetailComponent {
  private readonly contracts = inject(AdminContractsService);
  private readonly guests = inject(AdminGuestsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** A value longer than this goes in the smaller figure so it does not break the tile. */
  protected readonly longValue = 24;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;

  private id = '';
  private readonly loaded = new AsyncContentState<Loaded>();
  /** The moment the page was read: «vence en 5 días» counts from it. */
  private readonly now = signal(new Date());

  protected readonly phase = computed(() => this.loaded.state().status);
  protected readonly retrying = computed(() => {
    const state = this.loaded.state();
    return state.status === 'initial-error' && state.retrying;
  });
  protected readonly refreshing = computed(() => {
    const state = this.loaded.state();
    return state.status === 'ready' && state.refresh.status === 'loading';
  });
  protected readonly refreshError = computed(() => {
    const state = this.loaded.state();
    return state.status === 'ready' && state.refresh.status === 'error'
      ? state.refresh.message
      : null;
  });

  protected readonly title = computed(() => {
    const data = this.loaded.data();
    return data === null ? 'Contrato' : `Contrato de ${guestName(data.contract.guestName)}`;
  });
  /** What the page shows, worked out once per read. */
  protected readonly detail = computed(() => {
    const data = this.loaded.data();
    if (data === null) return null;
    const { contract, rows } = data;
    const now = this.now();
    return {
      contract,
      rows,
      panel: detailPanel(contract, rows, now),
      facts: detailFacts(contract, now),
      fileText: fileText(contract, now),
      monthsNote: monthsNote(contract),
      noMonths: noMonthsText(contract),
      guestName: guestName(contract.guestName),
      environmentName: environmentLabel(
        contract.environmentType,
        contract.environmentCode,
      ).toLowerCase(),
    };
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.loaded.dispose();
    });
    this.id = this.route.snapshot.paramMap.get('id') ?? '';
    void this.load(true);
  }

  protected reload(): void {
    void this.load(this.loaded.data() === null);
  }

  /** The storage could not sign the link: the rest of the contract came, the PDF is asked again. */
  protected fileUnavailable(): void {
    this.toasts.show(FILE_ERROR_TEXT, {
      actionLabel: 'Reintentar',
      action: () => {
        this.reload();
      },
    });
  }

  protected terminate(): void {
    const data = this.loaded.data();
    if (data === null) return;
    openTerminateContractDialog(this.dialog, {
      title: confirmTitle(data.contract.guestName),
      points: confirmPoints(data.contract, data.rows),
      terminate: () => this.contracts.terminate(data.contract.id),
    })
      .afterClosed()
      .subscribe((done) => {
        if (done !== true) return;
        this.toasts.show(TERMINATED_TEXT, { tone: 'success' });
        this.reload();
      });
  }

  /** The contract first, then the months of its guest: the signed link is fresh on every read. */
  private async load(initial: boolean): Promise<void> {
    const request = this.loaded.begin(initial);
    if (request === null) return;
    try {
      const data = await firstValueFrom(
        this.contracts.get(this.id).pipe(
          switchMap(async (contract): Promise<Loaded> => {
            const periods = await firstValueFrom(this.guests.accountStatus(contract.guestId));
            return {
              contract,
              rows: ownPeriods(periods, contract.id).map((item) =>
                toPeriodRow(item, contract.guestId),
              ),
            };
          }),
        ),
      );
      if (this.loaded.succeed(request, data)) this.now.set(new Date());
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.toasts.show(NOT_FOUND_TEXT);
        void this.router.navigate([LIST]);
        return;
      }
      this.loaded.fail(request, LOAD_ERROR_TEXT);
    }
  }
}
