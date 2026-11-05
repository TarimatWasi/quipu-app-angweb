import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { AdminGuestsService } from '@core/api/clients/admin-guests.service';
import type {
  AccessGrant,
  GuestDetail,
  PeriodStatus,
  Stay,
  StayPage,
} from '@core/api/clients/admin-guests.service';
import { EmptyStateComponent } from '@shared/ui/empty-state/empty-state.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { ToastComponent } from '@shared/ui/toast/toast.component';
import { openAccountEmailDialog } from '../components/account-email-dialog.component';
import { openDeactivateGuestDialog } from '../components/deactivate-guest-dialog.component';
import { DetailNowPanelComponent } from '../components/detail-now-panel.component';
import { openGenerateAccessDialog } from '../components/generate-access-dialog.component';
import { GuestFactsComponent } from '../components/guest-facts.component';
import { GuestStaysComponent } from '../components/guest-stays.component';
import { MoreActionsComponent } from '../components/more-actions.component';
import { openPendingDebtDialog } from '../components/pending-debt-dialog.component';
import { PeriodPaymentsComponent } from '../components/period-payments.component';
import { AccessHandoffService, GENERATE_ACCESS_STATE } from '../data/access-handoff.service';
import {
  DEACTIVATED_TEXT,
  DETAIL_DEBT_TEXT,
  EMAIL_SAVED_TEXT,
  REACTIVATED_EXPIRED_TEXT,
} from '../model/detail-actions';
import { detailPanel, owesAnything } from '../model/detail-panel';
import type { DetailPanel, PanelAction } from '../model/detail-panel';
import { isAccessExpired } from '../model/guest-list-texts';
import { documentText, guestName } from '../model/guest-texts';
import { moreActions } from '../model/more-actions';
import type { DialogActionKind } from '../model/more-actions';
import { callFailure, pendingDebt, REACTIVATED_TEXT, reactivateProblem } from '../model/new-guest';
import { toPeriodRow } from '../model/period-rows';
import { toStayRow } from '../model/stay-rows';
import { GUEST_DETAIL_STYLES } from './guest-detail.styles';

type LoadState = 'loading' | 'ready' | 'not-found' | 'error';
/** What the left column shows: the months, the stays, the activation still to do, or nothing. */
type LeftColumn = 'periods' | 'stays' | 'blocked' | 'none';

interface DetailView {
  readonly guest: GuestDetail;
  readonly panel: DetailPanel;
  readonly left: LeftColumn;
}

interface Toast {
  readonly text: string;
  readonly tone: 'success' | null;
}

const LOAD_ERROR_TEXT = 'No se pudo cargar el huésped.';

function leftColumn(guest: GuestDetail, periods: readonly PeriodStatus[]): LeftColumn {
  if (guest.status === 'PENDING_ACTIVATION' || guest.status === 'ONBOARDING') return 'blocked';
  if (guest.type === 'TEMPORARY') return 'stays';
  return guest.status === 'ACTIVE' || periods.length > 0 ? 'periods' : 'none';
}

/** Whether the guest has months or stays to read besides its detail. */
function chargesKind(guest: GuestDetail): 'periods' | 'stays' | null {
  if (guest.status !== 'ACTIVE' && guest.status !== 'INACTIVE') return null;
  return guest.type === 'CONTRACT' ? 'periods' : 'stays';
}

/**
 * A3.2 «Detalle del huésped» (CU-06, RF-10) on the canvas «HuespedDetalle»: what comes first for
 * this guest, its months or stays, its facts, its contract and its registration, and the actions
 * of the administrator: deactivate (A3.3), a new access (A3.4, handed to A3.7 in memory), the
 * account email, reactivate (A3.6, with its debt first) and the stays of A3.5. Ids are opaque.
 */
@Component({
  selector: 'app-guest-detail',
  imports: [
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
    ToastComponent,
  ],
  templateUrl: './guest-detail.component.html',
  styles: GUEST_DETAIL_STYLES,
})
export class GuestDetailComponent implements OnInit {
  private readonly guests = inject(AdminGuestsService);
  private readonly handoff = inject(AccessHandoffService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly state = signal<LoadState>('loading');
  protected readonly guest = signal<GuestDetail | null>(null);
  private readonly periods = signal<readonly PeriodStatus[]>([]);
  private readonly stays = signal<readonly Stay[]>([]);
  protected readonly staysCursor = signal<string | null>(null);
  protected readonly loadingMore = signal(false);
  protected readonly moreError = signal(false);
  private readonly now = signal(new Date());
  /** Reactivated from this page: an expired access then says it expired while inactive. */
  private readonly reactivated = signal(false);
  protected readonly busy = signal(false);
  protected readonly toast = signal<Toast | null>(null);

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
    this.periods().map((item) => toPeriodRow(item, this.currentId)),
  );
  protected readonly stayRows = computed(() =>
    this.stays().map((stay) => toStayRow(stay, this.currentId)),
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

  private currentId = '';
  // Moves with every load, so a late answer for a previous guest is ignored.
  private request = 0;
  // Moves with every page of stays, so a late page of a previous load is ignored.
  private staysRequest = 0;
  /**
   * A3.7 asked for «Generar otro acceso»: it opens once the guest is loaded. Read while the page is
   * created, when the navigation that brings it is still the current one.
   */
  private accessAsked =
    this.router.currentNavigation()?.extras.state?.[GENERATE_ACCESS_STATE] === true;

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.load(params.get('id') ?? '');
    });
  }

  protected retry(): void {
    void this.load(this.currentId);
  }

  protected onPanelAction(action: PanelAction): void {
    if (action.kind === 'generate-access') this.openAccess();
    if (action.kind === 'reactivate') void this.reactivate();
  }

  protected onMoreAction(kind: DialogActionKind): void {
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

  protected async moreStays(): Promise<void> {
    const cursor = this.staysCursor();
    if (cursor === null || this.loadingMore()) return;
    const request = ++this.staysRequest;
    this.loadingMore.set(true);
    this.moreError.set(false);
    try {
      const page = await firstValueFrom(this.guests.stays(this.currentId, cursor));
      if (request !== this.staysRequest) return;
      this.stays.update((current) => [...current, ...page.content]);
      this.staysCursor.set(page.nextCursor);
    } catch {
      if (request === this.staysRequest) this.moreError.set(true);
    } finally {
      if (request === this.staysRequest) this.loadingMore.set(false);
    }
  }

  /** Loads the guest and what its panel needs; `quiet` keeps the page on screen meanwhile. */
  private async load(id: string, quiet = false): Promise<void> {
    const request = ++this.request;
    this.staysRequest++;
    this.currentId = id;
    if (!quiet) this.reset();
    try {
      const guest = await firstValueFrom(this.guests.get(id));
      const kind = chargesKind(guest);
      const [periods, page] = await Promise.all([
        firstValueFrom(kind === 'periods' ? this.guests.accountStatus(id) : of([])),
        firstValueFrom(kind === 'stays' ? this.guests.stays(id) : of<StayPage | null>(null)),
      ]);
      if (request !== this.request) return;
      this.show(guest, periods, page);
    } catch (error: unknown) {
      if (request !== this.request) return;
      const notFound = error instanceof HttpErrorResponse && error.status === 404;
      this.state.set(notFound ? 'not-found' : 'error');
      if (!notFound) this.guest.set(null);
    }
  }

  private reset(): void {
    this.state.set('loading');
    this.guest.set(null);
    this.periods.set([]);
    this.stays.set([]);
    this.staysCursor.set(null);
    this.reactivated.set(false);
  }

  private show(guest: GuestDetail, periods: readonly PeriodStatus[], page: StayPage | null): void {
    this.now.set(new Date());
    this.guest.set(guest);
    this.periods.set(periods);
    this.stays.set(page?.content ?? []);
    this.staysCursor.set(page?.nextCursor ?? null);
    this.loadingMore.set(false);
    this.moreError.set(false);
    this.state.set('ready');
    if (this.accessAsked) {
      this.accessAsked = false;
      if (guest.status !== 'INACTIVE') this.openAccess();
    }
  }

  private say(text: string, tone: 'success' | null = 'success'): void {
    this.toast.set({ text, tone });
  }

  /** A3.4: the access goes to A3.7 in memory only; the address carries just the guest id. */
  private openAccess(): void {
    const guest = this.guest();
    if (guest === null) return;
    openGenerateAccessDialog(this.dialog, {
      active: guest.status === 'ACTIVE',
      generate: (mode) => this.guests.generateAccess(guest.id, mode),
    })
      .afterClosed()
      .subscribe((access) => {
        if (access) void this.handOver(guest, access);
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
      contactEmail: guest.accountEmail ?? null,
      access,
      regenerated: true,
    });
    await this.router.navigate(['/admin/guests', guest.id, 'access']);
  }

  private openAccountEmail(): void {
    const guest = this.guest();
    if (guest === null) return;
    openAccountEmailDialog(this.dialog, {
      current: guest.accountEmail ?? null,
      save: (email) => this.guests.setAccountEmail(guest.id, email),
    })
      .afterClosed()
      .subscribe((saved) => {
        if (saved !== true) return;
        this.say(EMAIL_SAVED_TEXT);
        void this.load(guest.id, true);
      });
  }

  private openDeactivate(): void {
    const guest = this.guest();
    if (guest === null) return;
    openDeactivateGuestDialog(this.dialog, {
      who: guestName(guest),
      blocked: guest.contract?.status === 'ACTIVE',
      deactivate: () => this.guests.deactivate(guest.id),
    })
      .afterClosed()
      .subscribe((done) => {
        if (done !== true) return;
        this.say(DEACTIVATED_TEXT);
        void this.load(guest.id, true);
      });
  }

  /** A3.6, without a confirmation (CU-28): a debt is explained first (RN-35). */
  private async reactivate(): Promise<void> {
    const guest = this.guest();
    if (guest === null || this.busy()) return;
    this.busy.set(true);
    try {
      const summary = await firstValueFrom(this.guests.reactivate(guest.id));
      this.reactivated.set(true);
      await this.load(guest.id, true);
      const expiresAt = this.guest()?.accessExpiresAt ?? null;
      const expired =
        summary.status === 'PENDING_ACTIVATION' &&
        (expiresAt === null || isAccessExpired(expiresAt, new Date()));
      this.say(expired ? REACTIVATED_EXPIRED_TEXT : REACTIVATED_TEXT);
    } catch (error: unknown) {
      this.reactivateFailed(guest, error);
    } finally {
      this.busy.set(false);
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
    openPendingDebtDialog(this.dialog, {
      document: documentText(guest),
      debt,
      text: DETAIL_DEBT_TEXT,
    })
      .afterClosed()
      .subscribe((pay) => {
        if (pay === true) {
          void this.router.navigate(['/admin/payments/new'], {
            queryParams: { guestId: guest.id },
          });
        }
      });
  }
}
