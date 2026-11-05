import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import type {
  AdministratorCreated,
  AdministratorInput,
  AdministratorSummary,
} from '../model/administrator';

type Reauthentication = components['schemas']['AdministratorReauthentication'];

/**
 * The administrators (A7, RF-22, TAR-127): the list is a read that follows the page (FE-ANG-HTTP-03)
 * and each change is an explicit call. Ids are opaque: passed back as the BFF gave them, only
 * escaped for the URL. The password of the session travels only in the body.
 */
@Injectable({ providedIn: 'root' })
export class AdministratorsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin/administrators`;

  /**
   * Every administrator, active and inactive, oldest first. Call it in an injection context: the
   * read lives as long as that context, and `reload()` asks the list again.
   */
  list(): HttpResourceRef<AdministratorSummary[] | undefined> {
    return httpResource<AdministratorSummary[]>(() => this.base);
  }

  create(input: AdministratorInput): Observable<AdministratorCreated> {
    return this.http.post<AdministratorCreated>(this.base, input);
  }

  deactivate(id: string, currentPassword: string): Observable<void> {
    return this.change(id, 'deactivate', currentPassword);
  }

  reactivate(id: string, currentPassword: string): Observable<void> {
    return this.change(id, 'reactivate', currentPassword);
  }

  private change(
    id: string,
    action: 'deactivate' | 'reactivate',
    currentPassword: string,
  ): Observable<void> {
    const body: Reauthentication = { currentPassword };
    return this.http
      .post(`${this.base}/${encodeURIComponent(id)}/${action}`, body)
      .pipe(map(() => undefined));
  }
}
