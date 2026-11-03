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
export type ProofKind = components['schemas']['ProofKind'];
export type ProofEdit = components['schemas']['ProofEdit'];
type ResolveBody = operations['resolvePayment']['requestBody']['content']['application/json'];
export type VerifiedProof = NonNullable<ResolveBody['proofs']>[number];

/** Rows asked per page of the queue; "Mostrar más" asks the next page with the cursor. */
export const PAYMENT_QUEUE_PAGE_SIZE = 20;

/**
 * The administrator's payments (A5 queue, A5.2 review). Ids and cursors are opaque: they are passed
 * back exactly as the BFF gave them, only escaped for the URL.
 */
@Injectable({ providedIn: 'root' })
export class AdminPaymentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin/payments`;

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

  get(id: string): Observable<PaymentDetail> {
    return this.http.get<PaymentDetail>(this.url(id));
  }

  approve(id: string, proofs: readonly VerifiedProof[]): Observable<unknown> {
    const body: ResolveBody = { status: 'APPROVED', proofs: [...proofs] };
    return this.http.patch(this.url(id), body);
  }

  reject(id: string, reason: string): Observable<unknown> {
    const body: ResolveBody = { status: 'REJECTED', reason };
    return this.http.patch(this.url(id), body);
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
    const body = new FormData();
    body.append('proofs', new Blob([JSON.stringify(proofs)], { type: 'application/json' }));
    for (const file of files) {
      body.append('files', file, file.name);
    }
    return this.http.put(`${this.url(id)}/proofs`, body);
  }

  private url(id: string): string {
    return `${this.base}/${encodeURIComponent(id)}`;
  }
}
