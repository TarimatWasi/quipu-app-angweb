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
import { ActivatedRoute, Router, RouterLink, UrlTree } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminGuestsService, GuestSummary } from '@core/api/clients/admin-guests.service';
import {
  AdminPaymentsService,
  DirectPayment,
  PayablePeriod,
  ProofInput,
  ProofKind,
} from '../data/admin-payments.service';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import { balanceOf, formatMoney, parseAmount, periodLabel } from '@shared/payments/payment-format';
import {
  AMOUNT_TEXT,
  INVALID_FILE_TEXT,
  MAX_PROOFS,
  MISSING_FILE_TEXT,
  PERIOD_TEXT,
  isValidVoucher,
} from '@shared/payments/proof-rules';
import { matchesAny } from '@shared/text/search';
import { FactTileComponent } from '@shared/ui/fact-tile/fact-tile.component';
import { LoadErrorComponent } from '@shared/ui/load-error/load-error.component';
import { PageHeaderComponent } from '@shared/ui/page-header/page-header.component';
import { FileFieldComponent } from '@shared/ui/file-field/file-field.component';
import { PageNoticeComponent } from '@shared/ui/page-notice/page-notice.component';
import { SearchFieldComponent } from '@shared/ui/search-field/search-field.component';
import { payingNote, payingTiles, receivedNotice } from '../model/direct-payment';
import { openPaymentNoticeDialog } from '@shared/payments/payment-notice-dialog.component';
import { FieldControlDirective } from '@shared/ui/form-field/field-control.directive';
import { FormFieldComponent } from '@shared/ui/form-field/form-field.component';
import { ToastService } from '@shared/ui/toast/toast.service';

/** Texts of A5.1 in the SRS (Textos de validación). */
export const GUEST_TEXT = 'Elige un huésped';
export const FUTURE_DATE_TEXT = 'La fecha no puede ser posterior a hoy';
export const PROOF_LIMIT_TEXT = `Hasta ${String(MAX_PROOFS)} comprobantes por pago.`;
const METHOD_SHORTCUTS = ['Yape', 'Transferencia'] as const;
const GENERAL_ERROR_ID = 'direct-payment-error';
/** How many guests the picker lists at once, before narrowing them with «Huésped». */
const GUESTS_SHOWN = 6;

/** The 409 conflicts the SRS shows as a modal, with the BFF's own message (QP-UI-17). */
const NOTICE_TITLES: Readonly<Partial<Record<string, string>>> = {
  GUEST_NOT_ACTIVE: 'El huésped no está activo',
  PAYMENT_ALREADY_EXISTS_FOR_PERIOD: 'Ya hay un pago aprobado',
  VOUCHER_ALREADY_EXISTS: 'Este período ya tiene un pago',
};

/** Only periods and stays without any payment take a direct one (TAR-239). */
const PAYABLE: ReadonlySet<PayablePeriod['status']> = new Set(['UNPAID', 'OVERDUE']);

const TYPE_LABELS: Readonly<Record<GuestSummary['type'], string>> = {
  CONTRACT: 'Con contrato',
  TEMPORARY: 'Temporal',
};

interface GuestLike {
  readonly name: string | null;
  readonly documentNumber: string;
  readonly type: GuestSummary['type'];
}

/** The name of a guest, which links to its detail (A3.2), and the rest of its label. */
interface GuestText {
  readonly name: string;
  readonly detail: string;
}

function guestText(guest: GuestLike): GuestText {
  return {
    name: guest.name ?? 'Sin nombre aún',
    detail: `${guest.documentNumber} · ${TYPE_LABELS[guest.type]}`,
  };
}

function guestLabel(guest: GuestLike): string {
  const { name, detail } = guestText(guest);
  return `${name} · ${detail}`;
}

/** The value of a period in the select; a month and a stay id never collide. */
function periodKey(item: PayablePeriod): string | null {
  if (item.period !== null) return `p:${item.period}`;
  return item.stayId !== null ? `id:${item.stayId}` : null;
}

interface PeriodOption {
  readonly key: string;
  readonly label: string;
  readonly item: PayablePeriod;
}

function optionOf(item: PayablePeriod): PeriodOption | null {
  const key = periodKey(item);
  if (key === null) return null;
  const overdue = item.status === 'OVERDUE' ? ' · Atrasado' : '';
  return {
    key,
    label: `${periodLabel(item)}${overdue} · Por pagar ${formatMoney(item.amountDue)}`,
    item,
  };
}

interface ProofDraft {
  /** Stable id of the row on this page, for the DOM ids and the `track`. */
  readonly key: number;
  readonly kind: ProofKind;
  readonly amount: string;
  readonly method: string;
  readonly file: File | null;
  readonly fileInvalid: boolean;
}

/** Today in the time of the residence, as yyyy-mm-dd. */
function todayInLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

/** `proofs[2].amount` → { index: 2, part: 'amount' }. */
function proofField(field: string): { index: number; part: 'amount' | 'file' } | null {
  const match = /^proofs\[(\d+)\]\.(amount|file)$/.exec(field);
  return match ? { index: Number(match[1]), part: match[2] as 'amount' | 'file' } : null;
}

type LoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'error'; readonly message: string };

/**
 * A5.1 (CU-14, RN-22, RN-23): a payment the administration received, with one or more proofs
 * (vouchers or cash), registered and approved at once. The guest comes chosen when the page opens
 * with `?guestId=` (A3.2, A4.2); otherwise it is chosen here. Ids are opaque and travel as they came.
 */
@Component({
  selector: 'app-direct-payment',
  imports: [
    FileFieldComponent,
    FieldControlDirective,
    FormFieldComponent,
    FactTileComponent,
    LoadErrorComponent,
    PageHeaderComponent,
    PageNoticeComponent,
    RouterLink,
    SearchFieldComponent,
  ],
  templateUrl: './direct-payment.component.html',
  styleUrl: './direct-payment.component.scss',
})
export class DirectPaymentComponent {
  private readonly guests = inject(AdminGuestsService);
  private readonly payments = inject(AdminPaymentsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  // Before `proofs`, whose first row takes a key when the field is initialized.
  private nextKey = 1;

  protected readonly maxProofs = MAX_PROOFS;
  protected readonly proofLimitText = PROOF_LIMIT_TEXT;
  protected readonly shortcuts = METHOD_SHORTCUTS;
  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly today = todayInLima();
  protected readonly formatMoney = formatMoney;

  /** The guest that came in the address, or null when it is chosen on this page. */
  protected readonly preselected: string | null;
  protected readonly preselectedGuest = signal<GuestText | null>(null);
  protected readonly guestOptions = signal<
    readonly { id: string; label: string; name: string; detail: string }[]
  >([]);
  /** What is typed in «Huésped»: it filters the guests loaded so far. */
  protected readonly guestSearch = signal('');
  private readonly allMatches = computed(() =>
    this.guestOptions().filter((option) => matchesAny([option.label], this.guestSearch())),
  );
  /** The first guests that match: the list is a help to pick, «Huésped» narrows it. */
  protected readonly matchingGuests = computed(() => this.allMatches().slice(0, GUESTS_SHOWN));
  protected readonly hiddenGuests = computed(
    () => this.allMatches().length - this.matchingGuests().length,
  );
  /** The guest chosen in the picker, whose name links to its detail (A3.2). */
  protected readonly chosenGuest = computed(
    () => this.guestOptions().find((option) => option.id === this.guestId()) ?? null,
  );
  protected readonly guestsCursor = signal<string | null>(null);
  protected readonly guestsState = signal<LoadState>({ kind: 'idle' });

  protected readonly guestsLoadError = computed(() => {
    const state = this.guestsState();
    return state.kind === 'error' ? state.message : '';
  });

  protected readonly guestId = signal('');
  protected readonly periods = signal<readonly PayablePeriod[]>([]);
  protected readonly periodsState = signal<LoadState>({ kind: 'idle' });
  protected readonly periodsLoadError = computed(() => {
    const state = this.periodsState();
    return state.kind === 'error' ? state.message : '';
  });
  protected readonly periodChoice = signal('');
  protected readonly receivedOn = signal('');
  protected readonly proofs = signal<readonly ProofDraft[]>([this.draft()]);

  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly generalError = signal<string | null>(null);
  /** Errors the BFF tied to a field (`field`), shown next to it until that field changes. */
  protected readonly serverErrors = signal<Readonly<Record<string, string>>>({});

  protected readonly options = computed(() =>
    this.periods()
      .filter((item) => PAYABLE.has(item.status))
      .map(optionOf)
      .filter((option): option is PeriodOption => option !== null),
  );
  /** Periods with a payment pending or rejected: they are completed in A5.2, not here. */
  protected readonly toComplete = computed(() =>
    this.periods()
      .filter((item) => !PAYABLE.has(item.status) && item.paymentId !== null)
      .map((item) => ({ id: item.paymentId ?? '', label: periodLabel(item) })),
  );
  protected readonly selected = computed(
    () => this.options().find((option) => option.key === this.periodChoice())?.item ?? null,
  );
  protected readonly sum = computed(() =>
    this.proofs().reduce((total, proof) => total + (parseAmount(proof.amount) ?? 0), 0),
  );
  protected readonly balance = computed(() => {
    const item = this.selected();
    return item ? balanceOf(this.sum(), item.amountDue, item.lastPeriod) : null;
  });
  protected readonly sumText = computed(() => formatMoney(this.sum()));
  protected readonly received = computed(() => receivedNotice(this.balance(), this.selected()));
  /** The guest whose payment is registered, by the address or by the picker. */
  protected readonly guestName = computed(() =>
    this.preselected ? (this.preselectedGuest()?.name ?? null) : (this.chosenGuest()?.name ?? null),
  );
  protected readonly tiles = computed(() => payingTiles(this.guestName() ?? '', this.selected()));
  protected readonly note = computed(() => payingNote(this.selected()));
  protected readonly periodTitle = computed(() =>
    this.periods().some((item) => item.stayId !== null) ? 'Estadía que paga' : 'Mes que paga',
  );
  /** «Volver a Pagos», or to the guest the page was opened from. */
  protected readonly backTo = computed(() =>
    this.preselected ? (this.preselectedGuest()?.name ?? 'el huésped') : 'Pagos',
  );

  protected readonly guestError = computed(() => {
    if (this.preselected !== null) return null;
    const server = this.serverErrors()['guestId'];
    if (server) return server;
    return this.submitted() && this.guestId() === '' ? GUEST_TEXT : null;
  });
  protected readonly periodError = computed(() => {
    const server = this.serverErrors()['period'];
    if (server) return server;
    return this.submitted() && this.selected() === null ? PERIOD_TEXT : null;
  });
  protected readonly dateError = computed(() => {
    const server = this.serverErrors()['receivedOn'];
    if (server) return server;
    const date = this.receivedOn();
    return date !== '' && date > this.today ? FUTURE_DATE_TEXT : null;
  });
  protected readonly proofsError = computed(() => {
    const server = this.serverErrors()['proofs'];
    if (server) return server;
    const balance = this.balance();
    return this.submitted() && balance?.kind === 'short'
      ? `Faltan ${formatMoney(balance.difference)} para cubrir lo que corresponde: no se puede registrar.`
      : null;
  });
  protected readonly atProofLimit = computed(() => this.proofs().length >= MAX_PROOFS);

  // Moves with every load of the periods, so a late answer for a previous guest is ignored.
  private periodsRequest = 0;
  private guestsRequest = 0;
  private destroyed = false;
  /** Where to go back when the guest came preselected (A3.2, A4.2); A5 otherwise. */
  private readonly origin: UrlTree | null;

  constructor() {
    const route = inject(ActivatedRoute);
    const fromAddress = route.snapshot.queryParamMap.get('guestId');
    this.preselected = fromAddress !== null && fromAddress !== '' ? fromAddress : null;
    this.origin =
      this.preselected !== null
        ? (this.router.currentNavigation()?.previousNavigation?.finalUrl ?? null)
        : null;
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
    });
    if (this.preselected === null) {
      void this.loadGuests();
    } else {
      this.guestId.set(this.preselected);
      void this.loadPreselected(this.preselected);
      void this.loadPeriods(this.preselected);
    }
  }

  protected backLink(): string | UrlTree {
    return this.origin ?? '/admin/payments';
  }

  protected moreGuests(): void {
    const cursor = this.guestsCursor();
    if (cursor !== null) void this.loadGuests(cursor);
  }

  protected retryGuests(): void {
    void this.loadGuests();
  }

  protected retryPeriods(): void {
    void this.loadPeriods(this.guestId());
  }

  protected pickGuest(id: string): void {
    this.guestSearch.set('');
    this.selectGuest(id);
  }

  /** «Cambiar»: back to the picker, without the guest nor its periods. */
  protected changeGuest(): void {
    this.selectGuest('');
  }

  private selectGuest(id: string): void {
    this.guestId.set(id);
    this.periodChoice.set('');
    this.clearServer('guestId', 'period');
    if (id === '') {
      this.periodsRequest++;
      this.periods.set([]);
      this.periodsState.set({ kind: 'idle' });
    } else {
      void this.loadPeriods(id);
    }
  }

  protected choosePeriod(target: EventTarget | null): void {
    this.periodChoice.set(target instanceof HTMLSelectElement ? target.value : '');
    this.clearServer('period', 'proofs');
  }

  protected typedDate(target: EventTarget | null): void {
    this.receivedOn.set(target instanceof HTMLInputElement ? target.value : '');
    this.clearServer('receivedOn');
  }

  protected kindOf(index: number, kind: ProofKind): void {
    this.updateProof(index, { kind });
    this.clearServer(`proofs[${String(index)}].file`);
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

  protected picked(index: number, chosen: File | null): void {
    const valid = chosen !== null && isValidVoucher(chosen);
    this.updateProof(index, {
      file: valid ? chosen : null,
      fileInvalid: chosen !== null && !valid,
    });
    this.clearServer(`proofs[${String(index)}].file`);
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
    return this.submitted() && proof.file === null ? MISSING_FILE_TEXT : null;
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.busy()) return;
    this.submitted.set(true);
    this.generalError.set(null);
    this.serverErrors.set({});
    const request = this.request();
    if (request === null) {
      focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
      return;
    }
    const label = periodLabel(request.item);
    this.busy.set(true);
    try {
      await firstValueFrom(this.payments.createDirect(request.payment, request.files));
    } catch (error: unknown) {
      if (!this.destroyed) await this.failed(error);
      return;
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
    if (this.destroyed) return;
    this.toasts.show(`Pago de ${label} registrado y aprobado.`);
    await this.leave();
  }

  /** The payment to send, or null when the form still has a problem to fix. */
  private request(): { payment: DirectPayment; files: File[]; item: PayablePeriod } | null {
    const item = this.selected();
    const proofs = this.proofs();
    const fieldProblem = proofs.some(
      (_, index) => this.amountError(index) !== null || this.fileError(index) !== null,
    );
    if (
      item === null ||
      this.guestError() !== null ||
      this.dateError() !== null ||
      this.proofsError() !== null ||
      fieldProblem
    ) {
      return null;
    }
    const files: File[] = [];
    const inputs: ProofInput[] = proofs.map((proof) => {
      const amount = parseAmount(proof.amount) ?? 0;
      if (proof.kind === 'VOUCHER' && proof.file !== null) {
        const method = proof.method.trim();
        files.push(proof.file);
        return {
          kind: 'VOUCHER',
          amount,
          ...(method ? { method } : {}),
          fileIndex: files.length - 1,
        };
      }
      return { kind: 'CASH', amount };
    });
    const target = item.period !== null ? { period: item.period } : { stayId: item.stayId ?? '' };
    const receivedOn = this.receivedOn();
    return {
      payment: {
        guestId: this.guestId(),
        target,
        ...(receivedOn ? { receivedOn } : {}),
        proofs: inputs,
      },
      files,
      item,
    };
  }

  private async failed(error: unknown): Promise<void> {
    const { code, message, field } = toBffErrorWithServerMessage(error);
    const title = NOTICE_TITLES[code];
    if (title) {
      const ref = openPaymentNoticeDialog(this.dialog, {
        title,
        message,
        actions: [{ label: 'Entendido', value: 'ok' }],
      });
      await firstValueFrom(ref.afterClosed());
      // What the guest can pay changed: show it as it is now.
      if (!this.destroyed) await this.loadPeriods(this.guestId());
      return;
    }
    const notFound = error instanceof HttpErrorResponse && error.status === 404;
    if (notFound || code === 'FILE_STORAGE_UNAVAILABLE') {
      this.toasts.show(message);
      if (notFound) await this.leave();
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
    if (field === 'period' || field === 'stayId') return 'period';
    if (field === 'receivedOn' || field === 'proofs') return field;
    if (field === 'guestId') return this.preselected === null ? field : null;
    const proof = proofField(field);
    return proof !== null && proof.index < this.proofs().length ? field : null;
  }

  private async leave(): Promise<void> {
    await this.router.navigateByUrl(this.origin ?? '/admin/payments');
  }

  private async loadGuests(after?: string): Promise<void> {
    const request = ++this.guestsRequest;
    this.guestsState.set({ kind: 'loading' });
    try {
      const page = await firstValueFrom(this.guests.list(after));
      if (request !== this.guestsRequest) return;
      const options = page.content.map((guest) => ({
        id: guest.id,
        label: guestLabel(guest),
        name: guestText(guest).name,
        detail: guestText(guest).detail,
      }));
      this.guestOptions.update((current) =>
        after === undefined ? options : [...current, ...options],
      );
      this.guestsCursor.set(page.nextCursor);
      this.guestsState.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (request !== this.guestsRequest) return;
      this.guestsState.set({ kind: 'error', message: toBffErrorWithServerMessage(error).message });
    }
  }

  private async loadPreselected(id: string): Promise<void> {
    try {
      const guest = await firstValueFrom(this.guests.get(id));
      this.preselectedGuest.set(guestText(guest));
    } catch {
      // The periods say whether the guest exists; the label is only a help.
      this.preselectedGuest.set(null);
    }
  }

  private async loadPeriods(guestId: string): Promise<void> {
    const request = ++this.periodsRequest;
    this.periods.set([]);
    this.periodsState.set({ kind: 'loading' });
    try {
      const periods = await firstValueFrom(this.payments.payablePeriods(guestId));
      if (request !== this.periodsRequest) return;
      this.periods.set(periods);
      if (!this.options().some((option) => option.key === this.periodChoice())) {
        this.periodChoice.set('');
      }
      this.periodsState.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (request !== this.periodsRequest) return;
      this.periodChoice.set('');
      this.periodsState.set({ kind: 'error', message: toBffErrorWithServerMessage(error).message });
    }
  }

  private draft(): ProofDraft {
    return {
      key: this.nextKey++,
      kind: 'VOUCHER',
      amount: '',
      method: '',
      file: null,
      fileInvalid: false,
    };
  }

  private updateProof(index: number, changes: Partial<Omit<ProofDraft, 'key'>>): void {
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
