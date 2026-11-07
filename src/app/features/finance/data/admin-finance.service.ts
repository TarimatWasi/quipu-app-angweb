import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import type {
  Expense,
  ExpensePage,
  Fine,
  PendingCredit,
  Refund,
  RefundPage,
  Summary,
} from '../model/finance';
import type { ExpenseInput, FineInput, GuestSummary, RefundInput } from '../model/finance-forms';

/** Rows asked per page of A6; «Mostrar más» asks the next with the cursor. */
export const MOVEMENTS_PAGE_SIZE = 20;

/** The most the BFF gives in a page: the guests of a fine are read in one. */
const GUESTS_PAGE_SIZE = 100;

/**
 * The finance of the administrator (A6, A6.1 to A6.5): the balance of a month, its movements and the
 * credit that waits for a refund. Ids and cursors are opaque: they travel as the BFF gave them.
 */
@Injectable({ providedIn: 'root' })
export class AdminFinanceService {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfBootstrapService);
  private readonly base = `${inject(BFF_BASE_URL)}/bff/admin`;

  private month(month: string): HttpParams {
    return new HttpParams().set('month', month);
  }

  private page(month: string, after?: string): HttpParams {
    const params = this.month(month).set('limit', MOVEMENTS_PAGE_SIZE);
    return after === undefined ? params : params.set('after', after);
  }

  summary(month: string): Observable<Summary> {
    return this.http.get<Summary>(`${this.base}/finance`, { params: this.month(month) });
  }

  expenses(month: string, after?: string): Observable<ExpensePage> {
    return this.http.get<ExpensePage>(`${this.base}/expenses`, { params: this.page(month, after) });
  }

  /** The fines of the month, which the BFF does not paginate. */
  fines(month: string): Observable<Fine[]> {
    return this.http.get<Fine[]>(`${this.base}/fines`, { params: this.month(month) });
  }

  refunds(month: string, after?: string): Observable<RefundPage> {
    return this.http.get<RefundPage>(`${this.base}/refunds`, { params: this.page(month, after) });
  }

  /** The guests with credit to refund, the oldest first; they do not depend on the month. */
  pendingCredits(): Observable<PendingCredit[]> {
    const params = new HttpParams().set('pending', true);
    return this.http.get<PendingCredit[]>(`${this.base}/credits`, { params });
  }

  /** Every guest, active or inactive: a fine can be charged after the guest left (RN-30). */
  guests(): Observable<GuestSummary[]> {
    const params = new HttpParams().set('status', 'ALL').set('limit', GUESTS_PAGE_SIZE);
    return this.http
      .get<{ content: GuestSummary[] }>(`${this.base}/guests`, { params })
      .pipe(map((page) => page.content));
  }

  createExpense(input: ExpenseInput): Observable<Expense> {
    return this.csrf.protect(() => this.http.post<Expense>(`${this.base}/expenses`, input));
  }

  /** An edit is the whole expense again with the `version` that was loaded (BE-SPR-DAT-13). */
  updateExpense(id: string, input: ExpenseInput, version: number): Observable<Expense> {
    return this.csrf.protect(() =>
      this.http.patch<Expense>(`${this.base}/expenses/${encodeURIComponent(id)}`, {
        ...input,
        version,
      }),
    );
  }

  deleteExpense(id: string): Observable<unknown> {
    return this.csrf.protect(() =>
      this.http.delete(`${this.base}/expenses/${encodeURIComponent(id)}`),
    );
  }

  createFine(input: FineInput): Observable<Fine> {
    return this.csrf.protect(() => this.http.post<Fine>(`${this.base}/fines`, input));
  }

  deleteFine(id: string): Observable<unknown> {
    return this.csrf.protect(() =>
      this.http.delete(`${this.base}/fines/${encodeURIComponent(id)}`),
    );
  }

  createRefund(input: RefundInput): Observable<Refund> {
    return this.csrf.protect(() => this.http.post<Refund>(`${this.base}/refunds`, input));
  }
}
