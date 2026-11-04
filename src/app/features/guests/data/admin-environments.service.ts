import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { EMPTY, expand, Observable, reduce } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import type { Environment } from '../model/environment';

// Every type comes from the contract (TAR-23).
export type { Environment };
export type EnvironmentPage = components['schemas']['PagedEnvironments'];

/** Environments asked per page of the picker of A3.5: the most the contract allows. */
export const ENVIRONMENT_PICKER_PAGE_SIZE = 100;

/** The reads of environments other screens need (A3.5). Cursors are opaque and travel as they came. */
@Injectable({ providedIn: 'root' })
export class AdminEnvironmentsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin/environments`;

  /** One page of the active environments free from `freeFrom` to `freeTo` (RN-20, TAR-237). */
  listFree(freeFrom: string, freeTo: string, after?: string): Observable<EnvironmentPage> {
    let params = new HttpParams()
      .set('status', 'ACTIVE')
      .set('freeFrom', freeFrom)
      .set('freeTo', freeTo)
      .set('limit', ENVIRONMENT_PICKER_PAGE_SIZE);
    if (after !== undefined) {
      params = params.set('after', after);
    }
    return this.http.get<EnvironmentPage>(this.base, { params });
  }

  /**
   * Every active environment free from `freeFrom` to `freeTo`, walking the pages with the cursor:
   * a choice is only known to be taken once the whole list is in.
   */
  allFree(freeFrom: string, freeTo: string): Observable<Environment[]> {
    return this.listFree(freeFrom, freeTo).pipe(
      expand((page) =>
        page.nextCursor === null ? EMPTY : this.listFree(freeFrom, freeTo, page.nextCursor),
      ),
      reduce<EnvironmentPage, Environment[]>((all, page) => all.concat(page.content), []),
    );
  }
}
