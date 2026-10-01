import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export type DocumentType = 'DNI' | 'CE' | 'PASSPORT';
export type Role = 'ADMIN' | 'GUEST';

export interface LoginRequest {
  readonly documentType: DocumentType;
  readonly documentNumber: string;
  readonly password: string;
}

/** What the BFF answers to a login. The session token itself travels in an HttpOnly cookie. */
export interface Session {
  readonly role: Role;
  readonly name: string;
  readonly mustChangePassword: boolean;
}

/**
 * Client-side view of the BFF session. The token is never readable from JavaScript
 * (FE-ANG-HTTP-02), so after a page reload there is nothing to restore it from: the BFF has no
 * "who am I" endpoint yet, and the guard sends the user back to the login.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly current = signal<Session | null>(null);

  readonly session = this.current.asReadonly();
  readonly isAuthenticated = computed(() => this.current() !== null);

  login(request: LoginRequest): Observable<Session> {
    return this.http.post<Session>(`${environment.bffBaseUrl}/bff/auth/login`, request).pipe(
      tap((session) => {
        this.current.set(session);
      }),
    );
  }

  /** Forgets the session in this tab. The BFF has no logout yet: the cookie lives until it expires. */
  clear(): void {
    this.current.set(null);
  }
}
