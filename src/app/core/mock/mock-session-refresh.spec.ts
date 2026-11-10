import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { CsrfBootstrapService } from '@core/http/csrf-bootstrap.service';
import { sessionRefreshInterceptor } from '@core/http/session-refresh.interceptor';
import { DEMO_CLAVE, DEMO_USERS } from './data/demo-users';
import { MOCK_LATENCY, MockBff } from './mock-bff';
import { mockBffInterceptor } from './mock-bff.interceptor';
import { resetMockSettings } from './mock-bff.testing';

/** The refresh of the app (TAR-360) in front of the simulated BFF, as `withMockBff` chains them. */
async function signedIn() {
  resetMockSettings();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(
        withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
        withInterceptors([sessionRefreshInterceptor]),
      ),
      provideHttpClient(withInterceptors([mockBffInterceptor])),
      { provide: MOCK_LATENCY, useValue: { normalMs: 0, slowMs: 0 } },
    ],
  });
  const http = TestBed.inject(HttpClient);
  const bff = TestBed.inject(MockBff);
  const admin = DEMO_USERS.admin;
  await firstValueFrom(
    TestBed.inject(CsrfBootstrapService).protect(() =>
      http.post('/bff/auth/login', {
        documentType: admin.documentType,
        documentNumber: admin.documentNumber,
        password: DEMO_CLAVE,
      }),
    ),
  );
  const renew = vi.spyOn(bff, 'renewSession');
  return { http, bff, renew };
}

describe('the refresh of the session against the simulated BFF (TAR-364)', () => {
  afterEach(() => {
    resetMockSettings();
  });

  it('renews an expired access once for the calls in flight and answers them', async () => {
    const { http, bff, renew } = await signedIn();
    bff.expire('access-expired');

    const [me, guests] = await Promise.all([
      firstValueFrom(http.get<{ role: string }>('/bff/auth/me')),
      firstValueFrom(http.get<{ content: unknown[] }>('/bff/admin/guests')),
    ]);

    expect(me.role).toBe('ADMIN');
    expect(guests.content.length).toBeGreaterThan(0);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(bff.sessionState()).toBe('live');
  });

  it('lets the 401 through when the session cannot be renewed, and closes it', async () => {
    const { http, bff, renew } = await signedIn();
    bff.expire('expired');

    const error: unknown = await firstValueFrom(http.get('/bff/auth/me')).catch(
      (failure: unknown) => failure,
    );

    expect(error).toBeInstanceOf(HttpErrorResponse);
    expect((error as HttpErrorResponse).status).toBe(401);
    expect(renew).toHaveBeenCalledTimes(1);
    expect(bff.user()).toBeNull();
  });
});
