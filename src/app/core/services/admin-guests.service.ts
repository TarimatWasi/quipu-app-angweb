import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';

// Every type comes from the contract (TAR-23).
export type GuestSummary = components['schemas']['GuestSummary'];
export type GuestPage = components['schemas']['PagedGuests'];
export type GuestDetail = components['schemas']['GuestDetail'];

/** Guests asked per page of the picker of A5.1: the most the contract allows. */
export const GUEST_PICKER_PAGE_SIZE = 100;

/**
 * The reads of guests that the payment screens need (A5.1). Ids and cursors are opaque: they are
 * passed back exactly as the BFF gave them, only escaped for the URL.
 */
@Injectable({ providedIn: 'root' })
export class AdminGuestsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin/guests`;

  /**
   * One page of every guest, the inactive ones included: they can still pay what they owe (CU-28,
   * RN-27). The contract has no search, so the picker walks the pages with the cursor.
   */
  list(after?: string): Observable<GuestPage> {
    let params = new HttpParams().set('status', 'ALL').set('limit', GUEST_PICKER_PAGE_SIZE);
    if (after !== undefined) {
      params = params.set('after', after);
    }
    return this.http.get<GuestPage>(this.base, { params });
  }

  get(id: string): Observable<GuestDetail> {
    return this.http.get<GuestDetail>(`${this.base}/${encodeURIComponent(id)}`);
  }
}
