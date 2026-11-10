import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { GUEST_PAYMENTS_PAGE_SIZE } from '../model/guest-payments';

export type PaymentSummary = components['schemas']['PaymentSummary'];
export type GuestPaymentsPage = components['schemas']['PagedPayments'];

/**
 * The payment history of one guest for the administrator (A3.2, RF-10), newest first and without
 * the voucher URL (A5.2 asks for it). The id and the cursor are opaque: they go back as the BFF
 * gave them, only escaped for the URL.
 */
@Injectable({ providedIn: 'root' })
export class GuestPaymentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin/guests`;

  /** The first page of the guest's payments, or the one after `after` (the previous `nextCursor`). */
  page(guestId: string, after: string | null = null): Observable<GuestPaymentsPage> {
    let params = new HttpParams().set('limit', GUEST_PAYMENTS_PAGE_SIZE);
    if (after !== null) params = params.set('after', after);
    return this.http.get<GuestPaymentsPage>(
      `${this.base}/${encodeURIComponent(guestId)}/payments`,
      { params },
    );
  }
}
