import { ProofsEditor } from '@shared/payments/proofs-editor';
import { ResourceContent } from '@shared/data/resource-content';
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
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, map, Observable, tap } from 'rxjs';
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
import { proofField, serializeProofs } from '@shared/payments/proof-fields';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import {
  balanceOf,
  formatMoney,
  formatPeriod,
  formatStay,
  hasRejectedPayment,
  limaDayOf,
  longDay,
  monthName,
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
import { FormSummaryLayoutComponent } from '@shared/forms/form-summary-layout.component';
import { OwnPaymentSummaryComponent } from '../components/own-payment-summary.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { StatusBadgeComponent } from '@shared/ui/status-badge/status-badge.component';
import { openPaymentNoticeDialog } from '@shared/payments/payment-notice-dialog.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import {
  HOME_NAMES,
  LoadState,
  paymentSummary,
  NOTICES,
  OWN_PROOF_LIMIT_TEXT,
  OWN_PROOF_TEXTS,
  ownAmountLabel,
  OwnPaymentMode,
  sentText,
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
    FormSummaryLayoutComponent,
    OwnPaymentSummaryComponent,
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

  /** The rows of proofs and the errors of the server for them, shared with the other payment page. */
  protected readonly editor = new ProofsEditor(() => this.submitted(), OWN_PROOF_TEXTS.amountError);
  private readonly proofDrafts = this.editor.drafts;
  private readonly fieldErrors = this.editor.errors;

  private readonly route = inject(ActivatedRoute);
  protected readonly audience: GuestType =
    this.route.snapshot.data['audience'] === 'TEMPORARY' ? 'TEMPORARY' : 'CONTRACT';
  protected readonly paymentId: string | null = idOf(this.route.snapshot.paramMap.get('id'));
  protected readonly maxProofs = MAX_PROOFS;
  protected readonly proofLimitText = OWN_PROOF_LIMIT_TEXT;
  protected readonly proofTexts = OWN_PROOF_TEXTS;
  protected readonly amountLabel = ownAmountLabel;
  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly formatMoney = formatMoney;
  protected readonly periodLabel = periodLabel;
  protected readonly statusLabels = PERIOD_STATUS_LABELS;
  protected readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;
  protected readonly paymentStatusTones = PAYMENT_STATUS_TONES;
  protected readonly periodStatusTones = PERIOD_STATUS_TONES;
  protected readonly home = HOME;

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
    if (this.state().kind !== 'ready' || this.sent()) return false;
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

  protected readonly homeName = HOME_NAMES[this.audience];
  /** The payment went: the screen says so and leads back, instead of leaving. */
  protected readonly sent = signal(false);
  protected readonly sentText = computed(() =>
    sentText(this.audience, monthName(this.payment()?.period ?? this.selected()?.period ?? '')),
  );
  protected readonly summary = computed(() =>
    paymentSummary({
      audience: this.audience,
      period: this.selected(),
      stay: this.stay(),
      payment: this.payment(),
    }),
  );
  /** «Tu pago de octubre no se aprobó.» / «Tu pago de la estadía no se aprobó.» over the form to correct. */
  protected readonly rejectedHeading = computed(() => {
    const month = monthName(this.payment()?.period ?? '');
    return this.audience === 'CONTRACT' && month !== null
      ? `Tu pago de ${month} no se aprobó.`
      : 'Tu pago de la estadía no se aprobó.';
  });

  protected readonly title = computed(() => {
    switch (this.mode()) {
      case 'new':
        return 'Subir voucher';
      case 'correct':
        return 'Corregir pago';
      case 'read':
        return 'Tu pago';
    }
  });

  private readonly destroyRef = inject(DestroyRef);

  /**
   * What the page reads with it (FE-ANG-CMP-10): the own payment by id, the stay of a temporary
   * guest or the months of the contract. Each answer fills what the page shows.
   */
  private readonly read = rxResource<true, undefined>({
    stream: () => this.reading().pipe(map((): true => true)),
  });
  private readonly content = new ResourceContent(this.read, {
    message: (error) => toBffErrorWithServerMessage(error).message,
  });
  protected readonly retrying = this.content.retrying;
  protected readonly refreshing = this.content.refreshing;
  /** A 404 is not a refresh that failed: what was asked is gone and the page says so instead. */
  private readonly gone = computed(() => {
    const error = this.content.error();
    return error instanceof HttpErrorResponse && error.status === 404;
  });
  protected readonly refreshError = computed(() =>
    this.gone() ? null : this.content.refreshError(),
  );
  protected readonly state = computed<LoadState>(() => {
    const state = this.content.state();
    if (state.status === 'initial-loading') return { kind: 'loading' };
    const error = this.content.error();
    if (this.gone() && error !== undefined && !this.refreshing() && !this.retrying()) {
      return { kind: 'not-found', message: toBffErrorWithServerMessage(error).message };
    }
    if (state.status === 'initial-error') return { kind: 'error', message: state.message };
    return { kind: 'ready' };
  });

  protected retry(): void {
    if (this.retrying() || this.refreshing() || this.state().kind === 'loading') return;
    this.load();
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
    return proof.kind === 'VOUCHER' ? 'Voucher' : 'Efectivo, sin voucher';
  }

  /** The line under a proof: its file and means, what the administration verified or that it confirms it. */
  protected proofDetail(proof: GuestProof): string {
    const parts: string[] = [];
    if (proof.kind === 'CASH') parts.push('Lo confirma la administración');
    if (proof.file) parts.push(proof.file.name);
    if (proof.method) parts.push(proof.method);
    if (proof.verifiedAmount !== null)
      parts.push(`verificado ${formatMoney(proof.verifiedAmount)}`);
    return parts.join(' · ');
  }

  /** What the review of the payment says: when it went and what comes next. */
  protected readText(payment: GuestPayment): string {
    if (payment.status === 'APPROVED') return 'La administración aprobó este pago.';
    const day = limaDayOf(payment.submittedAt);
    const sent =
      day === null ? 'Enviaste este pago' : `Enviaste este pago el ${longDay(day, new Date())}`;
    return `${sent} y la administración lo está revisando. No puedes enviar otro mientras tanto; si no se aprueba, te diremos por qué y podrás corregirlo aquí.`;
  }

  protected choosePeriod(target: EventTarget | null): void {
    this.periodChoice.set(target instanceof HTMLSelectElement ? target.value : '');
    this.clearServer('period', 'proofs');
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
      if (!this.destroyRef.destroyed) await this.failed(error);
      return;
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
    if (this.destroyRef.destroyed) return;
    this.sent.set(true);
  }

  /** The call that sends the payment, or null when the form still has a problem to fix. */
  private request(): Observable<OwnPaymentSummary> | null {
    const proofs = this.proofs();
    const fieldProblem = proofs.some(
      (_, index) =>
        this.editor.amountError(index) !== null || this.editor.fileError(index) !== null,
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
        message: notice.text,
        actions: [{ label: `Ver ${HOME_NAMES[this.audience]}`, value: 'home' }],
      });
      await firstValueFrom(ref.afterClosed());
      // What the guest can pay or correct changed: the account shows it as it is now.
      if (!this.destroyRef.destroyed) await this.router.navigateByUrl(HOME);
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

  /** Reads again what the page shows, keeping it on screen meanwhile. */
  private load(): void {
    this.content.reload();
  }

  private reading(): Observable<unknown> {
    if (this.paymentId !== null) return this.readPayment(this.paymentId);
    if (this.audience === 'TEMPORARY') {
      return this.temporaryPayments.paymentStatus().pipe(
        tap((stay) => {
          this.stay.set(stay);
        }),
      );
    }
    return this.readPeriods();
  }

  /** The own payment by id; a rejected one fills the form with the proofs it was sent with. */
  private readPayment(id: string): Observable<unknown> {
    return this.api()
      .get(id)
      .pipe(
        tap((payment) => {
          this.payment.set(payment);
          this.submitted.set(false);
          const kept = payment.status === 'REJECTED' ? payment.proofs.slice(0, MAX_PROOFS) : [];
          this.proofDrafts.reset(kept);
        }),
      );
  }

  /** The months of the contract; a month chosen that no longer takes a payment is dropped. */
  private readPeriods(): Observable<unknown> {
    return this.guestPayments.accountStatus().pipe(
      tap((periods) => {
        this.periods.set(periods);
        if (!this.options().some((option) => option.period === this.periodChoice())) {
          this.periodChoice.set('');
        }
      }),
    );
  }

  private clearServer(...fields: string[]): void {
    this.fieldErrors.clear(...fields);
  }
}
