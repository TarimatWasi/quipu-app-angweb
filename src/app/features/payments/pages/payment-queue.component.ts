import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AdminPaymentsService,
  PaymentQueueItem,
  PaymentStatus,
} from '@core/services/admin-payments.service';
import { toBffErrorWithServerMessage } from '@core/services/bff-error';
import { formatDateTime, periodLabel, proofsSummary } from '../payment-format';
import { PAYMENT_PAGE_STYLES } from '../payment-page.styles';
import type { QueueViewParam } from '../queue-views';

interface QueueView {
  readonly status: PaymentStatus;
  readonly label: string;
  /** Value of `?vista=` in the address, so "Volver a Pagos" can come back to the same view. */
  readonly param: QueueViewParam;
  readonly empty: string;
  readonly action: string;
}

const VIEWS: readonly [QueueView, ...QueueView[]] = [
  {
    status: 'PENDING',
    label: 'Por revisar',
    param: 'por-revisar',
    empty: 'No hay pagos por revisar.',
    action: 'Revisar',
  },
  {
    status: 'APPROVED',
    label: 'Aprobados',
    param: 'aprobados',
    empty: 'No hay pagos aprobados.',
    action: 'Ver pago',
  },
  {
    status: 'REJECTED',
    label: 'Rechazados',
    param: 'rechazados',
    empty: 'No hay pagos rechazados.',
    action: 'Corregir pago',
  },
];

const RESOLVED_BY: Readonly<Record<PaymentStatus, string>> = {
  PENDING: '',
  APPROVED: 'Aprobado por',
  REJECTED: 'Rechazado por',
};

interface QueueRow {
  readonly id: string;
  readonly guest: string;
  readonly document: string;
  readonly environment: string;
  readonly period: string;
  readonly submitted: string;
  readonly proofs: string;
  readonly resolvedBy: string | null;
}

function toRow(item: PaymentQueueItem): QueueRow {
  const reviewer = item.reviewedBy?.name;
  return {
    id: item.id,
    guest: item.guestName ?? 'Sin nombre aún',
    document: item.documentNumber,
    environment: item.environmentCode ?? '—',
    period: periodLabel(item),
    submitted: formatDateTime(item.submittedAt),
    proofs: proofsSummary(item.voucherCount, item.hasCash),
    resolvedBy: reviewer ? `${RESOLVED_BY[item.status]} ${reviewer}` : null,
  };
}

/**
 * A5 (RF-05): the payments of a view, oldest first, page by page with "Mostrar más". The rows do
 * not carry the amount: the administrator compares it in A5.2.
 */
@Component({
  selector: 'app-payment-queue',
  imports: [MatButton, RouterLink],
  templateUrl: './payment-queue.component.html',
  styles: PAYMENT_PAGE_STYLES,
})
export class PaymentQueueComponent {
  private readonly payments = inject(AdminPaymentsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly views = VIEWS;
  protected readonly view = signal<QueueView>(VIEWS[0]);
  protected readonly rows = signal<readonly QueueRow[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  /** True once the first page of the view answered, so "empty" is never shown while loading. */
  protected readonly loaded = signal(false);
  protected readonly oldestId = computed(() =>
    this.view().status === 'PENDING' ? (this.rows()[0]?.id ?? null) : null,
  );

  // Moves with every new request, so a late answer of a previous view or page is ignored.
  private request = 0;
  private started = false;

  constructor() {
    // The address decides the view (?vista=), also when only it changes on this same page.
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const view = VIEWS.find((v) => v.param === params.get('vista')) ?? VIEWS[0];
      if (this.started && view === this.view()) return;
      this.started = true;
      this.view.set(view);
      void this.load();
    });
  }

  protected choose(view: QueueView): void {
    if (view === this.view()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { vista: view.param },
      replaceUrl: true,
    });
  }

  protected reload(): void {
    void this.load();
  }

  protected more(): void {
    const cursor = this.nextCursor();
    if (cursor !== null) {
      void this.load(cursor);
    }
  }

  protected openOldest(): void {
    const id = this.oldestId();
    if (id !== null) {
      void this.router.navigate(['/admin/payments', id], {
        queryParams: { vista: this.view().param },
      });
    }
  }

  private async load(after?: string): Promise<void> {
    const request = ++this.request;
    const status = this.view().status;
    if (after === undefined) {
      this.rows.set([]);
      this.nextCursor.set(null);
      this.loaded.set(false);
    }
    this.loading.set(true);
    this.error.set(null);
    try {
      const page = await firstValueFrom(this.payments.list(status, after));
      if (request !== this.request) return;
      this.rows.update((rows) => [...rows, ...page.content.map(toRow)]);
      this.nextCursor.set(page.nextCursor);
      this.loaded.set(true);
    } catch (error: unknown) {
      if (request !== this.request) return;
      this.error.set(toBffErrorWithServerMessage(error).message);
    } finally {
      if (request === this.request) {
        this.loading.set(false);
      }
    }
  }
}
