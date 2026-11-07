import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import type { components, operations } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';

export type OwnContract = components['schemas']['Contract'];
/** The contract in force and, if a renewal is already loaded, the next one (H2, CU-18). */
export type OwnContracts =
  operations['getOwnContract']['responses'][200]['content']['application/json'];

/**
 * The contracts of the guest with a contract (H2). The BFF takes the guest from the session
 * (RN-09): no guest id is ever sent. A 404 says the guest never had a contract.
 */
@Injectable({ providedIn: 'root' })
export class OwnContractService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(BFF_BASE_URL)}/bff/guest/contract`;

  /** Never cacheable: it carries a signed link of 15 minutes for each contract file. */
  get(): Observable<OwnContracts> {
    return this.http.get<OwnContracts>(this.url);
  }
}
