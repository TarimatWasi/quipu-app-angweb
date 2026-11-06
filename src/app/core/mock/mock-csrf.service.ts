import { DOCUMENT } from '@angular/common';
import { HttpRequest, HttpXsrfTokenExtractor } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { CSRF_INVALID_TEXT } from '@core/http/csrf-failure';
import { failure, noContent } from './mock-reply';
import type { MockReply } from './mock-types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const ROTATIONS = new Set(['/bff/auth/login', '/bff/auth/activate', '/bff/auth/change-password']);

/** Browser-only simulated server lifecycle; production still uses only Angular's native XSRF. */
@Injectable({ providedIn: 'root' })
export class MockCsrfService {
  private readonly document = inject(DOCUMENT);
  private readonly extractor = inject(HttpXsrfTokenExtractor);

  async handle(
    request: HttpRequest<unknown>,
    path: string,
    handler: () => MockReply | Promise<MockReply>,
  ): Promise<MockReply> {
    if (request.method === 'GET' && path === '/bff/auth/csrf') {
      if (!this.extractor.getToken()) this.issue();
      return noContent();
    }
    if (!SAFE_METHODS.has(request.method)) {
      const token = this.extractor.getToken();
      if (!token || request.headers.get('X-XSRF-TOKEN') !== token) {
        return failure(403, 'AUTH_CSRF_INVALID', CSRF_INVALID_TEXT);
      }
    }
    const reply = await handler();
    if (reply.status < 400 && !SAFE_METHODS.has(request.method)) {
      if (ROTATIONS.has(path)) this.issue();
      if (path === '/bff/auth/logout')
        this.document.cookie = 'XSRF-TOKEN=; Path=/; Max-Age=0; SameSite=Lax';
    }
    return reply;
  }

  private issue(): void {
    // A non-secret mock token. HttpOnly=false and host-only are necessary for the native extractor.
    this.document.cookie = `XSRF-TOKEN=mock-${crypto.randomUUID()}; Path=/; SameSite=Lax`;
  }
}
