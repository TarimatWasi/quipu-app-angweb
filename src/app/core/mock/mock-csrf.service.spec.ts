import { HttpXsrfTokenExtractor } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { setUpMockBff } from './mock-bff.testing';
import { DEMO_CLAVE } from './data/demo-users';

describe('Mock CSRF HTTP lifecycle', () => {
  it('bootstraps without a session, emits no body and preserves an existing cookie', async () => {
    const mock = setUpMockBff();
    document.cookie = 'XSRF-TOKEN=; Path=/; Max-Age=0';
    const first = await firstValueFrom(mock.http.get('/bff/auth/csrf', { observe: 'response' }));
    const extractor = TestBed.inject(HttpXsrfTokenExtractor);
    const token = extractor.getToken();
    expect(first.status).toBe(204);
    expect(first.body).toBeNull();
    expect(first.headers.get('Cache-Control')).toBe('no-store');
    expect(token).toBeTruthy();
    await mock.get('/bff/auth/csrf');
    expect(extractor.getToken()).toBe(token);
    expect(mock.bff.sessionUser()).toBeNull();
    mock.backend.verify();
  });

  it('rejects missing and invalid tokens before invoking an auth handler', async () => {
    const mock = setUpMockBff();
    const handler = vi.spyOn(mock.bff, 'handle');
    const badHeader = firstValueFrom(
      mock.http.post('/bff/auth/logout', null, {
        headers: { 'X-XSRF-TOKEN': 'invalid-test-token' },
      }),
    );
    await expect(badHeader).rejects.toMatchObject({
      status: 403,
      error: { code: 'AUTH_CSRF_INVALID' },
    });
    document.cookie = 'XSRF-TOKEN=; Path=/; Max-Age=0';
    await expect(firstValueFrom(mock.http.post('/bff/auth/logout', null))).rejects.toMatchObject({
      status: 403,
      error: { code: 'AUTH_CSRF_INVALID' },
    });
    expect(handler).not.toHaveBeenCalled();
    mock.backend.verify();
  });

  it('rotates after login and change-password, expires on logout and prepares a later write', async () => {
    const mock = setUpMockBff();
    const extractor = TestBed.inject(HttpXsrfTokenExtractor);
    const before = extractor.getToken();
    await mock.signIn('admin');
    const login = extractor.getToken();
    expect(login).toBeTruthy();
    expect(login).not.toBe(before);
    // The session starts with a normal password; this operation preserves the session and rotates XSRF.
    await mock.send('POST', '/bff/auth/change-password', {
      currentPassword: DEMO_CLAVE,
      newPassword: 'new-password-1',
    });
    expect(extractor.getToken()).not.toBe(login);
    await mock.send('POST', '/bff/auth/logout', null);
    expect(extractor.getToken()).toBeNull();
    await mock.signIn('admin');
    expect(extractor.getToken()).toBeTruthy();
    mock.backend.verify();
  });
});
