import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { credentialsInterceptor } from '../interceptors/credentials.interceptor';
import { AuthService, LoginRequest } from './auth.service';

const LOGIN_URL = `${environment.bffBaseUrl}/bff/auth/login`;
const REQUEST: LoginRequest = {
  documentType: 'DNI',
  documentNumber: '12345678',
  password: 'secret-1',
};

describe('AuthService', () => {
  let service: AuthService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([credentialsInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AuthService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    controller.verify();
  });

  it('starts without a session', () => {
    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });

  it('posts the credentials to the BFF with the session cookie and stores the session', () => {
    let received: unknown;
    service.login(REQUEST).subscribe((session) => {
      received = session;
    });

    const req = controller.expectOne(LOGIN_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(REQUEST);
    expect(req.request.withCredentials).toBe(true);
    req.flush({ role: 'ADMIN', name: 'admin@example.test', mustChangePassword: true });

    expect(received).toEqual({
      role: 'ADMIN',
      name: 'admin@example.test',
      mustChangePassword: true,
    });
    expect(service.session()).toEqual({
      role: 'ADMIN',
      name: 'admin@example.test',
      mustChangePassword: true,
    });
    expect(service.isAuthenticated()).toBe(true);
  });

  it('keeps no session and rethrows the error on a 401', () => {
    let failure: unknown;
    service.login(REQUEST).subscribe({
      error: (error: unknown) => {
        failure = error;
      },
    });

    controller
      .expectOne(LOGIN_URL)
      .flush(
        { code: 'AUTH_INVALID_CREDENTIALS', message: 'Documento o contraseña incorrectos' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(failure).toBeDefined();
    expect(service.session()).toBeNull();
  });

  it('keeps the previous session when a later login fails', () => {
    service.login(REQUEST).subscribe();
    controller.expectOne(LOGIN_URL).flush({ role: 'GUEST', name: 'a', mustChangePassword: false });

    service.login(REQUEST).subscribe({ error: () => undefined });
    controller.expectOne(LOGIN_URL).flush({}, { status: 500, statusText: 'Server Error' });

    expect(service.session()?.role).toBe('GUEST');
  });

  it('clears the client session', () => {
    service.login(REQUEST).subscribe();
    controller.expectOne(LOGIN_URL).flush({ role: 'ADMIN', name: 'a', mustChangePassword: false });

    service.clear();

    expect(service.session()).toBeNull();
    expect(service.isAuthenticated()).toBe(false);
  });
});
