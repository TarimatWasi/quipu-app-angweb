import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import type { Contract, ContractPage, ContractStatus } from '../model/contract';
import type { NewContract } from '../model/contract-form';

/** Contracts asked per page of A4; «Mostrar más» asks the next with the cursor. */
export const CONTRACTS_PAGE_SIZE = 20;

/** The most the BFF gives in a page: the contracts about to end are read whole. */
const SOON_PAGE_SIZE = 100;

/** The multipart form of a new contract: the PDF and the fields as text. */
export function contractBody(input: NewContract): FormData {
  const body = new FormData();
  body.append('file', input.file, input.file.name);
  body.append('environmentId', input.environmentId);
  body.append('guestId', input.guestId);
  body.append('monthlyAmount', String(input.monthlyAmount));
  body.append('paymentDay', String(input.paymentDay));
  body.append('graceDays', String(input.graceDays));
  body.append('startDate', input.startDate);
  if (input.endDate !== null) body.append('endDate', input.endDate);
  return body;
}

/**
 * The contracts of the administrator (A4, A4.1 to A4.3). Ids and cursors are opaque: they travel as
 * the BFF gave them, only escaped for the URL.
 */
@Injectable({ providedIn: 'root' })
export class AdminContractsService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfBootstrapService);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin/contracts`;

  private url(id: string, ...rest: string[]): string {
    return [this.base, encodeURIComponent(id), ...rest].join('/');
  }

  /** One page of the contracts of a state. */
  list(status: ContractStatus, after?: string): Observable<ContractPage> {
    let params = new HttpParams().set('status', status).set('limit', CONTRACTS_PAGE_SIZE);
    if (after !== undefined) {
      params = params.set('after', after);
    }
    return this.http.get<ContractPage>(this.base, { params });
  }

  /** The Vigentes that end in 30 days or fewer, soonest first (RF-09, D-27). */
  expiringSoon(): Observable<ContractPage> {
    const params = new HttpParams().set('expiringSoon', true).set('limit', SOON_PAGE_SIZE);
    return this.http.get<ContractPage>(this.base, { params });
  }

  /** The contract with the link of its PDF, signed for 15 minutes. */
  get(id: string): Observable<Contract> {
    return this.http.get<Contract>(this.url(id));
  }

  create(input: NewContract): Observable<Contract> {
    return this.csrf.protect(() => this.http.post<Contract>(this.base, contractBody(input)));
  }

  /** Finalizes it (204); doing it twice changes nothing and the debt stays (RN-25). */
  terminate(id: string): Observable<unknown> {
    return this.csrf.protect(() => this.http.post(this.url(id, 'terminate'), null));
  }
}
