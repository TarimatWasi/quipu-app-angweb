import { Component, computed, DestroyRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, of } from 'rxjs';
import { AsyncContentState } from '@shared/data/async-content';
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

interface AccountData {
  readonly periods: readonly PeriodStatus[];
  /** Null when it could not be read: the home works the same, without its notice. */
  readonly credit: GuestCredit | null;
}

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

  private readonly loaded = new AsyncContentState<AccountData>();
  protected readonly view = this.loaded.state;
  protected readonly retrying = this.loaded.retrying;
  protected readonly refreshError = this.loaded.refreshError;
  protected readonly refreshing = this.loaded.refreshing;

  private readonly periods = computed(() => this.loaded.data()?.periods ?? []);
  protected readonly rows = computed(() => accountRows(this.periods()));
  protected readonly now = computed(() => accountNow(this.periods(), new Date()));
  protected readonly rejected = computed(() => rejectedAlert(this.periods()));
  protected readonly credit = computed(() =>
    creditNotice(this.loaded.data()?.credit ?? null, this.periods()),
  );

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
      const data = await firstValueFrom(
        forkJoin({
          periods: this.payments.accountStatus(),
          // The credit only adds a notice: without it the months still read.
          credit: this.payments.credit().pipe(catchError(() => of(null))),
        }),
      );
      this.loaded.succeed(request, data);
    } catch {
      this.loaded.fail(request, LOAD_ACCOUNT_TEXT);
    }
  }
}
