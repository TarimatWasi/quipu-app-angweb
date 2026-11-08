import { proofsBody } from '@shared/payments/proofs-body';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { OwnPaymentsService, OwnPaymentSummary, OwnProofInput } from './own-payments';

export type StayPaymentStatus = components['schemas']['StayPaymentStatus'];

/**
 * The payment of the temporary guest's stay (T1 entry, T2). The guest does not choose the stay: the
 * BFF takes the guest from the session and the stay in force or the next one (CU-22, RN-03).
 */
@Injectable({ providedIn: 'root' })
export class TemporaryGuestPaymentsService extends OwnPaymentsService {
  protected readonly base = `${this.root}/bff/temporary-guest/payments`;

  /** The stay in force today, otherwise the next one, otherwise the last one (T1). */
  paymentStatus(): Observable<StayPaymentStatus> {
    return this.http.get<StayPaymentStatus>(`${this.root}/bff/temporary-guest/payment-status`);
  }

  /** Sends the single payment of the stay (StayPaymentUpload): only the proofs and their files. */
  upload(proofs: readonly OwnProofInput[], files: readonly File[]): Observable<OwnPaymentSummary> {
    return this.csrf.protect(() =>
      this.http.post<OwnPaymentSummary>(this.base, proofsBody(proofs, files)),
    );
  }
}
