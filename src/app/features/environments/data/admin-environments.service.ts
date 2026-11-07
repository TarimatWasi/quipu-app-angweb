import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import type {
  Environment,
  EnvironmentPage,
  EnvironmentStatus,
  EnvironmentType,
} from '../model/environment';

type Created = components['schemas']['Environment'];

/** Environments asked per page of A2; «Mostrar más» asks the next with the cursor. */
export const ENVIRONMENTS_PAGE_SIZE = 20;

/** The body of a correction: only what changed, and the `version` that was loaded (BE-SPR-DAT-13). */
export interface EnvironmentChanges {
  readonly version: number;
  readonly code?: string;
  readonly type?: EnvironmentType;
}

/**
 * The environments of the administrator (A2, A2.1 to A2.4). Ids and cursors are opaque: they travel
 * as the BFF gave them, only escaped for the URL.
 */
@Injectable({ providedIn: 'root' })
export class AdminEnvironmentsService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfBootstrapService);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin/environments`;

  private url(id: string, ...rest: string[]): string {
    return [this.base, encodeURIComponent(id), ...rest].join('/');
  }

  /** One page of the environments of a state, ordered by code. */
  list(status: EnvironmentStatus, after?: string): Observable<EnvironmentPage> {
    let params = new HttpParams().set('status', status).set('limit', ENVIRONMENTS_PAGE_SIZE);
    if (after !== undefined) {
      params = params.set('after', after);
    }
    return this.http.get<EnvironmentPage>(this.base, { params });
  }

  get(id: string): Observable<Environment> {
    return this.http.get<Environment>(this.url(id));
  }

  create(input: { code: string; type: EnvironmentType }): Observable<Created> {
    return this.csrf.protect(() => this.http.post<Created>(this.base, input));
  }

  update(id: string, changes: EnvironmentChanges): Observable<Environment> {
    return this.csrf.protect(() => this.http.patch<Environment>(this.url(id), changes));
  }

  deactivate(id: string): Observable<unknown> {
    return this.csrf.protect(() => this.http.post(this.url(id, 'deactivate'), null));
  }

  reactivate(id: string): Observable<unknown> {
    return this.csrf.protect(() => this.http.post(this.url(id, 'reactivate'), null));
  }
}
