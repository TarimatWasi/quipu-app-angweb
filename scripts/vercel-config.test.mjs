import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const DEV_API = 'https://quipu-api-dev.onrender.com';

/**
 * Emulates Vercel for a rewrite: first rule whose source matches, whose `has` host conditions all match
 * and none of whose `missing` host conditions match. `/bff/:path*` follows path-to-regexp: it matches
 * /bff, /bff/ and /bff/a/b. The host patterns are used AS WRITTEN in vercel.json (the anchors live in
 * the JSON, not in this test).
 */
function route(host, path) {
  for (const rule of config.rewrites) {
    const source = new RegExp(`^${rule.source.replace('/:path*', '(?:/(.*))?')}$`);
    const match = source.exec(path);
    if (!match) continue;
    const hostOk = (rule.has ?? []).every(
      (c) => c.type === 'host' && new RegExp(c.value).test(host),
    );
    const excluded = (rule.missing ?? []).some(
      (c) => c.type === 'host' && new RegExp(c.value).test(host),
    );
    if (hostOk && !excluded) return rule.destination.replace(':path*', match[1] ?? '');
  }
  return undefined;
}

// TAR-303: the rules do not depend on the team slug or on the project name (both were renamed on
// 2026-11-06). Only the dev custom domain and the branch aliases of previews reach the dev backend.
const DEV_HOSTS = [
  'quipu-dev.tarimatwasi.com', // custom domain of the dev environment (TAR-128)
  'quipu-git-development-tarimatwasi.vercel.app', // branch alias of development
  'quipu-git-feat-tar-303-rewrites-tarimatwasi.vercel.app', // branch alias of a PR preview
  'quipu-git-development-shizukajikus-projects.vercel.app', // same alias under the previous team slug
];

test('the dev domain and the branch aliases of previews proxy /bff/* to the dev backend', () => {
  for (const host of DEV_HOSTS) {
    assert.equal(route(host, '/bff/auth/login'), `${DEV_API}/bff/auth/login`, host);
  }
});

test('/bff and /bff/ without a path are proxied too (path-to-regexp :path*)', () => {
  for (const path of ['/bff', '/bff/']) {
    assert.ok(route('quipu-dev.tarimatwasi.com', path)?.startsWith(`${DEV_API}/bff`), path);
  }
});

test('production hosts never reach the dev backend: the main branch alias and the deployment host', () => {
  // main is promoted with the same vercel.json, so what is not excluded here would reach dev.
  // A deployment host (quipu-<hash>-<team>.vercel.app) cannot be told apart from the production
  // deployment, so there is no rule for it.
  for (const host of [
    'quipu.tarimatwasi.com',
    'quipu-tarimatwasi.vercel.app',
    'quipu-git-main-tarimatwasi.vercel.app',
    'quipu-git-main-hotfix-tarimatwasi.vercel.app',
    'quipu-4jd66uit1-tarimatwasi.vercel.app',
    'quipu-3xz2refr0-shizukajikus-projects.vercel.app',
  ]) {
    assert.equal(route(host, '/bff/auth/login'), undefined, host);
  }
});

test('host spoofing and lookalikes do not match (the anchors are in vercel.json)', () => {
  for (const host of [
    'quipu-dev.tarimatwasi.com.evil.com',
    'evilquipu-dev.tarimatwasi.com',
    'evil.quipu-dev.tarimatwasi.com',
    'quipu-dev-tarimatwasi-com',
    'quipu-git-x-tarimatwasi.vercel.app.evil.com',
    'evilquipu-git-x-tarimatwasi.vercel.app',
    'evil.quipu-git-x-tarimatwasi.vercel.app',
    'quipu-git-x-tarimatwasiXvercelYapp',
    'quipu-git-x-tarimatwasi.vercel.app.main.evil.com',
    'quipu-git--tarimatwasi.vercel.app.evil.com',
    'quipu-git-a.b-tarimatwasi.vercel.app',
  ]) {
    assert.equal(route(host, '/bff/auth/login'), undefined, host);
  }
});

test('an unknown host has no /bff rewrite: it fails closed instead of reaching the dev backend', () => {
  // On such a host the Angular preset falls back to index.html, so POST /bff/* answers HTML.
  // quipu.tarimatwasi.com (production) has no rewrite until its own backend exists (TAR-28)
  for (const host of [
    'quipu-app-angweb-dev.vercel.app',
    'quipu-app-angweb-dev-shizukajikus-projects.vercel.app',
    'evil.example',
    'localhost',
  ]) {
    assert.equal(route(host, '/bff/auth/login'), undefined, host);
  }
});

test('only /bff/* is rewritten: Angular routes and assets are untouched', () => {
  for (const path of ['/login', '/home', '/main-ABC.js', '/bffx/auth', '/x/bff/auth']) {
    assert.equal(route('quipu-dev.tarimatwasi.com', path), undefined, path);
  }
});

test('every host pattern is anchored, uses literal dots and has no capture groups', () => {
  for (const rule of config.rewrites) {
    for (const c of [...rule.has, ...(rule.missing ?? [])]) {
      assert.ok(c.value.startsWith('^') && c.value.endsWith('$'), `anchors: ${c.value}`);
      assert.ok(!c.value.includes('.*'), `no wildcard: ${c.value}`);
      assert.ok(!c.value.replaceAll('[.]', '').includes('.'), `literal dots: ${c.value}`);
      assert.ok(!c.value.includes('('), `no capture groups: ${c.value}`);
    }
  }
});

test('every destination is https and every rule is host-conditional', () => {
  for (const rule of config.rewrites) {
    assert.ok(rule.destination.startsWith('https://'), rule.destination);
    assert.ok(rule.has?.length, rule.source);
  }
});

test('no rule depends on the team slug or on a project name that was renamed', () => {
  const patterns = config.rewrites
    .flatMap((r) => [...r.has, ...(r.missing ?? [])])
    .map((c) => c.value);
  for (const pattern of patterns) {
    assert.ok(!/shizukajikus|tarimatwasi-projects|angweb/.test(pattern), pattern);
  }
});

// TAR-301: development se despliega con la integración de Git de Vercel (preview ligado a
// quipu-dev.tarimatwasi.com); solo se apaga la rama aislada de revisión de CSRF.
test('the Vercel Git integration deploys development and only the isolated CSRF review branch is disabled', () => {
  const enabled = config.git?.deploymentEnabled;
  assert.ok(enabled && typeof enabled === 'object', 'git.deploymentEnabled must be an object');
  assert.notEqual(enabled.development, false);
  // TAR-300: no preview deploy while backend/contract enforcement is being reviewed in parallel.
  assert.deepEqual(Object.keys(enabled), ['feat/TAR-300-csrf']);
  assert.equal(enabled['feat/TAR-300-csrf'], false);
});
