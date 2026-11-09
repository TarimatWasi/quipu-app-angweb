import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AsyncContentState } from '@shared/data/async-content';
import { LatestRequest } from '@shared/data/latest-request';
import { PeriodPaymentsComponent } from '@shared/payments/period-payments.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { GuestPaymentsService } from '../data/guest-payments.service';
import type { GuestCredit, PeriodStatus } from '../data/guest-payments.service';
import {
  ACCOUNT_TITLE,
  accountNow,
  accountRows,
  creditNotice,
  HISTORY_LINK_TEXT,
  LOAD_ACCOUNT_TEXT,
  MONTHS_EMPTY_HEADING,
  MONTHS_EMPTY_TEXT,
  MONTHS_HEADING,
  rejectedAlert,
} from '../model/account-status';
import { ACCOUNT_HOME_STYLES } from './account-home.styles';

/**
 * H1 «Estado de cuenta» (CU-16) on the canvas «H1»: the notices of a payment not approved and of the
 * credit in favour (RN-38), «Lo que toca ahora» with its way to pay, correct or see the payment, and
 * «Tus meses» with their state, filter and actions. The guest is always the one of the session.
 */
@Component({
  selector: 'app-guest-home',
  imports: [
    LoadErrorComponent,
    NowPanelComponent,
    PageHeaderComponent,
    PageNoticeComponent,
    PeriodPaymentsComponent,
    RouterLink,
    SkeletonComponent,
    SkeletonContentDirective,
  ],
  templateUrl: './guest-home.component.html',
  styles: ACCOUNT_HOME_STYLES,
})
export class GuestHomeComponent {
  private readonly payments = inject(GuestPaymentsService);

  protected readonly title = ACCOUNT_TITLE;
  protected readonly loadErrorText = LOAD_ACCOUNT_TEXT;
  protected readonly monthsHeading = MONTHS_HEADING;
  protected readonly emptyHeading = MONTHS_EMPTY_HEADING;
  protected readonly emptyText = MONTHS_EMPTY_TEXT;
  protected readonly historyText = HISTORY_LINK_TEXT;

  private readonly loaded = new AsyncContentState<readonly PeriodStatus[]>();
  protected readonly view = this.loaded.state;
  protected readonly retrying = this.loaded.retrying;
  protected readonly refreshError = this.loaded.refreshError;
  protected readonly refreshing = this.loaded.refreshing;

  /**
   * The credit only adds a notice, so it is read on its own: slow, failed or never answered, the
   * months and their actions are there all the same. Null until it is read or if it cannot be.
   */
  private readonly creditRead = signal<GuestCredit | null>(null);
  private readonly creditRequest = new LatestRequest();

  private readonly periods = computed(() => this.loaded.data() ?? []);
  protected readonly rows = computed(() => accountRows(this.periods()));
  protected readonly now = computed(() => accountNow(this.periods(), new Date()));
  protected readonly rejected = computed(() => rejectedAlert(this.periods()));
  protected readonly credit = computed(() => creditNotice(this.creditRead(), this.periods()));

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
    void this.loadCredit();
    try {
      this.loaded.succeed(request, await firstValueFrom(this.payments.accountStatus()));
    } catch {
      this.loaded.fail(request, LOAD_ACCOUNT_TEXT);
    }
  }

  private async loadCredit(): Promise<void> {
    const request = this.creditRequest.begin();
    try {
      const credit = await firstValueFrom(this.payments.credit());
      if (this.creditRequest.isCurrent(request)) this.creditRead.set(credit);
    } catch {
      // Without the notice the page works the same.
    }
  }
}
