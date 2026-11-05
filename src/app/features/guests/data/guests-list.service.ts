import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { GUEST_PAGE_SIZE } from '../model/guest-list';
import type { GuestPage, GuestQuery } from '../model/guest-list';

/**
 * The list of A3 (RF-02): one page of guests of a view, with the type and state the BFF filters.
 * The search of the screen never travels: it filters what is loaded. The cursor is opaque and goes
 * back exactly as the BFF gave it.
 */
@Injectable({ providedIn: 'root' })
export class GuestsListService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin/guests`;

  /** The first page of `query`, or the one after `after` (the `nextCursor` of the previous one). */
  page(query: GuestQuery, after: string | null = null): Observable<GuestPage> {
    let params = new HttpParams().set('status', query.status).set('limit', GUEST_PAGE_SIZE);
    if (query.type !== null) {
      params = params.set('type', query.type);
    }
    if (after !== null) {
      params = params.set('after', after);
    }
    return this.http.get<GuestPage>(this.base, { params });
  }
}
