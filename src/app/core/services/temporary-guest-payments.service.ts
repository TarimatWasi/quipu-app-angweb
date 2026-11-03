import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import {
  GuestPayment,
  OwnPaymentsApi,
  OwnPaymentSummary,
  OwnProofEdit,
  OwnProofInput,
  paymentUrl,
  proofsBody,
} from './own-payments';

export type StayPaymentStatus = components['schemas']['StayPaymentStatus'];

/**
 * The payment of the temporary guest's stay (T1 entry, T2). The guest does not choose the stay: the
 * BFF takes the guest from the session and the stay in force or the next one (CU-22, RN-03).
 */
@Injectable({ providedIn: 'root' })
export class TemporaryGuestPaymentsService implements OwnPaymentsApi {
  private readonly http = inject(HttpClient);
  private readonly root = inject(BFF_BASE_URL);
  private readonly base = `${this.root}/bff/temporary-guest/payments`;

  /** The stay in force today, otherwise the next one, otherwise the last one (T1). */
  paymentStatus(): Observable<StayPaymentStatus> {
    return this.http.get<StayPaymentStatus>(`${this.root}/bff/temporary-guest/payment-status`);
  }

  get(id: string): Observable<GuestPayment> {
    return this.http.get<GuestPayment>(paymentUrl(this.base, id));
  }

  /** Sends the single payment of the stay (StayPaymentUpload): only the proofs and their files. */
  upload(proofs: readonly OwnProofInput[], files: readonly File[]): Observable<OwnPaymentSummary> {
    return this.http.post<OwnPaymentSummary>(this.base, proofsBody(proofs, files));
  }

  correct(
    id: string,
    proofs: readonly OwnProofEdit[],
    files: readonly File[],
  ): Observable<OwnPaymentSummary> {
    return this.http.put<OwnPaymentSummary>(paymentUrl(this.base, id), proofsBody(proofs, files));
  }
}
