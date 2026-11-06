import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor with an absolute BFF base URL', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        // A BFF on another origin (NG_APP_BFF_BASE_URL set to an absolute https URL).
        { provide: BFF_BASE_URL, useValue: 'https://api.example.org' },
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('sends credentials on requests to the BFF origin', () => {
    http.get('https://api.example.org/bff/ping').subscribe();
    const req = controller.expectOne('https://api.example.org/bff/ping');
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('does not send credentials to other origins nor to a lookalike host', () => {
    for (const url of [
      'https://example.org/data',
      'https://api.example.org.evil.example/bff/ping',
    ]) {
      http.get(url).subscribe();
      const req = controller.expectOne(url);
      expect(req.request.withCredentials).toBe(false);
      req.flush({});
    }
  });
});
