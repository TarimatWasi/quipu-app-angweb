import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const DEV_API = 'https://quipu-api-dev.onrender.com';

/**
 * Emulates Vercel for a rewrite: first rule whose source matches and whose host conditions match.
 * `/bff/:path*` follows path-to-regexp: it matches /bff, /bff/ and /bff/a/b. The host patterns are
 * used AS WRITTEN in vercel.json (the anchors live in the JSON, not in this test).
 */
function route(host, path) {
  for (const rule of config.rewrites) {
    const source = new RegExp(`^${rule.source.replace('/:path*', '(?:/(.*))?')}$`);
    const match = source.exec(path);
    if (!match) continue;
    const hostOk = (rule.has ?? []).every(
      (c) => c.type === 'host' && new RegExp(c.value).test(host),
    );
    if (hostOk) return rule.destination.replace(':path*', match[1] ?? '');
  }
  return undefined;
}

// Aliases of the Vercel project (from `vercel alias ls`), all of them must proxy to the dev backend.
const PROJECT_HOSTS = [
  'quipu-app-angweb-dev.vercel.app', // production alias
  'quipu-app-angweb-dev-shizukajikus-projects.vercel.app', // production alias of the team
  'quipu-app-angweb-dev-git-development-shizukajikus-projects.vercel.app', // branch alias
  'quipu-app-angweb-dev-git-feat-tar-f355f8-shizukajikus-projects.vercel.app', // branch alias
  'quipu-app-angweb-43xhw1j83-shizukajikus-projects.vercel.app', // per-deployment host
];

test('every alias of the project proxies /bff/* to the dev backend', () => {
  for (const host of PROJECT_HOSTS) {
    assert.equal(route(host, '/bff/auth/login'), `${DEV_API}/bff/auth/login`, host);
  }
});

test('/bff and /bff/ without a path are proxied too (path-to-regexp :path*)', () => {
  for (const path of ['/bff', '/bff/']) {
    assert.ok(route('quipu-app-angweb-dev.vercel.app', path)?.startsWith(`${DEV_API}/bff`), path);
  }
});

test('host spoofing and lookalikes do not match (the anchors are in vercel.json)', () => {
  for (const host of [
    'quipu-app-angweb-dev.vercel.app.evil.com',
    'evilquipu-app-angweb-dev.vercel.app',
    'evil.quipu-app-angweb-dev.vercel.app',
    'quipu-app-angweb-devXvercelYapp',
    'quipu-app-angweb-dev-shizukajikus-projects.vercel.app.evil.com',
    'quipu-app-angweb-dev-git-x-shizukajikus-projectsXvercel.app',
    'quipu-app-angweb-dev-git--shizukajikus-projects.vercel.app.evil.com',
    'quipu-app-angweb-43xhw1j83-shizukajikus-projects.vercel.app.evil.com',
    'quipu-app-angweb-a.b-shizukajikus-projects.vercel.app',
    'other-team-quipu-app-angweb-43xhw1j83-shizukajikus-projects.vercel.app',
    'quipu-app-angweb-43xhw1j83-otherteam-projects.vercel.app',
  ]) {
    assert.equal(route(host, '/bff/auth/login'), undefined, host);
  }
});

test('an unknown host has no /bff rewrite: it fails closed instead of reaching the dev backend', () => {
  // On such a host the Angular preset falls back to index.html, so POST /bff/* answers HTML.
  for (const host of ['quipu-app-angweb.vercel.app', 'evil.example', 'localhost']) {
    assert.equal(route(host, '/bff/auth/login'), undefined, host);
  }
});

test('only /bff/* is rewritten: Angular routes and assets are untouched', () => {
  for (const path of ['/login', '/home', '/main-ABC.js', '/bffx/auth', '/x/bff/auth']) {
    assert.equal(route('quipu-app-angweb-dev.vercel.app', path), undefined, path);
  }
});

test('every host pattern is anchored, uses literal dots and has no capture groups', () => {
  for (const rule of config.rewrites) {
    for (const c of rule.has) {
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
