import { ChangesNoticeComponent } from '@shared/ui/changes-notice/changes-notice.component';
import { watchChanges } from '@core/changes/change-resources.service';
import { ResourceContent } from '@shared/data/resource-content';
import { RefreshErrorComponent } from '@shared/ui/refresh-error/refresh-error.component';
import { FormSummaryLayoutComponent } from '@shared/forms/form-summary-layout.component';
import { GuestFormHeaderComponent } from '../components/guest-form-header.component';
import { SkeletonComponent } from '@shared/ui/skeleton/skeleton.component';
import { SkeletonContentDirective } from '@shared/ui/skeleton/skeleton-content.directive';
import { SkeletonFieldsComponent } from '@shared/ui/skeleton/skeleton-fields.component';
import { SkeletonFactsComponent } from '@shared/ui/skeleton/skeleton-facts.component';
import { SkeletonBlockComponent } from '@shared/ui/skeleton/skeleton-block.component';
import { FieldErrors } from '@shared/forms/field-errors';
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
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, tap } from 'rxjs';
import { AdminEnvironmentsService, Environment } from '../data/admin-environments.service';
import { AdminGuestsService, GuestDetail, Stay } from '@core/api/clients/admin-guests.service';
import { bodyCodeOf, toBffError, toBffErrorWithServerMessage } from '@core/http/bff-error';
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
  guestName,
  NO_ENVIRONMENT,
  STAY_CREATED_TEXT,
  STAY_UPDATED_TEXT,
  todayText,
} from '../model/guest-texts';
import { goneText, stayFieldText } from '../model/stay-document-failures';
import { callFailure } from '@shared/forms/call-failure';
import { GUEST_FORM_STYLES } from './guest-form.styles';
import { openGuestNoticeDialog } from '../components/guest-notice-dialog.component';
import { ToastService } from '@shared/ui/toast/toast.service';
import {
  LoadState,
  FieldKey,
  FIELD_KEYS,
  Notice,
  NOTICES,
  Draft,
  EMPTY_DRAFT,
  draftOf,
  Fact,
  optionOf,
  changesOf,
  nightsValue,
} from '../model/stay-form';

const GENERAL_ERROR_ID = 'stay-form-error';

/**
 * A3.5 (RN-13, RN-17, RN-20, CU-31) on the approved canvas: registers a stay of a temporary guest,
 * or corrects one with the `version` it was loaded with (BE-SPR-DAT-13). The environment is chosen
 * among the active ones free for the whole stay. Ids are opaque and travel as they came.
 */
@Component({
  selector: 'app-stay-form',
  imports: [
    ChangesNoticeComponent,
    RefreshErrorComponent,
    FormSummaryLayoutComponent,
    GuestFormHeaderComponent,
    SkeletonBlockComponent,
    SkeletonFactsComponent,
    SkeletonFieldsComponent,
    SkeletonContentDirective,
    SkeletonComponent,
    RouterLink,
  ],
  templateUrl: './stay-form.component.html',
  styles: [GUEST_PAGE_STYLES, GUEST_FORM_STYLES],
})
export class StayFormComponent {
  private readonly guests = inject(AdminGuestsService);
  private readonly environments = inject(AdminEnvironmentsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toasts = inject(ToastService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly generalErrorId = GENERAL_ERROR_ID;
  protected readonly today = todayText();
  protected readonly describedBy = describedBy;
  protected readonly guestId = this.route.snapshot.paramMap.get('id') ?? '';
  /** The stay being corrected, or null when a new one is registered. */
  protected readonly stayId = this.route.snapshot.paramMap.get('stayId');

  protected readonly draft = signal<Draft>(EMPTY_DRAFT);
  /** The environment ENVIRONMENT_OCCUPIED rejected for the dates typed; cleared when they change. */
  private readonly rejected = signal<string | null>(null);

  /** The guest names the screen and the side panel; without it the form still works. */
  private readonly guestRead = rxResource<GuestDetail, undefined>({
    stream: () => this.guests.get(this.guestId),
  });
  protected readonly guest = computed(() =>
    this.guestRead.hasValue() ? this.guestRead.value() : null,
  );

  /** The stay to correct with its current `version`; its answer starts the form from it. */
  private readonly stayRead = rxResource<Stay | null, string | undefined>({
    params: () => this.stayId ?? undefined,
    stream: ({ params: stayId }) =>
      this.guests.findStay(this.guestId, stayId).pipe(
        tap((stay) => {
          const before = this.freeDates();
          this.rejected.set(null);
          this.draft.set(stay ? draftOf(stay) : EMPTY_DRAFT);
          // The same dates ask nothing by themselves: the free environments are asked again.
          if (stay && sameDates(before, this.freeDates())) this.askFreeAgain();
        }),
      ),
  });
  private readonly stay = new ResourceContent(this.stayRead, {
    message: (error) => toBffErrorWithServerMessage(error).message,
  });
  protected readonly retrying = this.stay.retrying;
  protected readonly refreshing = this.stay.refreshing;
  protected readonly refreshError = this.stay.refreshProblem;
  /** A new stay has nothing to load: its form is ready at once. A stay not found is gone too. */
  protected readonly state = computed<LoadState>(() => {
    if (this.stayId === null) return { kind: 'ready' };
    const page = this.stay.page();
    return page.kind === 'ready' && this.stay.data() === null ? { kind: 'not-found' } : page;
  });
  protected readonly loaded = computed(() => this.stay.data());

  /**
   * Every free environment for the dates typed, all pages, read again when they change; nothing
   * while they are not valid. An environment no longer offered is unselected once they arrive.
   */
  private readonly freeDates = computed(
    () => (this.datesReady() ? datesOf(this.draft()) : undefined),
    { equal: sameDates },
  );
  private readonly freeRead = rxResource<readonly Environment[], FreeDates | undefined>({
    params: () => this.freeDates(),
    stream: ({ params: { start, end } }) =>
      this.environments.allFree(start, end).pipe(
        tap((free) => {
          this.free.set(free);
          this.keepChoiceIfOffered();
        }),
      ),
  });
  private readonly freeContent = new ResourceContent(this.freeRead, {
    message: (error) => toBffErrorWithServerMessage(error).message,
  });
  /** The free environments of the last dates read: they stay while other dates are checked. */
  protected readonly free = signal<readonly Environment[]>([]);
  protected readonly freeRetrying = this.freeContent.retrying;
  protected readonly freeState = computed<LoadState>(() => {
    if (this.freeRead.status() === 'idle') return { kind: 'idle' };
    const state = this.freeContent.state();
    if (state.status === 'initial-loading') return { kind: 'loading' };
    if (state.status === 'initial-error') return { kind: 'error', message: state.message };
    return { kind: 'ready' };
  });
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly generalError = signal<string | null>(null);
  /** Errors the BFF tied to a field, shown next to it until that field changes. */
  private readonly fieldErrors = new FieldErrors<FieldKey>();
  protected readonly serverErrors = this.fieldErrors.values;

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
    () =>
      this.state().kind === 'ready' &&
      !this.busy() &&
      !this.refreshing() &&
      this.refreshError() === null &&
      this.dirty(),
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

  private readonly destroyRef = inject(DestroyRef);

  protected readonly changesStale = signal(false);
  protected readonly changesStarted = watchChanges({
    keys: [`admin.guest:${this.guestId}`, 'admin.environments'],
    reload: () => {
      this.guestRead.reload();
      if (this.stayId !== null) this.loadStay();
      this.freeContent.reload();
    },
    busy: () => this.stayRead.isLoading() || this.freeRead.isLoading() || this.busy(),
    defer: () =>
      this.stayId !== null
        ? this.dirty()
        : Object.values(this.draft()).some((value) => value !== ''),
    stale: () => {
      this.changesStale.set(true);
    },
  });

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
    if (this.retrying() || this.refreshing() || this.state().kind === 'loading') return;
    if (this.stayId !== null) this.loadStay();
  }

  protected retryFree(): void {
    if (this.freeRetrying() || this.freeState().kind === 'loading') return;
    if (!this.datesReady()) return;
    this.freeContent.retry();
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
      if (!this.destroyRef.destroyed) await this.failed(error);
      return;
    } finally {
      if (!this.destroyRef.destroyed) this.busy.set(false);
    }
    if (this.destroyRef.destroyed) return;
    this.toasts.show(loaded ? STAY_UPDATED_TEXT : STAY_CREATED_TEXT);
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
    this.fieldErrors.clear(field);
  }

  private async failed(error: unknown): Promise<void> {
    if (isConcurrentModification(error)) {
      return this.concurrent();
    }
    const code = bodyCodeOf(error) ?? '';
    const notice = NOTICES[code];
    if (notice) {
      if (code === 'ENVIRONMENT_OCCUPIED') this.rejected.set(this.draft().environmentId || null);
      return this.notice(notice);
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      this.toasts.show(goneText(callFailure(error)));
      return this.backToGuest();
    }
    const { message, field } = toBffError(error);
    const key = FIELD_KEYS[field ?? ''];
    if (code === 'STAY_OVERLAP') {
      // The text of the BFF names the stay the dates cross (SRS 17).
      const overlap = toBffErrorWithServerMessage(error).message;
      this.serverErrors.update((errors) => ({ ...errors, dates: overlap }));
    } else if (key && code === 'VALIDATION_ERROR') {
      this.serverErrors.update((errors) => ({ ...errors, [key]: stayFieldText(key) }));
    } else {
      this.generalError.set(message);
    }
    focusFirstProblem(this.host, this.injector, GENERAL_ERROR_ID);
  }

  /** The canvas words it "El registro cambió", with "Cerrar" and "Volver a cargar". */
  private async concurrent(): Promise<void> {
    const ref = openConcurrentModificationDialog(this.dialog, { backLabel: 'Cerrar' });
    const choice = await firstValueFrom(ref.afterClosed());
    if (!this.destroyRef.destroyed && choice === 'reload' && this.stayId !== null) {
      this.loadStay();
    }
  }

  private async notice(notice: Notice): Promise<void> {
    const ref = openGuestNoticeDialog(this.dialog, {
      title: notice.title,
      message: notice.text,
      buttonLabel: notice.buttonLabel,
    });
    await firstValueFrom(ref.afterClosed());
    if (this.destroyRef.destroyed) return;
    if (notice.leaves) {
      await this.backToGuest();
      return;
    }
    // The environment was taken meanwhile: show the ones still free and go choose another.
    this.askFreeAgain();
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

  /** Reads the stay again with its current `version`; what the BFF refused before is forgotten. */
  private loadStay(): void {
    this.submitted.set(false);
    this.serverErrors.set({});
    this.generalError.set(null);
    this.stay.reload();
  }

  /** The dates changed: the free environments follow them; while they are not valid, none is offered. */
  private refreshFree(): void {
    if (this.datesReady()) return;
    this.free.set([]);
    this.keepChoiceIfOffered();
  }

  /** The same dates, asked again (the BFF said an environment was taken, or the stay was reread). */
  private askFreeAgain(): void {
    if (this.datesReady()) this.freeRead.reload();
  }

  /** An environment no longer offered for the dates is unselected. */
  private keepChoiceIfOffered(): void {
    const chosen = this.draft().environmentId;
    if (chosen !== '' && !this.options().some((option) => option.id === chosen)) {
      this.draft.update((draft) => ({ ...draft, environmentId: '' }));
    }
  }
  protected reloadChanges(): void {
    this.changesStale.set(false);
    this.guestRead.reload();
    if (this.stayId !== null) this.loadStay();
    else this.askFreeAgain();
  }
}

interface FreeDates {
  readonly start: string;
  readonly end: string;
}

function datesOf({ start, end }: Draft): FreeDates {
  return { start, end };
}

function sameDates(a: FreeDates | undefined, b: FreeDates | undefined): boolean {
  return a?.start === b?.start && a?.end === b?.end;
}

function valueOf(target: EventTarget | null): string {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement
    ? target.value
    : '';
}
