import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatAnchor, MatButton } from '@angular/material/button';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminGuestsService, GuestDetail, Stay } from '@core/services/admin-guests.service';
import { toBffErrorWithServerMessage } from '@core/services/bff-error';
import { formatMoney, formatStay, PERIOD_STATUS_LABELS } from '@shared/payments/payment-format';
import { GUEST_PAGE_STYLES } from '../guest-page.styles';
import {
  DOCUMENT_TYPE_LABELS,
  GUEST_STATUS_LABELS,
  GUEST_TYPE_LABELS,
  NO_ENVIRONMENT,
  NO_NAME,
} from '../guest-texts';
import { GUEST_DETAIL_STYLES } from './guest-detail.styles';

type LoadState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready' }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'error'; readonly message: string };

interface StayRow {
  readonly id: string;
  readonly environment: string;
  readonly dates: string;
  readonly amount: string;
  readonly payment: string;
}

function rowOf(stay: Stay): StayRow {
  return {
    id: stay.id,
    environment: stay.environmentCode ?? NO_ENVIRONMENT,
    dates: formatStay(stay.startDate, stay.endDate),
    amount: formatMoney(stay.agreedAmount),
    payment: PERIOD_STATUS_LABELS[stay.paymentStatus],
  };
}

/**
 * A3.2, minimal (TAR-213): who the guest is (name, document, type and state) and, for a temporary
 * guest, its stay history with "Registrar estadía" and "Corregir" (A3.5). A guest pending
 * activation offers "Corregir documento" (RN-36). Ids are opaque and travel as they came.
 */
@Component({
  selector: 'app-guest-detail',
  imports: [MatAnchor, MatButton, RouterLink],
  templateUrl: './guest-detail.component.html',
  styles: [GUEST_PAGE_STYLES, GUEST_DETAIL_STYLES],
})
export class GuestDetailComponent implements OnInit {
  private readonly guests = inject(AdminGuestsService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly guest = signal<GuestDetail | null>(null);
  protected readonly state = signal<LoadState>({ kind: 'loading' });
  protected readonly stays = signal<readonly StayRow[]>([]);
  protected readonly staysCursor = signal<string | null>(null);
  protected readonly staysState = signal<LoadState>({ kind: 'loading' });

  protected readonly name = computed(() => this.guest()?.name ?? NO_NAME);
  protected readonly documentText = computed(() => {
    const guest = this.guest();
    return guest ? `${DOCUMENT_TYPE_LABELS[guest.documentType]} ${guest.documentNumber}` : '';
  });
  protected readonly typeText = computed(() => {
    const guest = this.guest();
    return guest ? GUEST_TYPE_LABELS[guest.type] : '';
  });
  protected readonly statusText = computed(() => {
    const guest = this.guest();
    return guest ? GUEST_STATUS_LABELS[guest.status] : '';
  });
  protected readonly temporary = computed(() => this.guest()?.type === 'TEMPORARY');
  /** Only a guest pending activation can have its document corrected (RN-36). */
  protected readonly documentCorrectable = computed(
    () => this.guest()?.status === 'PENDING_ACTIVATION',
  );
  protected readonly loadError = computed(() => {
    const state = this.state();
    return state.kind === 'error' ? state.message : '';
  });
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
    this.guest.set(null);
    this.staysRequest++;
    this.stays.set([]);
    this.staysCursor.set(null);
    try {
      const guest = await firstValueFrom(this.guests.get(id));
      if (request !== this.request) return;
      this.guest.set(guest);
      this.state.set({ kind: 'ready' });
      if (guest.type === 'TEMPORARY') await this.loadStays(id);
    } catch (error: unknown) {
      if (request !== this.request) return;
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
      const rows = page.content.map(rowOf);
      this.stays.update((current) => (after === undefined ? rows : [...current, ...rows]));
      this.staysCursor.set(page.nextCursor);
      this.staysState.set({ kind: 'ready' });
    } catch (error: unknown) {
      if (request !== this.staysRequest) return;
      this.staysState.set({ kind: 'error', message: toBffErrorWithServerMessage(error).message });
    }
  }
}
