import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import type { AdminDashboard } from '../model/dashboard-charges';

/** The home of the administrator (A1, CU-04): one read with everything the screen shows. */
@Injectable({ providedIn: 'root' })
export class AdminDashboardService {
  private readonly http = inject(HttpClient);
  private readonly root = inject(BFF_BASE_URL);

  get(): Observable<AdminDashboard> {
    return this.http.get<AdminDashboard>(`${this.root}/bff/admin/dashboard`);
  }
}
