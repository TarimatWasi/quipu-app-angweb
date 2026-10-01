import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveBffBaseUrl, renderEnvironment } from './set-env.mjs';

test('keeps the default when the variable is unset outside Vercel', () => {
  assert.equal(resolveBffBaseUrl({}), undefined);
});

test('fails the build on Vercel when the variable is missing', () => {
  assert.throws(() => resolveBffBaseUrl({ VERCEL: '1' }), /NG_APP_BFF_BASE_URL/);
});

test('requires https', () => {
  assert.throws(
    () => resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: 'http://api.example.org' }),
    /https/,
  );
});

test('rejects values that are not absolute URLs', () => {
  assert.throws(() => resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: 'api.example.org' }), /URL/);
});

test('strips a trailing slash', () => {
  assert.equal(
    resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: 'https://api.example.org/' }),
    'https://api.example.org',
  );
});

test('renders the environment file', () => {
  assert.match(
    renderEnvironment('https://api.example.org'),
    /bffBaseUrl: 'https:\/\/api\.example\.org'/,
  );
});
