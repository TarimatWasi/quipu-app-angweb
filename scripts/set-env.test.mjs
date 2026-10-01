import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { DEFAULT_BFF_BASE_URL, resolveBffBaseUrl, renderEnvironment } from './set-env.mjs';

test('falls back to the local default when the variable is unset outside Vercel', () => {
  assert.equal(resolveBffBaseUrl({}), DEFAULT_BFF_BASE_URL);
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

test('the committed environment file is the generated local default', () => {
  const committed = readFileSync(
    new URL('../src/environments/environment.ts', import.meta.url),
    'utf8',
  );
  assert.equal(committed, renderEnvironment(DEFAULT_BFF_BASE_URL));
});
