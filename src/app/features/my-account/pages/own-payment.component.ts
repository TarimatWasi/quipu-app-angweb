import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { MatAnchor, MatButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
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
  OwnProofEdit,
  OwnProofInput,
} from '../data/own-payments';
import {
  StayPaymentStatus,
  TemporaryGuestPaymentsService,
} from '../data/temporary-guest-payments.service';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import { coveredAmountText, creditAppliedText } from '@shared/payments/credit-texts';
import {
  balanceOf,
  formatMoney,
  formatPeriod,
  formatStay,
  hasRejectedPayment,
  parseAmount,
  PERIOD_STATUS_LABELS,
  periodLabel,
  takesNewPayment,
} from '@shared/payments/payment-format';
import { PAYMENT_STATUS_LABELS } from '../model/own-payment-labels';
import { PAYMENT_PAGE_STYLES } from '@shared/payments/payment-page.styles';
import {
  AMOUNT_TEXT,
  INVALID_FILE_TEXT,
  isValidVoucher,
  MAX_PROOFS,
  MISSING_FILE_TEXT,
  PERIOD_TEXT,
} from '@shared/payments/proof-rules';
import { DIRECT_PAYMENT_STYLES } from '@shared/payments/direct-payment.styles';
import { OWN_PAYMENT_STYLES } from './own-payment.styles';
import { openPaymentNoticeDialog } from '@shared/payments/payment-notice-dialog.component';

/** H3 and T2 in the SRS: «Puedes juntar hasta 5 comprobantes.» */
export const OWN_PROOF_LIMIT_TEXT = `Puedes juntar hasta ${String(MAX_PROOFS)} comprobantes.`;
export const SENT_TEXT = 'Pago enviado. Queda pendiente de revisión.';
const METHOD_SHORTCUTS = ['Yape', 'Transferencia'] as const;
const GENERAL_ERROR_ID = 'own-payment-error';
const SNACK_MS = 6000;
const HOME = '/home';

/** What a dialog asks the page to do once it is closed. */
type AfterNotice = 'stay' | 'reload';

interface Notice {
  readonly title: string;
  readonly afterClose: AfterNotice;
}

const CHANGED: Notice = { title: 'Tu pago ya cambió', afterClose: 'reload' };
const NOT_ACTIVE: Notice = { title: 'Tu cuenta no está activa', afterClose: 'stay' };

/**
 * The conflicts the SRS shows as a modal for each kind of guest (H3, T2), with the BFF's own
 * message (QP-UI-17). A payment that can no longer be corrected comes back in read mode.
 */
const NOTICES: Readonly<Record<GuestType, Readonly<Partial<Record<string, Notice>>>>> = {
  CONTRACT: {
    VOUCHER_NO_ACTIVE_CONTRACT: { title: 'No tienes un contrato vigente', afterClose: 'stay' },
    GUEST_NOT_ACTIVE: NOT_ACTIVE,
    VOUCHER_ALREADY_EXISTS: { title: 'Este período ya tiene un pago', afterClose: 'reload' },
    PAYMENT_ALREADY_EXISTS_FOR_PERIOD: { title: 'Ya hay un pago aprobado', afterClose: 'reload' },
    PAYMENT_NOT_CORRECTABLE: CHANGED,
    PAYMENT_ALREADY_RESOLVED: CHANGED,
  },
  TEMPORARY: {
    VOUCHER_NO_ACTIVE_STAY: { title: 'No tienes una estadía vigente', afterClose: 'stay' },
    GUEST_NOT_ACTIVE: NOT_ACTIVE,
    VOUCHER_ALREADY_EXISTS: {
      title: 'Ya subiste un voucher para esta estadía',
      afterClose: 'reload',
    },
    PAYMENT_ALREADY_EXISTS_FOR_PERIOD: { title: 'La estadía ya está pagada', afterClose: 'reload' },
    PAYMENT_NOT_CORRECTABLE: CHANGED,
    PAYMENT_ALREADY_RESOLVED: CHANGED,
  },
};

interface ProofDraft {
  /** Stable id of the row on this page, for the DOM ids and the `track`. */
  readonly key: number;
  /** The proof of the payment this row keeps, in a correction; null for a new one. */
  readonly id: string | null;
  readonly kind: GuestProof['kind'];
  readonly amount: string;
  readonly method: string;
  /** A new file chosen on this page. */
  readonly file: File | null;
  /** The name of the file the kept proof already has; null for a new proof or cash. */
  readonly keptFile: string | null;
  readonly fileInvalid: boolean;
}

/** `proofs[2].amount` → { index: 2, part: 'amount' }; `fileIndex` points to the file. */
function proofField(field: string): { index: number; part: 'amount' | 'file' } | null {
  const match = /^proofs\[(\d+)\]\.(amount|file|fileIndex)$/.exec(field);
  if (!match) return null;
  return { index: Number(match[1]), part: match[2] === 'amount' ? 'amount' : 'file' };
}

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-found'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

/** What the page is for: a first payment, the correction of a rejected one or reading one. */
export type OwnPaymentMode = 'new' | 'correct' | 'read';

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
  imports: [MatAnchor, MatButton, RouterLink],
  templateUrl: './own-payment.component.html',
  styles: [PAYMENT_PAGE_STYLES, DIRECT_PAYMENT_STYLES, OWN_PAYMENT_STYLES],
})
export class OwnPaymentComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly guestPayments = inject(GuestPaymentsService);
  private readonly temporaryPayments = inject(TemporaryGuestPaymentsService);

  // Before `proofs`, whose first row takes a key when the field is initialized.
  private nextKey = 1;

  protected readonly audience: GuestType;
  protected readonly paymentId: string | null;
  protected readonly maxProofs = MAX_PROOFS;
  protected readonly proofLimitText = OWN_PROOF_LIMIT_TEXT;
  protected readonly shortcuts = METHOD_SHORTCUTS;
  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly formatMoney = formatMoney;
  protected readonly creditAppliedText = creditAppliedText;
  protected readonly coveredAmountText = coveredAmountText;
  protected readonly periodLabel = periodLabel;
  protected readonly statusLabels = PERIOD_STATUS_LABELS;
  protected readonly paymentStatusLabels = PAYMENT_STATUS_LABELS;
  protected readonly home = HOME;

  protected readonly state = signal<LoadState>({ kind: 'loading' });
  /** The months of the guest with a contract (H3, first payment). */
  protected readonly periods = signal<readonly PeriodStatus[]>([]);
  /** The stay of the temporary guest (T2, first payment). */
  protected readonly stay = signal<StayPaymentStatus | null>(null);
  /** The own payment opened by id (correction or read mode). */
  protected readonly payment = signal<GuestPayment | null>(null);

  protected readonly periodChoice = signal('');
  protected readonly proofs = signal<readonly ProofDraft[]>([this.draft()]);
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly generalError = signal<string | null>(null);
  /** Errors the BFF tied to a field (`field`), shown next to it until that field changes. */
  protected readonly serverErrors = signal<Readonly<Record<string, string>>>({});

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
  protected readonly sum = computed(() =>
    this.proofs().reduce((total, proof) => total + (parseAmount(proof.amount) ?? 0), 0),
  );
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
  protected readonly atProofLimit = computed(() => this.proofs().length >= MAX_PROOFS);

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
  // Moves with every load, so a late answer of a previous load is ignored.
  private loadRequest = 0;

  constructor() {
    const route = inject(ActivatedRoute);
    this.audience = route.snapshot.data['audience'] === 'TEMPORARY' ? 'TEMPORARY' : 'CONTRACT';
    const id = route.snapshot.paramMap.get('id');
    this.paymentId = id !== null && id !== '' ? id : null;
    const period = route.snapshot.queryParamMap.get('period');
    if (period !== null) this.periodChoice.set(period);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
  }

  ngOnInit(): void {
    void this.load();
  }

  protected retry(): void {
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
    this.updateProof(index, { kind });
    this.clearServer(`proofs[${String(index)}].file`, 'proofs');
  }

  protected typedAmount(index: number, target: EventTarget | null): void {
    this.updateProof(index, { amount: target instanceof HTMLInputElement ? target.value : '' });
    this.clearServer(`proofs[${String(index)}].amount`, 'proofs');
  }

  protected typedMethod(index: number, value: string): void {
    this.updateProof(index, { method: value });
  }

  protected methodFrom(target: EventTarget | null): string {
    return target instanceof HTMLInputElement ? target.value : '';
  }

  protected picked(index: number, target: EventTarget | null): void {
    const input = target instanceof HTMLInputElement ? target : null;
    const chosen = input?.files?.[0] ?? null;
    const valid = chosen !== null && isValidVoucher(chosen);
    this.updateProof(index, {
      file: valid ? chosen : null,
      fileInvalid: chosen !== null && !valid,
    });
    this.clearServer(`proofs[${String(index)}].file`);
    if (input && !valid) {
      input.value = '';
    }
  }

  protected addProof(): void {
    if (this.atProofLimit()) return;
    this.proofs.update((proofs) => [...proofs, this.draft()]);
    this.clearServer('proofs');
  }

  /** Server errors of a proof point to it by position, so they no longer hold once one is removed. */
  protected removeProof(index: number): void {
    if (this.proofs().length <= 1) return;
    this.proofs.update((proofs) => proofs.filter((_, i) => i !== index));
    this.serverErrors.update((errors) =>
      Object.fromEntries(Object.entries(errors).filter(([field]) => !field.startsWith('proofs'))),
    );
  }

  protected amountError(index: number): string | null {
    const server = this.serverErrors()[`proofs[${String(index)}].amount`];
    if (server) return server;
    const proof = this.proofs()[index];
    const amount = proof ? parseAmount(proof.amount) : null;
    return this.submitted() && (amount === null || amount <= 0) ? AMOUNT_TEXT : null;
  }

  protected fileError(index: number): string | null {
    const server = this.serverErrors()[`proofs[${String(index)}].file`];
    if (server) return server;
    const proof = this.proofs()[index];
    if (proof?.kind !== 'VOUCHER') return null;
    if (proof.fileInvalid) return INVALID_FILE_TEXT;
    return this.submitted() && proof.file === null && proof.keptFile === null
      ? MISSING_FILE_TEXT
      : null;
  }

  protected async submit(event: Event): Promise<void> {
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
    this.snackBar.open(SENT_TEXT, 'Cerrar', { duration: SNACK_MS });
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
    const files: File[] = [];
    const fileIndexOf = (proof: ProofDraft): number | undefined => {
      if (proof.kind !== 'VOUCHER' || proof.file === null) return undefined;
      files.push(proof.file);
      return files.length - 1;
    };
    const payment = this.payment();
    if (mode === 'correct' && payment !== null) {
      const edits: OwnProofEdit[] = proofs.map((proof) => {
        const fileIndex = fileIndexOf(proof);
        return {
          ...(proof.id !== null ? { id: proof.id } : {}),
          ...this.proofFields(proof),
          ...(fileIndex !== undefined ? { fileIndex } : {}),
        };
      });
      return this.api().correct(payment.id, edits, files);
    }
    const inputs: OwnProofInput[] = proofs.map((proof) => {
      const fileIndex = fileIndexOf(proof);
      return { ...this.proofFields(proof), ...(fileIndex !== undefined ? { fileIndex } : {}) };
    });
    if (this.audience === 'TEMPORARY') {
      return this.temporaryPayments.upload(inputs, files);
    }
    const period = this.selected()?.period;
    return period ? this.guestPayments.upload(period, inputs, files) : null;
  }

  /** Kind, amount and, for a voucher, the method when given; cash is recorded as cash. */
  private proofFields(proof: ProofDraft): OwnProofInput {
    const amount = parseAmount(proof.amount) ?? 0;
    if (proof.kind === 'CASH') return { kind: 'CASH', amount };
    const method = proof.method.trim();
    return { kind: 'VOUCHER', amount, ...(method ? { method } : {}) };
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
      this.snackBar.open(message, 'Cerrar', { duration: SNACK_MS });
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
    const proof = proofField(field);
    return proof !== null && proof.index < this.proofs().length
      ? `proofs[${String(proof.index)}].${proof.part}`
      : null;
  }

  private async load(): Promise<void> {
    const request = ++this.loadRequest;
    this.state.set({ kind: 'loading' });
    try {
      const current = () => request === this.loadRequest;
      if (this.paymentId !== null) {
        await this.loadPayment(this.paymentId, current);
      } else if (this.audience === 'TEMPORARY') {
        await this.loadStay(current);
      } else {
        await this.loadPeriods(current);
      }
      if (current()) this.state.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (request !== this.loadRequest) return;
      const { message } = toBffErrorWithServerMessage(error);
      const notFound = error instanceof HttpErrorResponse && error.status === 404;
      this.state.set({ kind: notFound ? 'not-found' : 'error', message });
    }
  }

  /** The own payment by id; a rejected one fills the form with the proofs it was sent with. */
  private async loadPayment(id: string, current: () => boolean): Promise<void> {
    const payment = await firstValueFrom(this.api().get(id));
    if (!current()) return;
    this.payment.set(payment);
    this.submitted.set(false);
    const kept = payment.status === 'REJECTED' ? payment.proofs.slice(0, MAX_PROOFS) : [];
    this.proofs.set(kept.length > 0 ? kept.map((proof) => this.keptDraft(proof)) : [this.draft()]);
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

  private draft(): ProofDraft {
    return {
      key: this.nextKey++,
      id: null,
      kind: 'VOUCHER',
      amount: '',
      method: '',
      file: null,
      keptFile: null,
      fileInvalid: false,
    };
  }

  private keptDraft(proof: GuestProof): ProofDraft {
    return {
      key: this.nextKey++,
      id: proof.id,
      kind: proof.kind,
      amount: String(proof.declaredAmount),
      method: proof.method ?? '',
      file: null,
      keptFile: proof.kind === 'VOUCHER' ? (proof.file?.name ?? null) : null,
      fileInvalid: false,
    };
  }

  private updateProof(index: number, changes: Partial<Omit<ProofDraft, 'key' | 'id'>>): void {
    this.proofs.update((proofs) =>
      proofs.map((proof, i) => (i === index ? { ...proof, ...changes } : proof)),
    );
  }

  private clearServer(...fields: string[]): void {
    const errors = this.serverErrors();
    if (fields.some((field) => field in errors)) {
      this.serverErrors.set(
        Object.fromEntries(Object.entries(errors).filter(([key]) => !fields.includes(key))),
      );
    }
  }
}
