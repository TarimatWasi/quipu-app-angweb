import { HttpErrorResponse } from '@angular/common/http';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminEnvironmentsService, Environment } from '../data/admin-environments.service';
import {
  AdminGuestsService,
  GuestDetail,
  Stay,
  StayInput,
} from '@core/api/clients/admin-guests.service';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { isConcurrentModification, withVersion } from '@core/http/concurrent-modification';
import { openConcurrentModificationDialog } from '@shared/concurrent-modification/concurrent-modification-dialog.component';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import { formatMoney, formatStay, parseAmount } from '@shared/payments/payment-format';
import { GUEST_PAGE_STYLES } from './guest-page.styles';
import {
  AMOUNT_TEXT,
  DATES_ORDER_TEXT,
  DATES_TEXT,
  describedBy,
  ENVIRONMENT_TEXT,
  ENVIRONMENT_TYPE_LABELS,
  guestName,
  NO_ENVIRONMENT,
  nightsBetween,
  SKELETON_ROWS,
  SLOW_TEXT,
  SNACK_MS,
  STAY_CREATED_TEXT,
  STAY_UPDATED_TEXT,
  todayText,
} from '../model/guest-texts';
import { LoadTiming } from './load-timing';
import { GUEST_FORM_STYLES } from './guest-form.styles';
import { openGuestNoticeDialog } from '../components/guest-notice-dialog.component';

type LoadState =
  | { readonly kind: 'idle' }
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error'; readonly message: string };

/** The parts of the form a BFF error can point to. */
type FieldKey = 'dates' | 'environment' | 'amount';

const FIELD_KEYS: Readonly<Partial<Record<string, FieldKey>>> = {
  startDate: 'dates',
  endDate: 'dates',
  environmentId: 'environment',
  agreedAmount: 'amount',
};

interface Notice {
  readonly title: string;
  /** Null: the BFF's own message is shown (QP-UI-17); otherwise the canvas text. */
  readonly text: string | null;
  readonly buttonLabel: string;
  /** Whether the action goes back to A3.2 (nothing left to do here). */
  readonly leaves: boolean;
}

/** The rejections shown as a modal: the occupied environment as the canvas words it. */
const NOTICES: Readonly<Partial<Record<string, Notice>>> = {
  ENVIRONMENT_OCCUPIED: {
    title: 'El ambiente ya está ocupado en esas fechas',
    text: 'Otra persona lo ocupa en esas fechas. Elige otro ambiente libre.',
    buttonLabel: 'Elegir otro ambiente',
    leaves: false,
  },
  GUEST_NOT_ACTIVE: {
    title: 'El huésped no está activo',
    text: null,
    buttonLabel: 'Volver al huésped',
    leaves: true,
  },
  GUEST_NOT_TEMPORARY: {
    title: 'El huésped no es temporal',
    text: null,
    buttonLabel: 'Volver al huésped',
    leaves: true,
  },
};

const GENERAL_ERROR_ID = 'stay-form-error';

interface Draft {
  readonly start: string;
  readonly end: string;
  readonly environmentId: string;
  readonly amount: string;
}

const EMPTY_DRAFT: Draft = { start: '', end: '', environmentId: '', amount: '' };

function draftOf(stay: Stay): Draft {
  return {
    start: stay.startDate,
    end: stay.endDate,
    environmentId: stay.environmentId ?? '',
    amount: stay.agreedAmount.toFixed(2),
  };
}

interface Option {
  readonly id: string;
  readonly label: string;
}

/** A fact of the side panel (P-11); `wide` takes both columns. */
interface Fact {
  readonly label: string;
  readonly value: string;
  readonly wide: boolean;
}

function optionOf(environment: Environment): Option {
  return {
    id: environment.id,
    label: `${ENVIRONMENT_TYPE_LABELS[environment.type]} ${environment.code}`,
  };
}

/** The fields of a correction that differ from the stay as it was loaded. */
function changesOf(loaded: Stay, draft: Draft): Partial<StayInput> {
  const amount = parseAmount(draft.amount) ?? 0;
  return {
    ...(draft.environmentId !== (loaded.environmentId ?? '')
      ? { environmentId: draft.environmentId }
      : {}),
    ...(draft.start === loaded.startDate ? {} : { startDate: draft.start }),
    ...(draft.end === loaded.endDate ? {} : { endDate: draft.end }),
    ...(amount === loaded.agreedAmount ? {} : { agreedAmount: amount }),
  };
}

function nightsValue(start: string, end: string): string {
  const nights = nightsBetween(start, end);
  return nights === null ? '—' : String(nights);
}

/**
 * A3.5 (RN-13, RN-17, RN-20, CU-31) on the approved canvas: registers a stay of a temporary guest,
 * or corrects one with the `version` it was loaded with (BE-SPR-DAT-13). The environment is chosen
 * among the active ones free for the whole stay. Ids are opaque and travel as they came.
 */
@Component({
  selector: 'app-stay-form',
  imports: [RouterLink],
  templateUrl: './stay-form.component.html',
  styles: [GUEST_PAGE_STYLES, GUEST_FORM_STYLES],
})
export class StayFormComponent implements OnInit {
  private readonly guests = inject(AdminGuestsService);
  private readonly environments = inject(AdminEnvironmentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly today = todayText();
  protected readonly slowText = SLOW_TEXT;
  protected readonly skeletonRows = SKELETON_ROWS;
  protected readonly describedBy = describedBy;
  protected readonly timing = new LoadTiming();
  protected guestId = '';
  /** The stay being corrected, or null when a new one is registered. */
  protected stayId: string | null = null;

  protected readonly guest = signal<GuestDetail | null>(null);
  protected readonly state = signal<LoadState>({ kind: 'ready' });
  protected readonly loaded = signal<Stay | null>(null);
  protected readonly draft = signal<Draft>(EMPTY_DRAFT);
  protected readonly free = signal<readonly Environment[]>([]);
  /** The environment ENVIRONMENT_OCCUPIED rejected for the dates typed; cleared when they change. */
  private readonly rejected = signal<string | null>(null);
  protected readonly freeState = signal<LoadState>({ kind: 'idle' });
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly generalError = signal<string | null>(null);
  /** Errors the BFF tied to a field, shown next to it until that field changes. */
  protected readonly serverErrors = signal<Readonly<Partial<Record<FieldKey, string>>>>({});

  protected readonly backLabel = computed(() => {
    const guest = this.guest();
    return guest ? `Volver a ${guestName(guest)}` : 'Volver al huésped';
  });
  protected readonly loadError = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });
  protected readonly freeError = computed(() => {
    const state = this.freeState();
    return state.kind === 'error' ? state.message : '';
  });
  protected readonly datesReady = computed(() => {
    const { start, end } = this.draft();
    return start !== '' && end !== '' && end >= start;
  });
  /** A stay registered before TAR-237 has no environment and may keep it that way. */
  protected readonly legacy = computed(() => this.loaded()?.environmentId === null);
  protected readonly options = computed(() => {
    const rejected = this.rejected();
    const options = this.free()
      .map(optionOf)
      .filter((option) => option.id !== rejected);
    const loaded = this.loaded();
    const current = loaded?.environmentId;
    // The stay's own environment stays on offer (it occupies it itself) unless the BFF just said
    // it is taken in the dates typed.
    if (
      loaded &&
      current &&
      current !== rejected &&
      !options.some((option) => option.id === current)
    ) {
      return [{ id: current, label: loaded.environmentCode ?? current }, ...options];
    }
    return options;
  });
  /**
   * The first option of the select: "Sin ambiente" for an old stay, and a prompt whenever nothing
   * is chosen (to register, or after the dates dropped the choice), so what shows is what is sent.
   */
  protected readonly emptyOption = computed(() => {
    if (this.legacy()) return NO_ENVIRONMENT;
    return this.stayId === null || this.draft().environmentId === '' ? 'Elige un ambiente' : null;
  });
  /** "Esta estadía tiene un pago pendiente de revisión" (decided 2026-10-30). */
  protected readonly paidNote = computed(() => this.loaded()?.paymentStatus === 'UNDER_REVIEW');
  protected readonly dirty = computed(() => {
    const loaded = this.loaded();
    if (!loaded) return true;
    const initial = draftOf(loaded);
    const draft = this.draft();
    return (Object.keys(initial) as (keyof Draft)[]).some((key) => draft[key] !== initial[key]);
  });
  protected readonly canSave = computed(
    () => this.state().kind === 'ready' && !this.busy() && this.dirty(),
  );
  protected readonly saveLabel = computed(() => {
    if (this.stayId === null) return this.busy() ? 'Registrando…' : 'Registrar estadía';
    return this.busy() ? 'Guardando…' : 'Guardar cambios';
  });
  protected readonly sideTitle = computed(() =>
    this.stayId === null ? 'Lo que se va a registrar' : 'Cómo está hoy',
  );
  protected readonly sideNote = computed(() =>
    this.stayId === null
      ? 'Las noches se calculan de las fechas. Desde la llegada podrá subir su voucher.'
      : 'Una estadía no se convierte en otra: si vuelve en otras fechas, registra una estadía nueva.',
  );
  protected readonly facts = computed<readonly Fact[]>(() => {
    const loaded = this.loaded();
    return loaded ? this.loadedFacts(loaded) : this.draftFacts();
  });

  protected readonly datesError = computed(() => {
    const server = this.serverErrors().dates;
    if (server) return server;
    if (!this.submitted()) return null;
    const { start, end } = this.draft();
    if (start === '' || end === '') return DATES_TEXT;
    return end < start ? DATES_ORDER_TEXT : null;
  });
  protected readonly environmentError = computed(() => {
    const server = this.serverErrors().environment;
    if (server) return server;
    const missing = this.draft().environmentId === '' && !this.legacy();
    return this.submitted() && missing ? ENVIRONMENT_TEXT : null;
  });
  protected readonly amountError = computed(() => {
    const server = this.serverErrors().amount;
    if (server) return server;
    const amount = parseAmount(this.draft().amount);
    return this.submitted() && (amount === null || amount <= 0) ? AMOUNT_TEXT : null;
  });

  // Each one moves with every load, so a late answer for previous dates or a stay is ignored.
  private stayRequest = 0;
  private freeRequest = 0;
  private destroyed = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.timing.stop();
    });
  }

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.guestId = params.get('id') ?? '';
    this.stayId = params.get('stayId');
    void this.loadGuest();
    if (this.stayId !== null) void this.loadStay(this.stayId);
  }

  protected typedStart(target: EventTarget | null): void {
    this.rejected.set(null);
    this.update({ start: valueOf(target) }, 'dates');
    this.refreshFree();
  }

  protected typedEnd(target: EventTarget | null): void {
    this.rejected.set(null);
    this.update({ end: valueOf(target) }, 'dates');
    this.refreshFree();
  }

  protected chooseEnvironment(target: EventTarget | null): void {
    this.update({ environmentId: valueOf(target) }, 'environment');
  }

  protected typedAmount(target: EventTarget | null): void {
    this.update({ amount: valueOf(target) }, 'amount');
  }

  protected retry(): void {
    if (this.stayId !== null) void this.loadStay(this.stayId);
  }

  protected retryFree(): void {
    this.refreshFree();
  }

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.canSave()) return;
    this.submitted.set(true);
    this.generalError.set(null);
    this.serverErrors.set({});
    if (this.datesError() ?? this.environmentError() ?? this.amountError()) {
      focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
      return;
    }
    const loaded = this.loaded();
    const draft = this.draft();
    const call = loaded
      ? this.guests.updateStay(
          this.guestId,
          loaded.id,
          withVersion(loaded, changesOf(loaded, draft)),
        )
      : this.guests.createStay(this.guestId, {
          environmentId: draft.environmentId,
          startDate: draft.start,
          endDate: draft.end,
          agreedAmount: parseAmount(draft.amount) ?? 0,
        });
    this.busy.set(true);
    try {
      await firstValueFrom(call);
    } catch (error: unknown) {
      if (!this.destroyed) await this.failed(error);
      return;
    } finally {
      if (!this.destroyed) this.busy.set(false);
    }
    if (this.destroyed) return;
    this.snackBar.open(loaded ? STAY_UPDATED_TEXT : STAY_CREATED_TEXT, undefined, {
      duration: SNACK_MS,
    });
    await this.backToGuest();
  }

  private loadedFacts(stay: Stay): Fact[] {
    return [
      { label: 'Ambiente', value: stay.environmentCode ?? NO_ENVIRONMENT, wide: false },
      { label: 'Noches', value: nightsValue(stay.startDate, stay.endDate), wide: false },
      { label: 'Fechas', value: formatStay(stay.startDate, stay.endDate), wide: true },
      { label: 'Monto acordado', value: formatMoney(stay.agreedAmount), wide: true },
    ];
  }

  private draftFacts(): Fact[] {
    const { start, end, environmentId, amount } = this.draft();
    const guest = this.guest();
    const environment = this.options().find((option) => option.id === environmentId);
    const value = parseAmount(amount);
    const datesOk = start !== '' && end !== '';
    return [
      { label: 'Huésped', value: guest ? guestName(guest) : '—', wide: true },
      { label: 'Ambiente', value: environment?.label ?? 'Falta elegirlo', wide: false },
      { label: 'Noches', value: nightsValue(start, end), wide: false },
      {
        label: 'Fechas',
        value: datesOk ? formatStay(start, end) : 'Faltan las fechas',
        wide: true,
      },
      {
        label: 'Monto acordado',
        value: value !== null && value > 0 ? formatMoney(value) : 'Falta el monto',
        wide: true,
      },
    ];
  }

  private update(changes: Partial<Draft>, field: FieldKey): void {
    this.draft.update((draft) => ({ ...draft, ...changes }));
    const errors = this.serverErrors();
    if (errors[field] !== undefined) {
      this.serverErrors.set(
        Object.fromEntries(Object.entries(errors).filter(([key]) => key !== field)),
      );
    }
  }

  private async failed(error: unknown): Promise<void> {
    if (isConcurrentModification(error)) {
      return this.concurrent();
    }
    const { code, message, field } = toBffErrorWithServerMessage(error);
    const notice = NOTICES[code];
    if (notice) {
      if (code === 'ENVIRONMENT_OCCUPIED') this.rejected.set(this.draft().environmentId || null);
      return this.notice(notice, message);
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.snackBar.open(message, undefined, { duration: SNACK_MS });
      return this.backToGuest();
    }
    const key = code === 'STAY_OVERLAP' ? 'dates' : FIELD_KEYS[field ?? ''];
    if (key) {
      this.serverErrors.update((errors) => ({ ...errors, [key]: message }));
    } else {
      this.generalError.set(message);
    }
    focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
  }

  /** The canvas words it "El registro cambió", with "Cerrar" and "Volver a cargar". */
  private async concurrent(): Promise<void> {
    const ref = openConcurrentModificationDialog(this.dialog, { backLabel: 'Cerrar' });
    const choice = await firstValueFrom(ref.afterClosed());
    if (!this.destroyed && choice === 'reload' && this.stayId !== null) {
      await this.loadStay(this.stayId);
    }
  }

  private async notice(notice: Notice, message: string): Promise<void> {
    const ref = openGuestNoticeDialog(this.dialog, {
      title: notice.title,
      message: notice.text ?? message,
      buttonLabel: notice.buttonLabel,
    });
    await firstValueFrom(ref.afterClosed());
    if (this.destroyed) return;
    if (notice.leaves) {
      await this.backToGuest();
      return;
    }
    // The environment was taken meanwhile: show the ones still free and go choose another.
    this.refreshFree();
    afterNextRender(
      () => {
        this.host.nativeElement.querySelector<HTMLElement>('#stay-environment')?.focus();
      },
      { injector: this.injector },
    );
  }

  private async backToGuest(): Promise<void> {
    await this.router.navigate(['/admin/guests', this.guestId]);
  }

  /** The guest names the screen and the side panel; without it the form still works. */
  private async loadGuest(): Promise<void> {
    try {
      const guest = await firstValueFrom(this.guests.get(this.guestId));
      if (!this.destroyed) this.guest.set(guest);
    } catch {
      // "Volver al huésped" and "—" stand in for the name; the save says what is wrong.
    }
  }

  /** Loads the stay to correct with its current `version` and starts the form from it. */
  private async loadStay(stayId: string): Promise<void> {
    const request = ++this.stayRequest;
    this.state.set({ kind: 'loading' });
    this.timing.start();
    this.submitted.set(false);
    this.serverErrors.set({});
    this.generalError.set(null);
    try {
      const stay = await firstValueFrom(this.guests.findStay(this.guestId, stayId));
      if (request !== this.stayRequest) return;
      this.timing.stop();
      this.loaded.set(stay);
      this.rejected.set(null);
      this.draft.set(stay ? draftOf(stay) : EMPTY_DRAFT);
      this.state.set(stay ? { kind: 'ready' } : { kind: 'not-found' });
      if (stay) this.refreshFree();
    } catch (error: unknown) {
      if (request !== this.stayRequest) return;
      this.timing.stop();
      const notFound = error instanceof HttpErrorResponse && error.status === 404;
      this.state.set(
        notFound
          ? { kind: 'not-found' }
          : { kind: 'error', message: toBffErrorWithServerMessage(error).message },
      );
    }
  }

  /** Asks the environments free for the dates typed, or clears them while the dates are not valid. */
  private refreshFree(): void {
    if (this.datesReady()) {
      void this.loadFree();
      return;
    }
    this.freeRequest++;
    this.free.set([]);
    this.freeState.set({ kind: 'idle' });
    this.keepChoiceIfOffered();
  }

  /** Every free environment for the dates, all pages; the choice is checked once all are in. */
  private async loadFree(): Promise<void> {
    const request = ++this.freeRequest;
    const { start, end } = this.draft();
    this.freeState.set({ kind: 'loading' });
    try {
      const free = await firstValueFrom(this.environments.allFree(start, end));
      if (request !== this.freeRequest) return;
      this.free.set(free);
      this.freeState.set({ kind: 'ready' });
      this.keepChoiceIfOffered();
    } catch (error: unknown) {
      if (request !== this.freeRequest) return;
      this.freeState.set({ kind: 'error', message: toBffErrorWithServerMessage(error).message });
    }
  }

  /** An environment no longer offered for the dates is unselected. */
  private keepChoiceIfOffered(): void {
    const chosen = this.draft().environmentId;
    if (chosen !== '' && !this.options().some((option) => option.id === chosen)) {
      this.draft.update((draft) => ({ ...draft, environmentId: '' }));
    }
  }
}

function valueOf(target: EventTarget | null): string {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement
    ? target.value
    : '';
}
