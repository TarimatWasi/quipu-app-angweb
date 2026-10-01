import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/** Sends the BFF session cookie (HttpOnly) with every request to the BFF (QP-ANGWEB-SES-01). */
export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  const toBff =
    req.url === environment.bffBaseUrl || req.url.startsWith(`${environment.bffBaseUrl}/`);
  return next(toBff ? req.clone({ withCredentials: true }) : req);
};
