import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import { proofsBody } from '@shared/payments/proofs-body';
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { components, operations } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';

// Every type comes from the contract (TAR-23).
export type PaymentStatus = components['schemas']['PaymentQueueItem']['status'];
export type PaymentQueueItem = components['schemas']['PaymentQueueItem'];
export type PaymentQueuePage = components['schemas']['PagedPaymentQueue'];
export type PaymentDetail = components['schemas']['Payment'];
export type AdminProof = components['schemas']['AdminProof'];
export type PaymentSurplus = components['schemas']['PaymentSurplus'];
export type { ProofKind } from '../model/proof-kind';
import type { QueueSummary } from '../model/payment-queue';
export type { QueueSummary } from '../model/payment-queue';
export type ProofEdit = components['schemas']['ProofEdit'];
type ResolveBody = operations['resolvePayment']['requestBody']['content']['application/json'];
export type VerifiedProof = NonNullable<ResolveBody['proofs']>[number];
export type PayablePeriod = components['schemas']['PayablePeriod'];
export type ProofInput = components['schemas']['ProofInput'];
export type PaymentSummary = components['schemas']['PaymentSummary'];
type AdminDashboard =
  operations['getAdminDashboard']['responses'][200]['content']['application/json'];

/** What a direct payment is for: exactly one of a contract month or a stay (DirectPaymentUpload). */
export type DirectPaymentTarget =
  | { readonly period: string; readonly stayId?: never }
  | { readonly stayId: string; readonly period?: never };

/** The fields of `createDirectPayment` other than the files. */
export interface DirectPayment {
  readonly guestId: string;
  readonly target: DirectPaymentTarget;
  /** yyyy-mm-dd; absent means the day of the registration. */
  readonly receivedOn?: string;
  readonly proofs: readonly ProofInput[];
}

/** Rows asked per page of the queue; "Mostrar más" asks the next page with the cursor. */
export const PAYMENT_QUEUE_PAGE_SIZE = 20;

/**
 * The administrator's payments (A5 queue, A5.1 direct payment, A5.2 review). Ids and cursors are opaque: they are passed
 * back exactly as the BFF gave them, only escaped for the URL.
 */
@Injectable({ providedIn: 'root' })
export class AdminPaymentsService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfBootstrapService);
  private readonly root = inject(BFF_BASE_URL);
  private readonly base = `${this.root}/bff/admin/payments`;

  /** One page of a view of the queue, oldest first. */
  list(
    status: PaymentStatus,
    after?: string,
    limit = PAYMENT_QUEUE_PAGE_SIZE,
  ): Observable<PaymentQueuePage> {
    let params = new HttpParams().set('status', status).set('limit', limit);
    if (after !== undefined) {
      params = params.set('after', after);
    }
    return this.http.get<PaymentQueuePage>(this.base, { params });
  }

  /** The id of the payment that has waited longest for its review, or null when none waits. */
  oldestPendingId(): Observable<string | null> {
    return this.list('PENDING', undefined, 1).pipe(map((page) => page.content[0]?.id ?? null));
  }

  /**
   * The counts of A5 from the administrator's home (A1): the pending vouchers come oldest first and
   * the rejected payments not yet corrected bring their oldest one (`getAdminDashboard`).
   */
  queueSummary(): Observable<QueueSummary> {
    return this.http.get<AdminDashboard>(`${this.root}/bff/admin/dashboard`).pipe(
      map((dashboard) => ({
        pendingTotal: dashboard.pendingVouchersTotal,
        oldestPending: dashboard.pendingVouchers[0] ?? null,
        rejected: dashboard.rejected,
      })),
    );
  }

  get(id: string): Observable<PaymentDetail> {
    return this.http.get<PaymentDetail>(this.url(id));
  }

  approve(id: string, proofs: readonly VerifiedProof[]): Observable<unknown> {
    const body: ResolveBody = { status: 'APPROVED', proofs: [...proofs] };
    return this.csrf.protect(() => this.http.patch(this.url(id), body));
  }

  reject(id: string, reason: string): Observable<unknown> {
    const body: ResolveBody = { status: 'REJECTED', reason };
    return this.csrf.protect(() => this.http.patch(this.url(id), body));
  }

  /**
   * Replaces the whole set of proofs (kept ones with their `id`, new ones without), multipart: the
   * proofs as a JSON part and the new files in the order their `fileIndex` points to.
   */
  correctProofs(
    id: string,
    proofs: readonly ProofEdit[],
    files: readonly File[],
  ): Observable<unknown> {
    const body = proofsBody(proofs, files);
    return this.csrf.protect(() => this.http.put(`${this.url(id)}/proofs`, body));
  }

  /** What a guest can pay or has pending, for a direct payment (A5.1), oldest first. */
  payablePeriods(guestId: string): Observable<PayablePeriod[]> {
    return this.http.get<PayablePeriod[]>(
      `${this.root}/bff/admin/guests/${encodeURIComponent(guestId)}/payable-periods`,
    );
  }

  /**
   * Registers a direct payment, approved at once (A5.1, RN-23), multipart as DirectPaymentUpload:
   * `guestId`, exactly one of `period` or `stayId`, `receivedOn` when given, the proofs as a JSON
   * part and the voucher files in the order their `fileIndex` points to.
   */
  createDirect(payment: DirectPayment, files: readonly File[]): Observable<PaymentSummary> {
    const fields: Record<string, string> = { guestId: payment.guestId };
    if (payment.target.period !== undefined) fields['period'] = payment.target.period;
    else fields['stayId'] = payment.target.stayId;
    if (payment.receivedOn !== undefined) fields['receivedOn'] = payment.receivedOn;
    const body = proofsBody(payment.proofs, files, fields);
    return this.csrf.protect(() => this.http.post<PaymentSummary>(this.base, body));
  }

  private url(id: string): string {
    return `${this.base}/${encodeURIComponent(id)}`;
  }
}
