import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AsyncContentState } from '@shared/data/async-content';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { TemporaryGuestPaymentsService } from '../data/temporary-guest-payments.service';
import type { StayPaymentStatus } from '../data/temporary-guest-payments.service';
import {
  LOAD_STAY_TEXT,
  NO_STAY_TEXT,
  NO_STAY_TITLE,
  ONE_PAYMENT_NOTE,
  refundNotice,
  rejectedStayAlert,
  STAY_TITLE,
  stayFacts,
  stayHeading,
  stayNow,
} from '../model/stay-status';
import { ACCOUNT_HOME_STYLES } from './account-home.styles';

/**
 * T1 «Estado de pago» (CU-21) on the canvas «T1»: the stay in force (otherwise the next one,
 * otherwise the last one), «Lo que toca ahora» with its way to pay, correct or see the payment, and
 * the four tiles of the stay. What was paid over the agreed amount is refunded, never kept as
 * credit: a notice says whether it is pending or was made (RN-38, RN-39).
 */
@Component({
  selector: 'app-temporary-home',
  imports: [
    EmptyStateComponent,
    FactTileComponent,
    LoadErrorComponent,
    NowPanelComponent,
    PageHeaderComponent,
    PageNoticeComponent,
    RouterLink,
    SkeletonComponent,
    SkeletonContentDirective,
    SkeletonFactsComponent,
  ],
  templateUrl: './temporary-home.component.html',
  styles: ACCOUNT_HOME_STYLES,
})
export class TemporaryHomeComponent {
  private readonly payments = inject(TemporaryGuestPaymentsService);

  protected readonly title = STAY_TITLE;
  protected readonly loadErrorText = LOAD_STAY_TEXT;
  protected readonly noStayTitle = NO_STAY_TITLE;
  protected readonly noStayText = NO_STAY_TEXT;
  protected readonly note = ONE_PAYMENT_NOTE;
  protected readonly factLabels = ['Entrada', 'Salida', 'Noches', 'Monto acordado'];

  private readonly loaded = new AsyncContentState<StayPaymentStatus>();
  protected readonly view = this.loaded.state;
  protected readonly retrying = this.loaded.retrying;
  protected readonly refreshError = this.loaded.refreshError;
  protected readonly refreshing = this.loaded.refreshing;
  /** The guest has no stay yet (404): an empty state, not an error. */
  protected readonly none = signal(false);

  private readonly stay = computed(() => this.loaded.data());
  protected readonly now = computed(() => {
    const stay = this.stay();
    return stay ? stayNow(stay, new Date()) : null;
  });
  protected readonly heading = computed(() => {
    const stay = this.stay();
    return stay ? stayHeading(stay, new Date()) : '';
  });
  protected readonly facts = computed(() => {
    const stay = this.stay();
    return stay ? stayFacts(stay) : [];
  });
  protected readonly rejected = computed(() => {
    const stay = this.stay();
    return stay ? rejectedStayAlert(stay) : null;
  });
  protected readonly refund = computed(() => {
    const stay = this.stay();
    return stay ? refundNotice(stay) : null;
  });

  /** The read starts with the page, not in a hook (CMP-10, Sonar S7059). */
  protected readonly started = this.load();

  constructor() {
    // Leaving the screen: no late answer may load or change anything any more.
    inject(DestroyRef).onDestroy(() => {
      this.loaded.dispose();
    });
  }

  protected reload(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    const request = this.loaded.begin();
    if (request === null) return;
    try {
      const stay = await firstValueFrom(this.payments.paymentStatus());
      this.none.set(false);
      this.loaded.succeed(request, stay);
    } catch (error: unknown) {
      const missing = error instanceof HttpErrorResponse && error.status === 404;
      if (this.loaded.fail(request, LOAD_STAY_TEXT)) this.none.set(missing);
    }
  }
}
