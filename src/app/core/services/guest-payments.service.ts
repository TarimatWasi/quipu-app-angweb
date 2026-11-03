import { HttpClient, HttpParams } from '@angular/common/http';
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

export type PeriodStatus = components['schemas']['PeriodStatus'];
export type GuestHistoryPage = components['schemas']['PagedGuestHistory'];
export type GuestHistoryItem = components['schemas']['GuestHistoryItem'];
export type GuestRefund = components['schemas']['GuestRefund'];

/** Items asked per page of the history (H4); "Mostrar más" asks the next page with the cursor. */
export const GUEST_HISTORY_PAGE_SIZE = 20;

/**
 * The payments of the guest with a contract (H1 entries, H3, H4). The BFF takes the guest from the
 * session (RN-09): no guest id is ever sent. Payment ids and cursors are opaque.
 */
@Injectable({ providedIn: 'root' })
export class GuestPaymentsService implements OwnPaymentsApi {
  private readonly http = inject(HttpClient);
  private readonly root = inject(BFF_BASE_URL);
  private readonly base = `${this.root}/bff/guest/payments`;

  /** Every period of the guest's contracts with its state (H1). */
  accountStatus(): Observable<PeriodStatus[]> {
    return this.http.get<PeriodStatus[]>(`${this.root}/bff/guest/account-status`);
  }

  /** One page of the own history, newest first (H4). */
  history(after?: string, limit = GUEST_HISTORY_PAGE_SIZE): Observable<GuestHistoryPage> {
    let params = new HttpParams().set('limit', limit);
    if (after !== undefined) {
      params = params.set('after', after);
    }
    return this.http.get<GuestHistoryPage>(this.base, { params });
  }

  get(id: string): Observable<GuestPayment> {
    return this.http.get<GuestPayment>(paymentUrl(this.base, id));
  }

  /** Sends the payment of a month (GuestPaymentUpload): `period`, the proofs and their files. */
  upload(
    period: string,
    proofs: readonly OwnProofInput[],
    files: readonly File[],
  ): Observable<OwnPaymentSummary> {
    return this.http.post<OwnPaymentSummary>(this.base, proofsBody(proofs, files, { period }));
  }

  correct(
    id: string,
    proofs: readonly OwnProofEdit[],
    files: readonly File[],
  ): Observable<OwnPaymentSummary> {
    return this.http.put<OwnPaymentSummary>(paymentUrl(this.base, id), proofsBody(proofs, files));
  }
}
