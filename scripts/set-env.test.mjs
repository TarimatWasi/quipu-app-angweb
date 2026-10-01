import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_BFF_BASE_URL,
  describeBffMode,
  resolveBffBaseUrl,
  renderEnvironment,
} from './set-env.mjs';

test('same-origin is the default: the BFF base URL is empty when the variable is unset', () => {
  assert.equal(DEFAULT_BFF_BASE_URL, '');
  assert.equal(resolveBffBaseUrl({}), '');
});

test('the build on Vercel no longer needs the variable (Vercel rewrites /bff to the backend)', () => {
  assert.equal(resolveBffBaseUrl({ VERCEL: '1' }), '');
});

test('a lone slash or blank value also means same-origin', () => {
  for (const raw of ['/', '  ', ' / ']) {
    assert.equal(resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: raw }), '', JSON.stringify(raw));
  }
});

test('other relative values are rejected: only same-origin or an absolute https URL', () => {
  for (const raw of ['/api', '//evil.example', './x']) {
    assert.throws(
      () => resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: raw }),
      /is not an absolute URL/,
      raw,
    );
  }
});

test('an absolute https URL is still accepted for a cross-origin BFF', () => {
  assert.equal(
    resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: 'https://api.example.org' }),
    'https://api.example.org',
  );
});

test('requires https', () => {
  assert.throws(
    () => resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: 'http://api.example.org' }),
    /https/,
  );
});

test('rejects values that are not absolute URLs', () => {
  assert.throws(
    () => resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: 'api.example.org' }),
    /is not an absolute URL/,
  );
});

test('strips a trailing slash', () => {
  assert.equal(
    resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: 'https://api.example.org/' }),
    'https://api.example.org',
  );
});

test('renders an empty base URL for same-origin', () => {
  assert.ok(renderEnvironment('').includes('bffBaseUrl: ""'));
});

test('renders the environment file', () => {
  assert.ok(
    renderEnvironment('https://api.example.org').includes('bffBaseUrl: "https://api.example.org"'),
  );
});

test('the committed environment file is the generated same-origin default', () => {
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

test('rejects credentials, query strings and fragments, each with its own message', () => {
  const cases = [
    ['https://u:p@a.example', /credentials/],
    ['https://u@a.example', /credentials/],
    ['https://a.example/?x=1', /query/],
    ['https://a.example/?', /query/],
    ['https://a.example/#f', /fragment/],
    ['https://a.example/#', /fragment/],
  ];
  for (const [raw, message] of cases) {
    assert.throws(() => resolveBffBaseUrl({ NG_APP_BFF_BASE_URL: raw }), message, raw);
  }
});

test('the build log states the mode: same-origin by default', () => {
  assert.match(describeBffMode('', {}), /same-origin/);
  assert.match(describeBffMode('', { VERCEL: '1' }), /same-origin/);
});

test('the build log states an absolute URL and warns about it on Vercel (stale variable)', () => {
  const local = describeBffMode('https://api.example.org', {});
  assert.ok(local.includes('absolute'));
  const shown = local.split(' ').find((word) => word.startsWith('https:'));
  assert.equal(new URL(shown).hostname, 'api.example.org');
  assert.ok(!local.includes('WARNING'));
  const onVercel = describeBffMode('https://api.example.org', { VERCEL: '1' });
  assert.ok(onVercel.includes('WARNING'));
  assert.ok(onVercel.includes('NG_APP_BFF_BASE_URL'));
});
