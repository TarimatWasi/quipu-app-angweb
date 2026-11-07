import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import type { Environment, GuestDetail, GuestSummary } from '../model/contract-form';

/** The most the BFF gives in a page: the pickers of A4.1 are read in one. */
const PICKER_PAGE_SIZE = 100;

/**
 * What the form of A4.1 offers to choose from: the guests that can take a contract and the
 * environments that can receive it. The BFF decides who can (RN-35, RN-13, RN-25, RF-01, RN-20);
 * the form only lists them, and the BFF still checks when the contract is loaded.
 */
@Injectable({ providedIn: 'root' })
export class ContractOptionsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin`;

  /** The active guests of type contract without a contract in force (A4.1, TAR-237). */
  guests(): Observable<GuestSummary[]> {
    const params = new HttpParams()
      .set('type', 'CONTRACT')
      .set('status', 'ACTIVE')
      .set('withoutContract', true)
      .set('limit', PICKER_PAGE_SIZE);
    return this.http
      .get<{ content: GuestSummary[] }>(`${this.base}/guests`, { params })
      .pipe(map((page) => page.content));
  }

  /** The guest a contract is loaded for from its 360 (A3.2), to say who it is. */
  guest(id: string): Observable<GuestDetail> {
    return this.http.get<GuestDetail>(`${this.base}/guests/${encodeURIComponent(id)}`);
  }

  /** The active environments, with who is in them today. */
  environments(): Observable<Environment[]> {
    const params = new HttpParams().set('status', 'ACTIVE').set('limit', PICKER_PAGE_SIZE);
    return this.http
      .get<{ content: Environment[] }>(`${this.base}/environments`, { params })
      .pipe(map((page) => page.content));
  }
}
