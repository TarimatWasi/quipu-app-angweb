import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BFF_BASE_URL } from '@core/config/bff-base-url';

/**
 * Sends the BFF session cookie (HttpOnly) when the BFF lives on another origin
 * (QP-ANGWEB-SES-01). With the default same-origin setup (empty base URL, /bff/* forwarded by the
 * platform) the browser already sends the cookie and no flag is needed.
 */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const base = inject(BFF_BASE_URL);
  const toCrossOriginBff = base !== '' && (req.url === base || req.url.startsWith(`${base}/`));
  return next(toCrossOriginBff ? req.clone({ withCredentials: true }) : req);
};
