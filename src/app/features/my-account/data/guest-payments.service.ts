import { proofsBody } from '@shared/payments/proofs-body';
import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { OwnPaymentsService, OwnPaymentSummary, OwnProofInput } from './own-payments';

export type PeriodStatus = components['schemas']['PeriodStatus'];
export type GuestHistoryPage = components['schemas']['PagedGuestHistory'];
export type GuestHistoryItem = components['schemas']['GuestHistoryItem'];
export type GuestRefund = components['schemas']['GuestRefund'];
export type GuestCredit = components['schemas']['GuestCredit'];

/** Items asked per page of the history (H4); "Mostrar más" asks the next page with the cursor. */
export const GUEST_HISTORY_PAGE_SIZE = 20;

/**
 * The payments of the guest with a contract (H1 entries, H3, H4). The BFF takes the guest from the
 * session (RN-09): no guest id is ever sent. Payment ids and cursors are opaque.
 */
@Injectable({ providedIn: 'root' })
export class GuestPaymentsService extends OwnPaymentsService {
  protected readonly base = `${this.root}/bff/guest/payments`;

  /** Every period of the guest's contracts with its state (H1). */
  accountStatus(): Observable<PeriodStatus[]> {
    return this.http.get<PeriodStatus[]>(`${this.root}/bff/guest/account-status`);
  }

  /** The own credit and whether Quipu will refund it (getOwnCredit, H1, RN-38). */
  credit(): Observable<GuestCredit> {
    return this.http.get<GuestCredit>(`${this.root}/bff/guest/credit`);
  }

  /** One page of the own history, newest first (H4). */
  history(after?: string, limit = GUEST_HISTORY_PAGE_SIZE): Observable<GuestHistoryPage> {
    let params = new HttpParams().set('limit', limit);
    if (after !== undefined) {
      params = params.set('after', after);
    }
    return this.http.get<GuestHistoryPage>(this.base, { params });
  }

  /** Sends the payment of a month (GuestPaymentUpload): `period`, the proofs and their files. */
  upload(
    period: string,
    proofs: readonly OwnProofInput[],
    files: readonly File[],
  ): Observable<OwnPaymentSummary> {
    return this.csrf.protect(() =>
      this.http.post<OwnPaymentSummary>(this.base, proofsBody(proofs, files, { period })),
    );
  }
}
