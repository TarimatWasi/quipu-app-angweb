import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, first, map, Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';

// Every type comes from the contract (TAR-23).
export type GuestSummary = components['schemas']['GuestSummary'];
export type GuestPage = components['schemas']['PagedGuests'];
export type GuestDetail = components['schemas']['GuestDetail'];
export type PendingGuestDetail = components['schemas']['PendingGuestDetail'];
export type GuestUpdate = components['schemas']['GuestUpdateInput'];
export type DocumentType = components['schemas']['DocumentType'];
export type Stay = components['schemas']['Stay'];
export type StayPage = components['schemas']['PagedStays'];
export type StayInput = components['schemas']['StayInput'];
export type StayUpdate = components['schemas']['StayUpdateInput'];

/** Guests asked per page of the picker of A5.1: the most the contract allows. */
export const GUEST_PICKER_PAGE_SIZE = 100;
/** Stays asked per page of the history of A3.2; "Cargar más estadías" asks the next one. */
export const STAY_PAGE_SIZE = 20;
/** The most the contract allows per page, used to find one stay by walking the pages. */
const MAX_PAGE_SIZE = 100;

/**
 * The guests of the administrator: the reads the payment screens need (A5.1), the detail (A3.2)
 * and the stays and document corrections of A3.5. Ids and cursors are opaque: they are passed back
 * exactly as the BFF gave them, only escaped for the URL.
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
    return this.http.get<GuestDetail>(this.guestUrl(id));
  }

  /** Corrects the document of a guest pending activation (RN-36), with the `version` loaded. */
  updateGuest(id: string, changes: GuestUpdate): Observable<GuestSummary> {
    return this.http.patch<GuestSummary>(this.guestUrl(id), changes);
  }

  /** One page of the stays of a temporary guest, newest first (RN-13). */
  stays(id: string, after?: string, limit = STAY_PAGE_SIZE): Observable<StayPage> {
    let params = new HttpParams().set('limit', limit);
    if (after !== undefined) {
      params = params.set('after', after);
    }
    return this.http.get<StayPage>(this.staysUrl(id), { params });
  }

  /**
   * One stay as it is now, with its current `version`. The contract has no read of a single stay,
   * so the pages are walked until it shows up; null when no page has it.
   */
  findStay(id: string, stayId: string): Observable<Stay | null> {
    const has = (page: StayPage) => page.content.some((stay) => stay.id === stayId);
    return this.stays(id, undefined, MAX_PAGE_SIZE).pipe(
      expand((page) =>
        has(page) || page.nextCursor === null
          ? EMPTY
          : this.stays(id, page.nextCursor, MAX_PAGE_SIZE),
      ),
      map((page) => page.content.find((stay) => stay.id === stayId) ?? null),
      first((stay): stay is Stay => stay !== null, null),
    );
  }

  createStay(id: string, input: StayInput): Observable<Stay> {
    return this.http.post<Stay>(this.staysUrl(id), input);
  }

  /** Corrects a stay with the changed fields and the `version` loaded (BE-SPR-DAT-13). */
  updateStay(id: string, stayId: string, changes: StayUpdate): Observable<Stay> {
    return this.http.patch<Stay>(`${this.staysUrl(id)}/${encodeURIComponent(stayId)}`, changes);
  }

  private guestUrl(id: string): string {
    return `${this.base}/${encodeURIComponent(id)}`;
  }

  private staysUrl(id: string): string {
    return `${this.guestUrl(id)}/stays`;
  }
}
