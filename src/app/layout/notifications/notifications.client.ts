import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import type { components } from '@core/api/bff.generated';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';

export type Notification = components['schemas']['Notification'];
export type PagedNotifications = components['schemas']['PagedNotifications'];
export type NotificationArea = 'admin' | 'guest';

/**
 * The bell of contract v0.27.0: the administrators share one inbox (each account keeps its own
 * read marks) and each guest has its own. The server words `title` and `body`; the client never
 * composes them. Ids are opaque and only escaped for the URL.
 */
@Injectable({ providedIn: 'root' })
export class NotificationsClient {
  private readonly http = inject(HttpClient);
  private readonly csrf = inject(CsrfBootstrapService);
  private readonly base = `${inject(BFF_BASE_URL)}/bff`;

  /** One page, newest first, with the unread count of the account (independent of the page). */
  page(area: NotificationArea, after: string | null): Observable<PagedNotifications> {
    const params: Record<string, string> = after === null ? {} : { after };
    return this.http.get<PagedNotifications>(`${this.base}/${area}/notifications`, { params });
  }

  read(area: NotificationArea, id: string): Observable<void> {
    const url = `${this.base}/${area}/notifications/${encodeURIComponent(id)}/read`;
    return this.csrf.protect(() => this.http.post(url, null)).pipe(map(() => undefined));
  }

  readAll(area: NotificationArea): Observable<void> {
    const url = `${this.base}/${area}/notifications/read-all`;
    return this.csrf.protect(() => this.http.post(url, null)).pipe(map(() => undefined));
  }
}
