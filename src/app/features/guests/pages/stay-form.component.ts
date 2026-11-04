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
import { firstValueFrom } from 'rxjs';
import { AdminEnvironmentsService, Environment } from '@core/services/admin-environments.service';
import { AdminGuestsService, Stay, StayInput } from '@core/services/admin-guests.service';
import { toBffErrorWithServerMessage } from '@core/services/bff-error';
import { isConcurrentModification, withVersion } from '@core/services/concurrent-modification';
import { openConcurrentModificationDialog } from '@shared/concurrent-modification/concurrent-modification-dialog.component';
import { focusFirstProblem } from '@shared/forms/form-feedback';
import { parseAmount } from '@shared/payments/payment-format';
import { GUEST_PAGE_STYLES } from '../guest-page.styles';
import {
  AMOUNT_TEXT,
  DATES_ORDER_TEXT,
  DATES_TEXT,
  ENVIRONMENT_TEXT,
  ENVIRONMENT_TYPE_LABELS,
  NO_ENVIRONMENT,
  SNACK_MS,
  STAY_CREATED_TEXT,
  STAY_UPDATED_TEXT,
} from '../guest-texts';
import { GUEST_FORM_STYLES } from './guest-form.styles';
import { openGuestNoticeDialog } from './guest-notice-dialog.component';

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
  readonly mainLabel: string;
  /** Whether the main action goes back to A3.2 (nothing left to do here). */
  readonly leaves: boolean;
}

/** The rejections the SRS shows as a modal, with the BFF's own message (QP-UI-17). */
const NOTICES: Readonly<Partial<Record<string, Notice>>> = {
  ENVIRONMENT_OCCUPIED: { title: 'Ambiente ocupado', mainLabel: 'Entendido', leaves: false },
  GUEST_NOT_ACTIVE: {
    title: 'El huésped no está activo',
    mainLabel: 'Volver al huésped',
    leaves: true,
  },
  GUEST_NOT_TEMPORARY: {
    title: 'El huésped no es temporal',
    mainLabel: 'Volver al huésped',
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
    amount: String(stay.agreedAmount),
  };
}

interface EnvironmentOption {
  readonly id: string;
  readonly label: string;
}

function optionOf(environment: Environment): EnvironmentOption {
  return {
    id: environment.id,
    label: `${environment.code} · ${ENVIRONMENT_TYPE_LABELS[environment.type]}`,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** The guest of the stay that occupies the environment, for "Ver huésped" (TAR-237). */
function occupyingGuest(error: unknown): string | null {
  const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
  const occupant = isRecord(body) ? body['occupant'] : null;
  if (!isRecord(occupant) || occupant['kind'] !== 'STAY') return null;
  const guestId = occupant['guestId'];
  return typeof guestId === 'string' && guestId !== '' ? guestId : null;
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

/**
 * A3.5 (RN-13, RN-17, RN-20, CU-31): registers a stay of a temporary guest, or corrects one with
 * the `version` it was loaded with (BE-SPR-DAT-13). The environment is chosen among the active ones
 * free for the whole stay. Ids are opaque and travel as they came.
 */
@Component({
  selector: 'app-stay-form',
  imports: [MatAnchor, MatButton, RouterLink],
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
  protected guestId = '';
  /** The stay being corrected, or null when a new one is registered. */
  protected stayId: string | null = null;

  protected readonly state = signal<LoadState>({ kind: 'ready' });
  protected readonly loaded = signal<Stay | null>(null);
  protected readonly draft = signal<Draft>(EMPTY_DRAFT);
  protected readonly free = signal<readonly Environment[]>([]);
  protected readonly freeState = signal<LoadState>({ kind: 'idle' });
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly generalError = signal<string | null>(null);
  /** Errors the BFF tied to a field, shown next to it until that field changes. */
  protected readonly serverErrors = signal<Readonly<Partial<Record<FieldKey, string>>>>({});

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
    const options = this.free().map(optionOf);
    const loaded = this.loaded();
    const current = loaded?.environmentId;
    if (loaded && current && !options.some((option) => option.id === current)) {
      return [{ id: current, label: loaded.environmentCode ?? current }, ...options];
    }
    return options;
  });
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

  protected readonly datesError = computed(() => {
    const server = this.serverErrors().dates;
    if (server) return server;
    const { start, end } = this.draft();
    if (start !== '' && end !== '' && end < start) return DATES_ORDER_TEXT;
    return this.submitted() && (start === '' || end === '') ? DATES_TEXT : null;
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
    });
  }

  ngOnInit(): void {
    const params = this.route.snapshot.paramMap;
    this.guestId = params.get('id') ?? '';
    this.stayId = params.get('stayId');
    if (this.stayId !== null) void this.loadStay(this.stayId);
  }

  protected noEnvironmentLabel(): string {
    if (this.legacy()) return NO_ENVIRONMENT;
    return this.datesReady() ? 'Elige el ambiente' : 'Elige primero la llegada y la salida';
  }

  protected typedStart(target: EventTarget | null): void {
    this.update({ start: valueOf(target) }, 'dates');
    this.refreshFree();
  }

  protected typedEnd(target: EventTarget | null): void {
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
    this.snackBar.open(loaded ? STAY_UPDATED_TEXT : STAY_CREATED_TEXT, 'Cerrar', {
      duration: SNACK_MS,
    });
    await this.backToGuest();
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
      return this.notice(notice, message, occupyingGuest(error));
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.snackBar.open(message, 'Cerrar', { duration: SNACK_MS });
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

  private async concurrent(): Promise<void> {
    const ref = openConcurrentModificationDialog(this.dialog, {
      title: 'La estadía cambió',
      backLabel: 'Volver al huésped',
    });
    const choice = await firstValueFrom(ref.afterClosed());
    if (this.destroyed) return;
    if (choice === 'reload' && this.stayId !== null) {
      await this.loadStay(this.stayId);
    } else if (choice === 'back') {
      await this.backToGuest();
    }
  }

  private async notice(notice: Notice, message: string, occupant: string | null): Promise<void> {
    const ref = openGuestNoticeDialog(this.dialog, {
      title: notice.title,
      message,
      mainLabel: notice.mainLabel,
      ...(occupant === null ? {} : { secondLabel: 'Ver huésped' }),
    });
    const choice = await firstValueFrom(ref.afterClosed());
    if (this.destroyed) return;
    if (choice === 'second' && occupant !== null) {
      await this.router.navigate(['/admin/guests', occupant]);
    } else if (notice.leaves) {
      await this.backToGuest();
    } else {
      // The environment was taken meanwhile: show the ones still free.
      this.refreshFree();
    }
  }

  private async backToGuest(): Promise<void> {
    await this.router.navigate(['/admin/guests', this.guestId]);
  }

  /** Loads the stay to correct with its current `version` and starts the form from it. */
  private async loadStay(stayId: string): Promise<void> {
    const request = ++this.stayRequest;
    this.state.set({ kind: 'loading' });
    this.submitted.set(false);
    this.serverErrors.set({});
    this.generalError.set(null);
    try {
      const stay = await firstValueFrom(this.guests.findStay(this.guestId, stayId));
      if (request !== this.stayRequest) return;
      this.loaded.set(stay);
      this.draft.set(stay ? draftOf(stay) : EMPTY_DRAFT);
      this.state.set(stay ? { kind: 'ready' } : { kind: 'not-found' });
      if (stay) this.refreshFree();
    } catch (error: unknown) {
      if (request !== this.stayRequest) return;
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
