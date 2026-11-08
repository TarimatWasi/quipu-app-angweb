import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import { proofsBody } from '@shared/payments/proofs-body';

// Every type comes from the contract (TAR-23).
export type GuestPayment = components['schemas']['GuestPayment'];
export type GuestProof = components['schemas']['GuestProof'];
export type OwnProofInput = components['schemas']['ProofInput'];
export type OwnProofEdit = components['schemas']['ProofEdit'];
export type OwnPaymentSummary = components['schemas']['PaymentSummary'];

/**
 * What H3 (guest with a contract) and T2 (temporary guest) share: their own payment, read and
 * corrected by id. The guest is always the one of the session; no guest id ever travels.
 */
export interface OwnPaymentsApi {
  get(id: string): Observable<GuestPayment>;
  /** Replaces the whole set of proofs of a rejected payment and sends it again (RN-05). */
  correct(
    id: string,
    proofs: readonly OwnProofEdit[],
    files: readonly File[],
  ): Observable<OwnPaymentSummary>;
}

/** The path of one payment under `base`; ids are opaque and only escaped for the URL. */
export function paymentUrl(base: string, id: string): string {
  return `${base}/${encodeURIComponent(id)}`;
}

/**
 * What the two services of the own payment have in common (TAR-326): they read one payment by id
 * and correct a rejected one with the same calls; they differ in the path they hang from
 * (`base`) and in how a payment is first sent, which each service keeps.
 */
export abstract class OwnPaymentsService implements OwnPaymentsApi {
  protected readonly http = inject(HttpClient);
  protected readonly csrf = inject(CsrfBootstrapService);
  protected readonly root = inject(BFF_BASE_URL);

  /** The path of the payments of this kind of guest, under the BFF. */
  protected abstract readonly base: string;

  get(id: string): Observable<GuestPayment> {
    return this.http.get<GuestPayment>(paymentUrl(this.base, id));
  }

  correct(
    id: string,
    proofs: readonly OwnProofEdit[],
    files: readonly File[],
  ): Observable<OwnPaymentSummary> {
    return this.csrf.protect(() =>
      this.http.put<OwnPaymentSummary>(paymentUrl(this.base, id), proofsBody(proofs, files)),
    );
  }
}
