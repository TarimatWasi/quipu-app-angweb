import { ProofKindChoiceComponent } from '@shared/payments/proof-kind-choice.component';
import { ProofAmountFieldComponent } from '@shared/payments/proof-amount-field.component';
import { ProofMethodFieldComponent } from '@shared/payments/proof-method-field.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFieldsComponent } from '@shared/ui/skeleton/skeleton-fields.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { SkeletonCardsComponent } from '@shared/ui/skeleton/skeleton-cards.component';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import type { GuestType } from '@core/auth/auth.service';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { GuestPaymentsService, PeriodStatus } from '../data/guest-payments.service';
import type {
  GuestPayment,
  GuestProof,
  OwnPaymentsApi,
  OwnPaymentSummary,
} from '../data/own-payments';
import {
  StayPaymentStatus,
  TemporaryGuestPaymentsService,
} from '../data/temporary-guest-payments.service';
import { FieldErrors } from '@shared/forms/field-errors';
import { ProofDrafts } from '@shared/payments/proof-drafts';
import { proofField, serializeProofs } from '@shared/payments/proof-fields';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import { coveredAmountText, creditAppliedText } from '@shared/payments/credit-texts';
import {
  balanceOf,
  formatMoney,
  formatPeriod,
  formatStay,
  hasRejectedPayment,
  PERIOD_STATUS_LABELS,
  periodLabel,
  takesNewPayment,
} from '@shared/payments/payment-format';
import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONES,
  PERIOD_STATUS_TONES,
} from '../model/own-payment-labels';
import { MAX_PROOFS, PERIOD_TEXT } from '@shared/payments/proof-rules';
import { FileFieldComponent } from '@shared/ui/file-field/file-field.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { openPaymentNoticeDialog } from '@shared/payments/payment-notice-dialog.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import {
  LoadState,
  NOTICES,
  OWN_PROOF_LIMIT_TEXT,
  OwnPaymentMode,
  SENT_TEXT,
} from '../model/own-payment';

const GENERAL_ERROR_ID = 'own-payment-error';
const HOME = '/home';

function idOf(id: string | null): string | null {
  return id !== null && id !== '' ? id : null;
}

/**
 * H3 (guest with a contract, CU-17) and T2 (temporary guest, CU-22): a payment with one to five
 * proofs, vouchers or cash (RN-22). Without an id it sends a first payment: the guest with a
 * contract chooses the month (it may come chosen with `?period=` from H1), the temporary guest does
 * not choose the stay. With an id it opens that own payment: a rejected one is corrected and sent
 * again (RN-05, «Enviar de nuevo»), any other is only read («Tu pago»). The guest is always the one
 * of the session: no guest id is ever sent, and ids are opaque.
 */
@Component({
  selector: 'app-own-payment',
  imports: [
    ProofKindChoiceComponent,
    ProofAmountFieldComponent,
    ProofMethodFieldComponent,
    SkeletonCardsComponent,
    SkeletonBlockComponent,
    SkeletonFieldsComponent,
    SkeletonContentDirective,
    SkeletonComponent,
    RouterLink,
    FileFieldComponent,
    FieldControlDirective,
    FormFieldComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    PageNoticeComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './own-payment.component.html',
  styleUrl: './own-payment.component.scss',
})
export class OwnPaymentComponent {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly guestPayments = inject(GuestPaymentsService);
  private readonly temporaryPayments = inject(TemporaryGuestPaymentsService);

  private readonly proofDrafts = new ProofDrafts();
  private readonly fieldErrors = new FieldErrors();

  private readonly route = inject(ActivatedRoute);
  protected readonly audience: GuestType =
    this.route.snapshot.data['audience'] === 'TEMPORARY' ? 'TEMPORARY' : 'CONTRACT';
  protected readonly paymentId: string | null = idOf(this.route.snapshot.paramMap.get('id'));
  protected readonly maxProofs = MAX_PROOFS;
  protected readonly proofLimitText = OWN_PROOF_LIMIT_TEXT;
  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly formatMoney = formatMoney;
  protected readonly creditAppliedText = creditAppliedText;
  protected readonly coveredAmountText = coveredAmountText;
  protected readonly periodLabel = periodLabel;
  protected readonly statusLabels = PERIOD_STATUS_LABELS;
  protected readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;
  protected readonly paymentStatusTones = PAYMENT_STATUS_TONES;
  protected readonly periodStatusTones = PERIOD_STATUS_TONES;
  protected readonly home = HOME;

  protected readonly retrying = signal(false);
  protected readonly refreshing = signal(false);
  protected readonly refreshError = signal<string | null>(null);
  protected readonly state = signal<LoadState>({ kind: 'loading' });
  /** The months of the guest with a contract (H3, first payment). */
  protected readonly periods = signal<readonly PeriodStatus[]>([]);
  /** The stay of the temporary guest (T2, first payment). */
  protected readonly stay = signal<StayPaymentStatus | null>(null);
  /** The own payment opened by id (correction or read mode). */
  protected readonly payment = signal<GuestPayment | null>(null);

  protected readonly periodChoice = signal(this.route.snapshot.queryParamMap.get('period') ?? '');
  protected readonly periodHelp = computed(() => {
    const item = this.selected();
    return item
      ? `Cuota ${formatMoney(item.amount)} · Por pagar ${formatMoney(item.amountDue)}`
      : 'Solo los meses sin pagar.';
  });
  protected readonly proofs = this.proofDrafts.drafts;
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly generalError = signal<string | null>(null);
  /** Errors the BFF tied to a field (`field`), shown next to it until that field changes. */
  protected readonly serverErrors = this.fieldErrors.values;

  protected readonly loadErrorMessage = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });
  /** The BFF's own text when the temporary guest has no stay yet (RESOURCE_NOT_FOUND). */
  protected readonly notFoundMessage = computed(() => {
    const state = this.state();
    return state.kind === 'not-found' ? state.message : '';
  });

  protected readonly mode = computed<OwnPaymentMode>(() => {
    if (this.paymentId === null) return 'new';
    return this.payment()?.status === 'REJECTED' ? 'correct' : 'read';
  });

  /** Months that take a first payment (UNPAID, OVERDUE, without any payment). */
  protected readonly options = computed(() =>
    this.periods()
      .filter(takesNewPayment)
      .map((item) => ({
        period: item.period,
        label: `${formatPeriod(item.period)}${
          item.status === 'OVERDUE' ? ' · Atrasado' : ''
        } · Por pagar ${formatMoney(item.amountDue)}`,
        item,
      })),
  );
  /** Months whose payment was rejected: they are corrected from their own payment. */
  protected readonly toCorrect = computed(() =>
    this.periods()
      .filter(hasRejectedPayment)
      .map((item) => ({ id: item.paymentId ?? '', label: formatPeriod(item.period) })),
  );
  protected readonly selected = computed(
    () => this.options().find((option) => option.period === this.periodChoice())?.item ?? null,
  );
  /** Whether the temporary guest's stay takes a first payment here. */
  protected readonly stayTakesPayment = computed(() => {
    const stay = this.stay();
    return stay !== null && takesNewPayment(stay);
  });
  protected readonly stayLabel = computed(() => {
    const stay = this.stay();
    return stay ? formatStay(stay.startDate, stay.endDate) : '';
  });

  /** Whether the proofs form is on screen. */
  protected readonly showForm = computed(() => {
    if (this.state().kind !== 'ready') return false;
    switch (this.mode()) {
      case 'correct':
        return true;
      case 'read':
        return false;
      case 'new':
        return this.audience === 'CONTRACT' ? this.options().length > 0 : this.stayTakesPayment();
    }
  });

  /** What the proofs are compared with: what is left to pay of the month, the stay or the payment. */
  protected readonly due = computed<number | null>(() => {
    if (this.mode() === 'correct') return this.payment()?.amountDue ?? null;
    if (this.audience === 'CONTRACT') return this.selected()?.amountDue ?? null;
    return this.stay()?.agreedAmount ?? null;
  });
  protected readonly sum = this.proofDrafts.sum;
  protected readonly balanceText = computed(() => {
    const due = this.due();
    if (due === null) return '';
    const balance = balanceOf(this.sum(), due, false);
    switch (balance.kind) {
      case 'complete':
        return 'Completo';
      case 'short':
        return `Faltan ${formatMoney(balance.difference)}`;
      case 'over':
        return `Sobran ${formatMoney(balance.difference)}`;
    }
  });

  protected readonly periodError = computed(() => {
    const server = this.serverErrors()['period'];
    if (server) return server;
    return this.submitted() && this.selected() === null ? PERIOD_TEXT : null;
  });
  protected readonly proofsError = computed(() => this.serverErrors()['proofs'] ?? null);
  protected readonly atProofLimit = this.proofDrafts.atLimit;

  protected readonly title = computed(() => {
    switch (this.mode()) {
      case 'new':
        return this.audience === 'CONTRACT' ? 'Subir pago' : 'Subir pago de la estadía';
      case 'correct': {
        const payment = this.payment();
        const label = payment ? this.labelOf(payment) : '';
        return label ? `Corregir pago de ${label}` : 'Corregir pago';
      }
      case 'read':
        return 'Tu pago';
    }
  });

  private destroyed = false;
  private readonly destroyRef = inject(DestroyRef);
  protected readonly watchDestroy = this.destroyRef.onDestroy(() => {
    this.destroyed = true;
  });
  // Moves with every load, so a late answer of a previous load is ignored.
  private loadRequest = 0;

  // The page loads when it is created, not from a lifecycle hook or the constructor.
  protected readonly started = this.load();

  protected retry(): void {
    if (this.retrying() || this.refreshing() || this.state().kind === 'loading') return;
    void this.load();
  }

  protected labelOf(payment: GuestPayment): string {
    return payment.period || (payment.stayStartDate && payment.stayEndDate)
      ? periodLabel({
          period: payment.period,
          stayStartDate: payment.stayStartDate ?? null,
          stayEndDate: payment.stayEndDate ?? null,
        })
      : '';
  }

  protected proofKindLabel(proof: GuestProof): string {
    return proof.kind === 'VOUCHER' ? 'Voucher' : 'Efectivo';
  }

  protected choosePeriod(target: EventTarget | null): void {
    this.periodChoice.set(target instanceof HTMLSelectElement ? target.value : '');
    this.clearServer('period', 'proofs');
  }

  protected kindOf(index: number, kind: GuestProof['kind']): void {
    this.proofDrafts.update(index, { kind });
    this.clearServer(`proofs[${String(index)}].file`, 'proofs');
  }

  protected typedAmount(index: number, amount: string): void {
    this.proofDrafts.update(index, {
      amount,
    });
    this.clearServer(`proofs[${String(index)}].amount`, 'proofs');
  }

  protected typedMethod(index: number, value: string): void {
    this.proofDrafts.update(index, { method: value });
  }

  protected picked(index: number, chosen: File | null): void {
    this.proofDrafts.chooseFile(index, chosen);
    this.clearServer(`proofs[${String(index)}].file`);
  }

  protected addProof(): void {
    if (this.proofDrafts.add()) this.clearServer('proofs');
  }

  /** Server errors of a proof point to it by position, so they no longer hold once one is removed. */
  protected removeProof(index: number): void {
    if (this.proofDrafts.remove(index)) this.fieldErrors.clearPrefix('proofs');
  }

  protected amountError(index: number): string | null {
    const server = this.serverErrors()[`proofs[${String(index)}].amount`];
    if (server) return server;
    return this.proofDrafts.amountError(index, this.submitted());
  }

  protected fileError(index: number): string | null {
    const server = this.serverErrors()[`proofs[${String(index)}].file`];
    if (server) return server;
    return this.proofDrafts.fileError(index, this.submitted());
  }

  protected async submit(event: Event): Promise<void> {
    if (this.refreshing() || this.refreshError() !== null) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    if (this.busy() || !this.showForm()) return;
    this.submitted.set(true);
    this.generalError.set(null);
    this.serverErrors.set({});
    const send = this.request();
    if (send === null) {
      focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
      return;
    }
    this.busy.set(true);
    try {
      await firstValueFrom(send);
    } catch (error: unknown) {
      if (!this.destroyed) await this.failed(error);
      return;
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
    if (this.destroyed) return;
    this.toasts.show(SENT_TEXT);
    await this.router.navigateByUrl(HOME);
  }

  /** The call that sends the payment, or null when the form still has a problem to fix. */
  private request(): Observable<OwnPaymentSummary> | null {
    const proofs = this.proofs();
    const fieldProblem = proofs.some(
      (_, index) => this.amountError(index) !== null || this.fileError(index) !== null,
    );
    const mode = this.mode();
    const needsPeriod = mode === 'new' && this.audience === 'CONTRACT';
    if (fieldProblem || (needsPeriod && this.periodError() !== null)) {
      return null;
    }
    const payment = this.payment();
    const { proofs: inputs, files } = serializeProofs(proofs, mode === 'correct');
    if (mode === 'correct' && payment !== null) {
      return this.api().correct(payment.id, inputs, files);
    }
    if (this.audience === 'TEMPORARY') {
      return this.temporaryPayments.upload(inputs, files);
    }
    const period = this.selected()?.period;
    return period ? this.guestPayments.upload(period, inputs, files) : null;
  }

  private api(): OwnPaymentsApi {
    return this.audience === 'TEMPORARY' ? this.temporaryPayments : this.guestPayments;
  }

  private async failed(error: unknown): Promise<void> {
    const { code, message, field } = toBffErrorWithServerMessage(error);
    const notice = NOTICES[this.audience][code];
    if (notice) {
      const ref = openPaymentNoticeDialog(this.dialog, {
        title: notice.title,
        message,
        actions: [{ label: 'Entendido', value: 'ok' }],
      });
      await firstValueFrom(ref.afterClosed());
      // What the guest can pay or correct changed: show it as it is now.
      if (notice.afterClose === 'reload' && !this.destroyed) await this.load();
      return;
    }
    const notFound = error instanceof HttpErrorResponse && error.status === 404;
    if (notFound || code === 'FILE_STORAGE_UNAVAILABLE') {
      this.toasts.show(message);
      if (notFound) await this.router.navigateByUrl(HOME);
      return;
    }
    const key = field !== undefined ? this.fieldKey(field) : null;
    if (key !== null) {
      this.serverErrors.update((errors) => ({ ...errors, [key]: message }));
    } else {
      this.generalError.set(message);
    }
    focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
  }

  /** Where on the form a `field` of the BFF is shown, or null when no field of the form is it. */
  private fieldKey(field: string): string | null {
    if (field === 'period') {
      return this.mode() === 'new' && this.audience === 'CONTRACT' ? field : null;
    }
    if (field === 'proofs') return field;
    const proof = proofField(field, true);
    return proof !== null && proof.index < this.proofs().length
      ? `proofs[${String(proof.index)}].${proof.part}`
      : null;
  }

  private async load(): Promise<void> {
    const request = ++this.loadRequest;
    const refreshing = this.state().kind === 'ready';
    this.refreshing.set(refreshing);
    const isRetry = this.state().kind === 'error';
    this.retrying.set(isRetry);
    if (!isRetry && !refreshing) this.state.set({ kind: 'loading' });
    try {
      const current = () => !this.destroyed && request === this.loadRequest;
      if (this.paymentId !== null) {
        await this.loadPayment(this.paymentId, current);
      } else if (this.audience === 'TEMPORARY') {
        await this.loadStay(current);
      } else {
        await this.loadPeriods(current);
      }
      if (current()) {
        this.refreshError.set(null);
        this.state.set({ kind: 'ready' });
      }
    } catch (error: unknown) {
      if (!this.destroyed && request === this.loadRequest) this.failLoad(error, refreshing);
    } finally {
      if (!this.destroyed && request === this.loadRequest) this.endLoad();
    }
  }

  /** A failed refresh keeps the form and says so; any other failure replaces it. */
  private failLoad(error: unknown, refreshing: boolean): void {
    const { message } = toBffErrorWithServerMessage(error);
    const notFound = error instanceof HttpErrorResponse && error.status === 404;
    if (refreshing && !notFound) this.refreshError.set(message);
    else this.state.set({ kind: notFound ? 'not-found' : 'error', message });
  }

  private endLoad(): void {
    this.retrying.set(false);
    this.refreshing.set(false);
  }

  /** The own payment by id; a rejected one fills the form with the proofs it was sent with. */
  private async loadPayment(id: string, current: () => boolean): Promise<void> {
    const payment = await firstValueFrom(this.api().get(id));
    if (!current()) return;
    this.payment.set(payment);
    this.submitted.set(false);
    const kept = payment.status === 'REJECTED' ? payment.proofs.slice(0, MAX_PROOFS) : [];
    this.proofDrafts.reset(kept);
  }

  private async loadStay(current: () => boolean): Promise<void> {
    const stay = await firstValueFrom(this.temporaryPayments.paymentStatus());
    if (current()) this.stay.set(stay);
  }

  /** The months of the contract; a month chosen that no longer takes a payment is dropped. */
  private async loadPeriods(current: () => boolean): Promise<void> {
    const periods = await firstValueFrom(this.guestPayments.accountStatus());
    if (!current()) return;
    this.periods.set(periods);
    if (!this.options().some((option) => option.period === this.periodChoice())) {
      this.periodChoice.set('');
    }
  }

  private clearServer(...fields: string[]): void {
    this.fieldErrors.clear(...fields);
  }
}
