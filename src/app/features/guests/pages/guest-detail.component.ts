import { ResourceContent } from '@shared/data/resource-content';
import { RefreshErrorComponent } from '@shared/ui/refresh-error/refresh-error.component';
import { NowPanelComponent } from '@shared/ui/now-panel/now-panel.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonCardsComponent } from '@shared/ui/skeleton/skeleton-cards.component';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, map, of, switchMap, tap, throwError } from 'rxjs';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import type {
  AccessGrant,
  GuestDetail,
  PeriodStatus,
  Stay,
} from '@core/api/clients/admin-guests.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { openAccountEmailDialog } from '../components/account-email-dialog.component';
import { openDeactivateGuestDialog } from '../components/deactivate-guest-dialog.component';
import { DetailNowPanelComponent } from '../components/detail-now-panel.component';
import { openGenerateAccessDialog } from '../components/generate-access-dialog.component';
import { GuestFactsComponent } from '../components/guest-facts.component';
import { GuestStaysComponent } from '../components/guest-stays.component';
import { MoreActionsComponent } from '../components/more-actions.component';
import { openPendingDebtDialog } from '../components/pending-debt-dialog.component';
import { PeriodPaymentsComponent } from '@shared/payments/period-payments.component';
import { AccessHandoffService, GENERATE_ACCESS_STATE } from '../data/access-handoff.service';
import {
  DEACTIVATED_TEXT,
  DETAIL_DEBT_TEXT,
  EMAIL_SAVED_TEXT,
  REACTIVATED_EXPIRED_TEXT,
} from '../model/detail-actions';
import { detailPanel, owesAnything } from '../model/detail-panel';
import type { PanelAction } from '../model/detail-panel';
import { isAccessExpired } from '../model/guest-list-texts';
import { documentText, guestName } from '../model/guest-texts';
import { moreActions } from '../model/more-actions';
import type { DialogActionKind } from '../model/more-actions';
import { callFailure, pendingDebt, REACTIVATED_TEXT, reactivateProblem } from '../model/new-guest';
import { toPeriodRow } from '@shared/payments/period-rows';
import { toStayRow } from '../model/stay-rows';
import { GUEST_DETAIL_STYLES } from './guest-detail.styles';
import { ToastService } from '@shared/ui/toast/toast.service';
import {
  ACCESS_CLOCK_MS,
  CLOCK_MS,
  chargesKind,
  DetailView,
  leftColumn,
  LOAD_ERROR_TEXT,
  LoadState,
} from '../model/guest-detail-view';

/**
 * A3.2 «Detalle del huésped» (CU-06, RF-10) on the canvas «HuespedDetalle»: what comes first for
 * this guest, its months or stays, its facts, its contract and its registration, and the actions
 * of the administrator: deactivate (A3.3), a new access (A3.4, handed to A3.7 in memory), the
 * account email, reactivate (A3.6, with its debt first) and the stays of A3.5. Ids are opaque.
 */
/** What the page reads at once: the guest and what its panel needs. */
interface Loaded {
  readonly guest: GuestDetail;
  readonly periods: readonly PeriodStatus[];
  readonly stays: readonly Stay[];
}

@Component({
  selector: 'app-guest-detail',
  imports: [
    RefreshErrorComponent,
    NowPanelComponent,
    SkeletonCardsComponent,
    SkeletonFactsComponent,
    SkeletonContentDirective,
    DetailNowPanelComponent,
    EmptyStateComponent,
    GuestFactsComponent,
    GuestStaysComponent,
    LoadErrorComponent,
    MoreActionsComponent,
    PageHeaderComponent,
    PeriodPaymentsComponent,
    RouterLink,
    SkeletonComponent,
  ],
  templateUrl: './guest-detail.component.html',
  styles: GUEST_DETAIL_STYLES,
})
export class GuestDetailComponent {
  private readonly guests = inject(AdminGuestsService);
  private readonly handoff = inject(AccessHandoffService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  private readonly currentId = signal('');
  private readonly now = signal(new Date());
  /** Reactivated from this page: an expired access then says it expired while inactive. */
  private readonly reactivated = signal(false);
  protected readonly busy = signal(false);
  /** The guest as soon as it arrives, while what its panel needs is still being read. */
  private readonly arriving = signal<GuestDetail | null>(null);
  /** Who waits for the read in course to be over (a reactivation words its notice with it). */
  private waiting: (() => void)[] = [];
  /**
   * The guest of the address and what its panel needs (its months or its stays), read again for
   * another guest; the read of the guest left behind is cancelled with it.
   */
  private readonly read = rxResource<Loaded, string | undefined>({
    params: () => this.currentId() || undefined,
    stream: ({ params: id }) =>
      this.guests.get(id).pipe(
        tap((guest) => {
          this.arriving.set(guest);
        }),
        switchMap((guest) => {
          const kind = chargesKind(guest);
          return forkJoin({
            periods: kind === 'periods' ? this.guests.accountStatus(id) : of<PeriodStatus[]>([]),
            stays: kind === 'stays' ? this.guests.allStays(id) : of<Stay[]>([]),
          }).pipe(map(({ periods, stays }) => ({ guest, periods, stays })));
        }),
        tap(({ guest }) => {
          this.shown(guest);
          this.over();
        }),
        catchError((error: unknown) => {
          this.arriving.set(null);
          this.over();
          return throwError(() => error);
        }),
      ),
  });
  private readonly content = new ResourceContent(this.read, {
    message: () => LOAD_ERROR_TEXT,
    identity: this.currentId,
  });
  protected readonly retrying = this.content.retrying;
  protected readonly refreshing = this.content.refreshing;
  /** A 404 is not a refresh that failed: the guest is gone and the page says so instead. */
  private readonly gone = computed(() => {
    const error = this.content.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly refreshError = computed(() =>
    this.gone() || this.content.refreshError() === null ? null : this.loadErrorText,
  );
  protected readonly state = computed<LoadState>(() => {
    const status = this.content.state().status;
    if (status === 'initial-loading') return 'loading';
    if (this.gone() && !this.refreshing() && !this.retrying()) return 'not-found';
    return status === 'initial-error' ? 'error' : 'ready';
  });
  protected readonly guest = computed(() => this.content.data()?.guest ?? this.arriving());
  private readonly periods = computed(() => this.content.data()?.periods ?? []);
  private readonly stays = computed(() => this.content.data()?.stays ?? []);
  private readonly toasts = inject(ToastService);

  protected readonly title = computed(() => {
    const guest = this.guest();
    return guest ? guestName(guest) : 'Huésped';
  });
  protected readonly view = computed<DetailView | null>(() => {
    const guest = this.guest();
    if (guest === null) return null;
    const panel = detailPanel({
      guest,
      periods: this.periods(),
      stays: this.stays(),
      now: this.now(),
      reactivated: this.reactivated(),
    });
    return { guest, panel, left: leftColumn(guest, this.periods()) };
  });
  protected readonly periodRows = computed(() =>
    this.periods().map((item) => toPeriodRow(item, this.currentId())),
  );
  protected readonly stayRows = computed(() =>
    this.stays().map((stay) => toStayRow(stay, this.currentId())),
  );
  protected readonly blocked = computed(() =>
    this.guest()?.type === 'TEMPORARY'
      ? {
          title: 'Estadías y pagos',
          text: 'Hasta que termine su registro no se le puede registrar una estadía ni pagos.',
        }
      : {
          title: 'Contrato y pagos',
          text: 'Hasta que termine su registro no se le puede cargar un contrato ni registrar pagos.',
        },
  );
  protected readonly actions = computed(() => {
    const view = this.view();
    if (view === null) return [];
    return moreActions({
      guest: view.guest,
      panelGenerates: view.panel.action?.kind === 'generate-access',
      owes: owesAnything({ guest: view.guest, periods: this.periods(), stays: this.stays() }),
    });
  });

  private readonly dialogs = new Set<MatDialogRef<unknown, unknown>>();
  /**
   * A3.7 asked for «Generar otro acceso»: it opens once the guest is loaded. Read while the page is
   * created, when the navigation that brings it is still the current one.
   */
  private accessAsked =
    this.router.currentNavigation()?.extras.state?.[GENERATE_ACCESS_STATE] === true;

  constructor() {
    // The time left of an access follows the clock while the page is open: every second while the
    // guest has an access to use (the countdown), and calmly for the rest of the screen.
    let ticks = 0;
    const clock = setInterval(() => {
      ticks++;
      if (
        this.guest()?.status === 'PENDING_ACTIVATION' ||
        ticks % (CLOCK_MS / ACCESS_CLOCK_MS) === 0
      ) {
        this.now.set(new Date());
      }
    }, ACCESS_CLOCK_MS);
    this.destroyRef.onDestroy(() => {
      clearInterval(clock);
      // Leaving the screen: no late answer may load, open a dialog or navigate any more.
      this.closeDialogs();
    });
  }

  /** The reads start with the page, from a field: not in `ngOnInit` (FE-ANG-CMP-10) nor in the constructor. */
  protected readonly started = this.start();

  private start(): true {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id') ?? '';
      // The dialogs of the guest left behind go with it.
      if (id !== this.currentId()) this.closeDialogs();
      this.reset();
      this.currentId.set(id);
    });
    return true;
  }

  protected retry(): void {
    if (this.retrying() || this.refreshing()) return;
    this.content.retry();
  }

  protected onPanelAction(action: PanelAction): void {
    if (this.refreshing() || this.refreshError() !== null) return;
    if (action.kind === 'generate-access') this.openAccess();
    if (action.kind === 'reactivate') void this.reactivate();
  }

  protected onMoreAction(kind: DialogActionKind): void {
    if (this.refreshing() || this.refreshError() !== null) return;
    switch (kind) {
      case 'generate-access':
        this.openAccess();
        return;
      case 'account-email':
        this.openAccountEmail();
        return;
      case 'deactivate':
        this.openDeactivate();
        return;
      case 'reactivate':
        void this.reactivate();
    }
  }

  /** Another guest: nothing of the previous one counts (what was reactivated, a write in course). */
  private reset(): void {
    this.arriving.set(null);
    this.reactivated.set(false);
    this.busy.set(false);
  }

  /** The read in course is over, well or not: who waited for it goes on. */
  private over(): void {
    const waiting = this.waiting;
    this.waiting = [];
    for (const resolve of waiting) resolve();
  }

  /** The guest and its panel are on screen: «Generar otro acceso» asked by A3.7 opens now. */
  private shown(guest: GuestDetail): void {
    this.now.set(new Date());
    if (this.accessAsked) {
      this.accessAsked = false;
      if (guest.status !== 'INACTIVE') this.openAccess();
    }
  }

  /**
   * Whether the page is still open and still shows `id`. An action of a guest left behind answers
   * late: its answer must neither reload that guest under the address of another one nor open its
   * dialogs or navigate.
   */
  private showing(id: string): boolean {
    return !this.destroyRef.destroyed && id === this.currentId();
  }

  /** Keeps a dialog of this guest, so it closes when the page moves to another one. */
  private track<T, R>(ref: MatDialogRef<T, R>): MatDialogRef<T, R> {
    this.dialogs.add(ref);
    ref.afterClosed().subscribe(() => {
      this.dialogs.delete(ref);
    });
    return ref;
  }

  private closeDialogs(): void {
    for (const ref of this.dialogs) ref.close();
    this.dialogs.clear();
  }

  private say(text: string, tone: 'success' | null = 'success'): void {
    this.toasts.show(text, { tone });
  }

  /** A3.4: the access goes to A3.7 in memory only; the address carries just the guest id. */
  private openAccess(): void {
    const guest = this.guest();
    if (guest === null) return;
    this.track(
      openGenerateAccessDialog(this.dialog, {
        active: guest.status === 'ACTIVE',
        generate: (mode) => this.guests.generateAccess(guest.id, mode),
      }),
    )
      .afterClosed()
      .subscribe((access) => {
        if (access && this.showing(guest.id)) void this.handOver(guest, access);
      });
  }

  private async handOver(guest: GuestDetail, access: AccessGrant): Promise<void> {
    this.handoff.put({
      guestId: guest.id,
      documentType: guest.documentType,
      documentNumber: guest.documentNumber,
      type: guest.type,
      phone: guest.phone?.trim() ? guest.phone.trim() : null,
      // The access also goes to the account email, if it has one (RF-16).
      email: guest.email ?? null,
      access,
      regenerated: true,
    });
    await this.router.navigate(['/admin/guests', guest.id, 'access']);
  }

  private openAccountEmail(): void {
    const guest = this.guest();
    if (guest === null) return;
    this.track(
      openAccountEmailDialog(this.dialog, {
        current: guest.email ?? null,
        save: (email) => this.guests.setAccountEmail(guest.id, email),
      }),
    )
      .afterClosed()
      .subscribe((saved) => {
        if (saved !== true || !this.showing(guest.id)) return;
        this.say(EMAIL_SAVED_TEXT);
        this.content.reload();
      });
  }

  private openDeactivate(): void {
    const guest = this.guest();
    if (guest === null) return;
    this.track(
      openDeactivateGuestDialog(this.dialog, {
        who: guestName(guest),
        blocked: guest.contract?.status === 'ACTIVE',
        contractId: guest.contract?.status === 'ACTIVE' ? guest.contract.id : null,
        deactivate: () => this.guests.deactivate(guest.id),
      }),
    )
      .afterClosed()
      .subscribe((done) => {
        if (done !== true || !this.showing(guest.id)) return;
        this.say(DEACTIVATED_TEXT);
        this.content.reload();
      });
  }

  /** A3.6, without a confirmation (CU-28): a debt is explained first (RN-35). */
  private async reactivate(): Promise<void> {
    const guest = this.guest();
    if (guest === null || this.busy()) return;
    this.busy.set(true);
    try {
      const summary = await firstValueFrom(this.guests.reactivate(guest.id));
      if (!this.showing(guest.id)) return;
      this.reactivated.set(true);
      await new Promise<void>((resolve) => {
        this.waiting.push(resolve);
        this.content.reload();
      });
      if (!this.showing(guest.id)) return;
      const expiresAt = this.guest()?.accessExpiresAt ?? null;
      const expired =
        summary.status === 'PENDING_ACTIVATION' &&
        (expiresAt === null || isAccessExpired(expiresAt, new Date()));
      this.say(expired ? REACTIVATED_EXPIRED_TEXT : REACTIVATED_TEXT);
    } catch (error: unknown) {
      if (this.showing(guest.id)) this.reactivateFailed(guest, error);
    } finally {
      // A new guest has its own state already (reset on load): only this guest's wait ends.
      if (this.showing(guest.id)) this.busy.set(false);
    }
  }

  private reactivateFailed(guest: GuestDetail, error: unknown): void {
    // A 401 is the session interceptor's: it already goes to the login.
    if (error instanceof HttpErrorResponse && error.status === 401) return;
    const failure = callFailure(error);
    const debt = pendingDebt(failure);
    if (debt === null) {
      this.say(reactivateProblem(failure), null);
      return;
    }
    this.track(
      openPendingDebtDialog(this.dialog, {
        document: documentText(guest),
        debt,
        text: DETAIL_DEBT_TEXT,
      }),
    )
      .afterClosed()
      .subscribe((pay) => {
        if (pay === true && this.showing(guest.id)) {
          void this.router.navigate(['/admin/payments/new'], {
            queryParams: { guestId: guest.id },
          });
        }
      });
  }
}
