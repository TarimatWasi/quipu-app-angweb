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

  it('same-origin is the default: /bff calls are relative and need no credentials flag', () => {
    expect(environment.bffBaseUrl).toBe('');
    http.get('/bff/ping').subscribe();
    const req = controller.expectOne('/bff/ping');
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });

  it('does not send credentials to other origins', () => {
    http.get('https://example.org/data').subscribe();
    const req = controller.expectOne('https://example.org/data');
    expect(req.request.withCredentials).toBe(false);
    req.flush({});
  });
});
