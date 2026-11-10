import { ResourceContent } from '@shared/data/resource-content';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonFieldsComponent } from '@shared/ui/skeleton/skeleton-fields.component';
import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { AdminPaymentsService } from '../data/admin-payments.service';
import type { PaymentDetail } from '../data/admin-payments.service';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { isConcurrentModification } from '@core/http/concurrent-modification';
import { openConcurrentModificationDialog } from '@shared/concurrent-modification/concurrent-modification-dialog.component';
import { balanceOf, formatMoney, parseAmount } from '@shared/payments/payment-format';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { MAX_PROOFS } from '@shared/payments/proof-rules';
import { isQueueView } from '../model/queue-views';
import { openAddProofDialog } from '../components/add-proof-dialog.component';
import { openPaymentNoticeDialog } from '@shared/payments/payment-notice-dialog.component';
import { openRejectDialog } from '../components/reject-dialog.component';
import { ReviewAmountsComponent } from '../components/review-amounts.component';
import type { TypedAmount } from '../components/review-amounts.component';
import { ReviewProofsComponent } from '../components/review-proofs.component';
import {
  added,
  amountTexts,
  approvedNotice,
  balanceNotice,
  decisionHelp,
  kept,
  LoadState,
  LOAD_ERROR_TEXT,
  Notice,
  NOTICES,
  Outcome,
  payingFacts,
  proofEntries,
  resolvedText,
  verifiedTotal,
} from '../model/payment-review';
import { ToastService } from '@shared/ui/toast/toast.service';

/**
 * A5.2 (CU-05, RN-16): the proofs of a payment with their declared and verified amounts, what is
 * due, and the decision. A rejected payment is corrected here too (TAR-239): a proof is added and
 * it is approved or rejected again. Ids are opaque and travel as they came.
 */
@Component({
  selector: 'app-payment-review',
  imports: [
    SkeletonFieldsComponent,
    SkeletonFactsComponent,
    SkeletonBlockComponent,
    SkeletonContentDirective,
    FactTileComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    PageNoticeComponent,
    ReviewAmountsComponent,
    ReviewProofsComponent,
    RouterLink,
    SkeletonComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './payment-review.component.html',
  styleUrl: './payment-review.component.scss',
})
export class PaymentReviewComponent {
  private readonly payments = inject(AdminPaymentsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly maxProofs = MAX_PROOFS;
  protected readonly loadErrorText = LOAD_ERROR_TEXT;
  protected readonly amounts = signal<Readonly<Record<string, string>>>({});
  protected readonly busy = signal(false);

  private readonly currentId = signal('');
  /** Whether the next answer keeps the amounts being typed (only after a correction). */
  private keepDrafts = false;
  /**
   * The payment of the address, read again for another one (history, «Revisar el siguiente»); a
   * late answer of the previous one is cancelled with it. Its answer sets the amounts to verify.
   */
  private readonly read = rxResource<PaymentDetail, string | undefined>({
    params: () => this.currentId() || undefined,
    stream: ({ params: id }) =>
      this.payments.get(id).pipe(
        tap((payment) => {
          const keep = this.keepDrafts;
          this.keepDrafts = false;
          this.amounts.update((current) => amountTexts(payment.proofs, keep ? current : {}));
        }),
      ),
  });
  private readonly content = new ResourceContent(this.read, {
    message: (error) => toBffErrorWithServerMessage(error).message,
    identity: this.currentId,
  });
  protected readonly payment = this.content.data;
  protected readonly retrying = this.content.retrying;
  protected readonly refreshing = this.content.refreshing;
  /** A 404 is not a refresh that failed: the payment is gone and the page says so instead. */
  private readonly gone = computed(() => {
    const error = this.content.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly refreshError = computed(() =>
    this.gone() || this.content.refreshError() === null ? null : this.loadErrorText,
  );
  protected readonly state = computed<LoadState>(() => {
    const state = this.content.state();
    if (state.status === 'initial-loading') return { kind: 'loading' };
    if (this.gone() && !this.refreshing() && !this.retrying()) return { kind: 'not-found' };
    if (state.status === 'initial-error') return { kind: 'error', message: state.message };
    return { kind: 'ready' };
  });
  protected readonly blocked = computed(
    () => this.busy() || this.refreshing() || this.refreshError() !== null,
  );
  protected readonly actionError = signal<string | null>(null);
  protected readonly outcome = signal<Outcome | null>(null);
  protected readonly noneLeft = signal(false);

  protected readonly entries = computed(() => proofEntries(this.payment()?.proofs ?? []));
  protected readonly facts = computed(() => {
    const payment = this.payment();
    return payment ? payingFacts(payment) : null;
  });
  protected readonly invalidIds = computed(() => {
    const texts = this.amounts();
    const ids = (this.payment()?.proofs ?? []).map((proof) => proof.id);
    return new Set(ids.filter((id) => parseAmount(texts[id] ?? '') === null));
  });
  protected readonly declaredTotal = computed(() =>
    formatMoney(
      (this.payment()?.proofs ?? []).reduce((sum, proof) => sum + proof.declaredAmount, 0),
    ),
  );
  private readonly verifiedSum = computed(() =>
    verifiedTotal(this.payment()?.proofs ?? [], this.amounts()),
  );
  protected readonly verifiedTotalText = computed(() => formatMoney(this.verifiedSum()));
  private readonly rawBalance = computed(() => {
    const payment = this.payment();
    return payment ? balanceOf(this.verifiedSum(), payment.amountDue, payment.lastPeriod) : null;
  });
  /** The balance under the amounts: what the BFF saved once approved, the typed one before. */
  protected readonly balance = computed(() => {
    const payment = this.payment();
    const balance = this.rawBalance();
    if (!payment || !balance) return null;
    if (payment.status === 'APPROVED') return approvedNotice(payment.surplus);
    return balanceNotice(balance, payment.guestType === 'TEMPORARY');
  });
  /** A voucher whose file cannot be shown: it has to be seen before approving. */
  private readonly unseenVoucher = computed(() =>
    this.entries().some((entry) => entry.view === 'missing'),
  );
  protected readonly help = computed(() => decisionHelp(this.rawBalance(), this.unseenVoucher()));
  protected readonly decisionTitle = computed(() => {
    return this.payment()?.status === 'REJECTED' && this.outcome() === null
      ? 'Corregir y decidir'
      : 'Decisión';
  });
  /** «Rechazado el 5 oct 2026, 08:40 por Rosa Quispe.» of a payment already resolved. */
  protected readonly resolved = computed(() => {
    const payment = this.payment();
    if (!payment || payment.status === 'PENDING') return '';
    return resolvedText(payment.status, payment.reviewedAt, payment.reviewedBy?.name);
  });
  protected readonly outcomeText = computed(() => {
    const done = this.outcome();
    const name = this.payment()?.guestName ?? 'El huésped';
    return done === 'REJECTED'
      ? `${name} verá el motivo en su inicio y podrá corregirlo.`
      : 'Quedó registrado con los montos verificados.';
  });
  /** Pending or rejected, and not decided on this visit: the decision can still be taken. */
  protected readonly editable = computed(
    () => this.payment()?.status !== 'APPROVED' && this.outcome() === null,
  );
  protected readonly canApprove = computed(
    () =>
      this.editable() &&
      !this.blocked() &&
      (this.payment()?.proofs.length ?? 0) > 0 &&
      this.invalidIds().size === 0 &&
      !this.unseenVoucher() &&
      this.rawBalance()?.kind !== 'short',
  );
  protected readonly atProofLimit = computed(
    () => (this.payment()?.proofs.length ?? 0) >= MAX_PROOFS,
  );

  /** The view of A5 the payment was opened from, so "Volver a Pagos" returns to it. */
  protected readonly backQuery: Readonly<Record<string, string>>;
  // Moves each time another payment opens in this same component (history, "Revisar el siguiente"):
  // a write or a dialog of the previous payment must not act on the new one.
  private visit = 0;

  constructor() {
    const route = inject(ActivatedRoute);
    const view = route.snapshot.queryParamMap.get('vista');
    this.backQuery = view !== null && isQueueView(view) ? { vista: view } : {};
    // Leaving the page counts as another visit too: late answers of this one are ignored.
    inject(DestroyRef).onDestroy(() => {
      this.visit++;
    });
    route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.visit++;
      this.busy.set(false);
      this.outcome.set(null);
      this.noneLeft.set(false);
      this.actionError.set(null);
      this.amounts.set({});
      this.currentId.set(params.get('id') ?? '');
    });
  }

  protected typed({ id, text }: TypedAmount): void {
    this.amounts.update((texts) => ({ ...texts, [id]: text }));
  }

  protected async approve(): Promise<void> {
    const payment = this.payment();
    if (!payment || !this.canApprove()) return;
    const texts = this.amounts();
    const proofs = payment.proofs.map((proof) => ({
      id: proof.id,
      verifiedAmount: parseAmount(texts[proof.id] ?? '') ?? 0,
    }));
    await this.resolve(this.payments.approve(payment.id, proofs), 'APPROVED');
  }

  protected async reject(): Promise<void> {
    const payment = this.payment();
    if (!payment || !this.editable() || this.blocked()) return;
    const visit = this.visit;
    const ref = openRejectDialog(this.dialog, {
      again: payment.status === 'REJECTED',
      guest: payment.guestName?.split(' ')[0] ?? null,
    });
    const reason = await firstValueFrom(ref.afterClosed());
    if (reason && visit === this.visit) {
      await this.resolve(this.payments.reject(payment.id, reason), 'REJECTED');
    }
  }

  protected async addProof(): Promise<void> {
    const payment = this.payment();
    if (!payment || !this.editable() || this.blocked() || this.atProofLimit()) return;
    const balance = this.rawBalance();
    const missing = balance?.kind === 'short' ? balance.difference : 0;
    const visit = this.visit;
    const proof = await firstValueFrom(openAddProofDialog(this.dialog, { missing }).afterClosed());
    if (!proof || visit !== this.visit) return;
    const proofs = [...payment.proofs.map(kept), added(proof)];
    const saved = await this.run(
      this.payments.correctProofs(payment.id, proofs, proof.file ? [proof.file] : []),
    );
    if (saved) {
      this.toasts.show('Comprobante agregado.');
      await this.refresh(true);
    }
  }

  protected async reviewNext(): Promise<void> {
    const visit = this.visit;
    this.busy.set(true);
    this.actionError.set(null);
    try {
      const id = await firstValueFrom(this.payments.oldestPendingId());
      // The administrator went elsewhere meanwhile: never pull them back into a payment.
      if (visit !== this.visit) return;
      if (id === null) {
        this.noneLeft.set(true);
      } else {
        await this.router.navigate(['/admin/payments', id], { queryParams: this.backQuery });
      }
    } catch (error: unknown) {
      if (visit === this.visit) this.actionError.set(toBffErrorWithServerMessage(error).message);
    } finally {
      if (visit === this.visit) this.busy.set(false);
    }
  }

  protected retry(): void {
    if (this.retrying() || this.refreshing()) return;
    this.content.retry();
  }

  private async resolve(call: Observable<unknown>, outcome: Outcome): Promise<void> {
    if (await this.run(call)) {
      this.outcome.set(outcome);
      this.focus('#payment-outcome');
      await this.refresh();
    }
  }

  /** Runs a write; on failure shows what the BFF said the way the SRS asks, and answers false. */
  private async run(call: Observable<unknown>): Promise<boolean> {
    const visit = this.visit;
    this.busy.set(true);
    this.actionError.set(null);
    let failure: { readonly error: unknown } | null = null;
    try {
      await firstValueFrom(call);
    } catch (error: unknown) {
      failure = { error };
    } finally {
      if (visit === this.visit) this.busy.set(false);
    }
    // Another payment is open now: this answer belongs to the previous one.
    if (visit !== this.visit) return false;
    // Handled once the write is over, so a follow-up ("Rechazar con motivo") is not blocked.
    if (failure) {
      await this.failed(failure.error);
      return false;
    }
    return true;
  }

  private async failed(error: unknown): Promise<void> {
    if (isConcurrentModification(error)) {
      return this.concurrent();
    }
    const { code, message } = toBffErrorWithServerMessage(error);
    const notice = NOTICES[code];
    if (notice) {
      return this.notice(code, notice);
    }
    const notFound = error instanceof HttpErrorResponse && error.status === 404;
    if (notFound || code === 'FILE_STORAGE_UNAVAILABLE') {
      this.toasts.show(message);
      if (notFound)
        await this.router.navigate(['/admin/payments'], { queryParams: this.backQuery });
      return;
    }
    this.actionError.set(message);
    this.focus('#payment-action-error');
  }

  private async concurrent(): Promise<void> {
    const visit = this.visit;
    const ref = openConcurrentModificationDialog(this.dialog, {
      title: 'El pago cambió',
      backLabel: 'Volver a Pagos',
    });
    const choice = await firstValueFrom(ref.afterClosed());
    if (visit !== this.visit) return;
    if (choice === 'reload') {
      this.reload();
    } else if (choice === 'back') {
      await this.router.navigate(['/admin/payments'], { queryParams: this.backQuery });
    }
  }

  private async notice(code: string, notice: Notice): Promise<void> {
    const visit = this.visit;
    const ref = openPaymentNoticeDialog(this.dialog, {
      title: notice.title,
      message: notice.text,
      actions: notice.actions,
    });
    const choice = await firstValueFrom(ref.afterClosed());
    if (visit !== this.visit) return;
    if (choice === 'back') {
      await this.router.navigate(['/admin/payments'], { queryParams: this.backQuery });
    } else if (choice === 'reject') {
      await this.reject();
    } else if (code === 'PAYMENT_ALREADY_RESOLVED' || code === 'PAYMENT_NOT_CORRECTABLE') {
      // The payment changed state: show it as it is now (read-only once approved).
      await this.refresh();
    }
  }

  /**
   * Reloads the payment after a write, keeping the page. Every write stays disabled until the new
   * detail arrives: a correction replaces the whole set of proofs, so one sent from the old list
   * would drop the proof just added. The typed amounts are kept only after a correction
   * (`keepDrafts`); after a decision the amounts are the ones the BFF saved.
   */
  private async refresh(keepDrafts = false): Promise<void> {
    // `refreshing` blocks every write from now until the new detail arrives (see `blocked`).
    this.reload(keepDrafts);
    await Promise.resolve();
  }

  /** Reads the payment again keeping the page on screen. */
  private reload(keepDrafts = false): void {
    this.keepDrafts = keepDrafts;
    this.content.reload();
  }

  private focus(selector: string): void {
    afterNextRender(
      () => {
        this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
      },
      { injector: this.injector },
    );
  }
}
