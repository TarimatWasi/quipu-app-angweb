import { beforeEach, afterEach } from 'vitest';

// Existing unit tests exercise clients after application startup. A non-secret cookie models that
// prepared state; cold bootstrap and absent-cookie behavior are covered in the dedicated CSRF tests.
beforeEach(() => {
  document.cookie = 'XSRF-TOKEN=unit-test-xsrf; Path=/; SameSite=Lax';
});
afterEach(() => {
  document.cookie = 'XSRF-TOKEN=; Path=/; Max-Age=0';
});
