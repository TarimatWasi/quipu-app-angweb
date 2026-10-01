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
  assert.ok(
    renderEnvironment('https://api.example.org').includes('bffBaseUrl: "https://api.example.org"'),
  );
});

test('the committed environment file is the generated local default', () => {
  const committed = readFileSync(
    new URL('../src/environments/environment.ts', import.meta.url),
    'utf8',
  );
  assert.equal(committed, renderEnvironment(DEFAULT_BFF_BASE_URL));
});

async function evaluate(source) {
  // The generated file is plain ES module syntax, so a data URL can load it.
  const url = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return (await import(url)).environment;
}

test('the rendered file keeps any value as a single string literal', async () => {
  const hostile = 'https://a.example/it\'s";process.exit(1);//';
  assert.equal((await evaluate(renderEnvironment(hostile))).bffBaseUrl, hostile);
  const multiline = ['https://a.example/a', 'b\\c'].join('\n');
  assert.equal((await evaluate(renderEnvironment(multiline))).bffBaseUrl, multiline);
});

test('a quote or newline in the variable cannot break out of the generated file', async () => {
  for (const raw of [
    "https://a.example/it's",
    'https://a.example/x\ny',
    "https://a.example/';boom();//",
  ]) {
    const value = resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: raw });
    assert.equal((await evaluate(renderEnvironment(value))).bffBaseUrl, value);
    assert.ok(!value.includes('\n'));
  }
});

test('rejects credentials, query strings and fragments in the base URL', () => {
  for (const raw of ['https://u:p@a.example', 'https://a.example/?x=1', 'https://a.example/#f']) {
    assert.throws(() => resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: raw }), /base URL/);
  }
});
