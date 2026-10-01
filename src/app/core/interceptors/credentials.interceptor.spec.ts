import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { credentialsInterceptor } from './credentials.interceptor';

describe('credentialsInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
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

  it('sends credentials on requests to the BFF', () => {
    http.get(`${environment.bffBaseUrl}/bff/ping`).subscribe();
    const req = controller.expectOne(`${environment.bffBaseUrl}/bff/ping`);
    expect(req.request.withCredentials).toBe(true);
    req.flush({});
  });

  it('does not send credentials to other origins', () => {
    http.get('https://example.org/data').subscribe();
    const req = controller.expectOne('https://example.org/data');
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });

  it('does not match an origin that only shares the BFF prefix', () => {
    const lookalike = `${environment.bffBaseUrl}.evil.example/bff/ping`;
    http.get(lookalike).subscribe();
    const req = controller.expectOne(lookalike);
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });
});
