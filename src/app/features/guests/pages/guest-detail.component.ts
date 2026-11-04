import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatAnchor } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminGuestsService, GuestDetail, Stay } from '@core/api/clients/admin-guests.service';
import { toBffErrorWithServerMessage } from '@core/http/bff-error';
import { formatMoney } from '@shared/payments/payment-format';
import { GUEST_PAGE_STYLES } from './guest-page.styles';
import {
  Badge,
  documentText,
  GUEST_STATUS_BADGES,
  GUEST_TYPE_LABELS,
  guestName,
  NO_ENVIRONMENT,
  nightsBetween,
  nightsText,
  SLOW_TEXT,
  STAY_PAYMENT_BADGES,
  stayDatesWithYear,
  todayText,
} from '../model/guest-texts';
import { LoadTiming } from './load-timing';
import { GUEST_DETAIL_STYLES } from './guest-detail.styles';

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error'; readonly message: string };

/** The payment action of a stay: to its payment (A5.2) or to register one (A5.1). */
interface PaymentAction {
  readonly label: string;
  readonly link: readonly string[];
  readonly query: Readonly<Record<string, string>> | null;
}

interface StayRow {
  readonly id: string;
  readonly dates: string;
  readonly sub: string;
  readonly amount: string;
  readonly badge: Badge;
  readonly payment: PaymentAction;
}

const PAID_LABELS: Readonly<Record<Stay['paymentStatus'], string>> = {
  UNDER_REVIEW: 'Revisar pago',
  PAID: 'Ver pago',
  // With a payment, unpaid or overdue means it was rejected: it is corrected (RN-05, RN-15).
  UNPAID: 'Corregir pago',
  OVERDUE: 'Corregir pago',
};

function paymentAction(stay: Stay, guestId: string): PaymentAction {
  if (stay.paymentId !== null) {
    return {
      label: PAID_LABELS[stay.paymentStatus],
      link: ['/admin/payments', stay.paymentId],
      query: null,
    };
  }
  return { label: 'Registrar pago', link: ['/admin/payments/new'], query: { guestId } };
}

function rowOf(stay: Stay, guestId: string): StayRow {
  const nights = nightsBetween(stay.startDate, stay.endDate);
  const environment = stay.environmentCode ?? NO_ENVIRONMENT;
  return {
    id: stay.id,
    dates: stayDatesWithYear(stay.startDate, stay.endDate),
    sub: nights === null ? environment : `${environment} · ${nightsText(nights)}`,
    amount: formatMoney(stay.agreedAmount),
    badge: STAY_PAYMENT_BADGES[stay.paymentStatus],
    payment: paymentAction(stay, guestId),
  };
}

/**
 * A3.2, minimal (TAR-213), on the approved canvas: who the guest is (name, document, type and state)
 * and, for a temporary guest, its stays with "Registrar estadía" and "Corregir estadía" (A3.5). A
 * guest pending activation offers "Corregir documento" (RN-36). Ids are opaque.
 */
@Component({
  selector: 'app-guest-detail',
  imports: [MatAnchor, RouterLink],
  templateUrl: './guest-detail.component.html',
  styles: [GUEST_PAGE_STYLES, GUEST_DETAIL_STYLES],
})
export class GuestDetailComponent implements OnInit {
  private readonly guests = inject(AdminGuestsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly today = todayText();
  protected readonly slowText = SLOW_TEXT;
  protected readonly timing = new LoadTiming();
  protected readonly guest = signal<GuestDetail | null>(null);
  protected readonly state = signal<LoadState>({ kind: 'loading' });
  protected readonly stays = signal<readonly StayRow[]>([]);
  protected readonly staysCursor = signal<string | null>(null);
  protected readonly staysState = signal<LoadState>({ kind: 'loading' });

  protected readonly title = computed(() => {
    const guest = this.guest();
    return guest ? guestName(guest) : 'Huésped';
  });
  protected readonly documentText = computed(() => {
    const guest = this.guest();
    return guest ? documentText(guest) : '';
  });
  protected readonly typeText = computed(() => {
    const guest = this.guest();
    return guest ? GUEST_TYPE_LABELS[guest.type] : '';
  });
  protected readonly statusBadge = computed(() => {
    const guest = this.guest();
    return guest ? GUEST_STATUS_BADGES[guest.status] : null;
  });
  protected readonly temporary = computed(() => this.guest()?.type === 'TEMPORARY');
  /** A temporary guest still activating its account takes no stay yet (RN-35): the canvas says so. */
  protected readonly blocked = computed(() => {
    const guest = this.guest();
    return (
      guest?.type === 'TEMPORARY' &&
      (guest.status === 'PENDING_ACTIVATION' || guest.status === 'ONBOARDING')
    );
  });
  protected readonly showStays = computed(() => this.temporary() && !this.blocked());
  /** Only an active guest takes a new stay (RN-35); an inactive one keeps its history. */
  protected readonly canRegister = computed(() => this.guest()?.status === 'ACTIVE');
  /** Only a guest pending activation can have its document corrected (RN-36). */
  protected readonly documentCorrectable = computed(
    () => this.guest()?.status === 'PENDING_ACTIVATION',
  );
  protected readonly dataNote = computed(() =>
    this.guest()?.status === 'PENDING_ACTIVATION'
      ? 'Su nombre y sus datos los completa el huésped al activar su acceso.'
      : 'Sus datos de contacto los cambia solo el huésped, desde Mis datos.',
  );
  protected readonly staysError = computed(() => {
    const state = this.staysState();
    return state.kind === 'error' ? state.message : '';
  });

  private currentId = '';
  // Each one moves with every load, so a late answer for a previous guest or page is ignored.
  private request = 0;
  private staysRequest = 0;
  // The cursor of the last page asked, so "Reintentar" asks that same page again.
  private staysAfter: string | undefined;

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => {
      this.timing.stop();
    });
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      void this.load(params.get('id') ?? '');
    });
  }

  protected retry(): void {
    void this.load(this.currentId);
  }

  protected retryStays(): void {
    void this.loadStays(this.currentId, this.staysAfter);
  }

  protected moreStays(): void {
    const cursor = this.staysCursor();
    if (cursor !== null) void this.loadStays(this.currentId, cursor);
  }

  private async load(id: string): Promise<void> {
    const request = ++this.request;
    this.currentId = id;
    this.state.set({ kind: 'loading' });
    this.timing.start();
    this.guest.set(null);
    this.staysRequest++;
    this.stays.set([]);
    this.staysCursor.set(null);
    try {
      const guest = await firstValueFrom(this.guests.get(id));
      if (request !== this.request) return;
      this.timing.stop();
      this.guest.set(guest);
      this.state.set({ kind: 'ready' });
      if (this.showStays()) await this.loadStays(id);
    } catch (error: unknown) {
      if (request !== this.request) return;
      this.timing.stop();
      const notFound = error instanceof HttpErrorResponse && error.status === 404;
      this.state.set(
        notFound
          ? { kind: 'not-found' }
          : { kind: 'error', message: toBffErrorWithServerMessage(error).message },
      );
    }
  }

  private async loadStays(id: string, after?: string): Promise<void> {
    const request = ++this.staysRequest;
    this.staysAfter = after;
    this.staysState.set({ kind: 'loading' });
    try {
      const page = await firstValueFrom(this.guests.stays(id, after));
      if (request !== this.staysRequest) return;
      const rows = page.content.map((stay) => rowOf(stay, id));
      this.stays.update((current) => (after === undefined ? rows : [...current, ...rows]));
      this.staysCursor.set(page.nextCursor);
      this.staysState.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (request !== this.staysRequest) return;
      this.staysState.set({ kind: 'error', message: toBffErrorWithServerMessage(error).message });
    }
  }
}
