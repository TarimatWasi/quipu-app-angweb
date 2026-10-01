import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const DEV_API = 'https://quipu-api-dev.onrender.com';

/** First rewrite whose source matches the path and whose host condition matches (Vercel order). */
function route(host, path) {
  for (const rule of config.rewrites) {
    const source = new RegExp(`^${rule.source.replace(':path*', '(.*)')}$`);
    const match = source.exec(path);
    if (!match) continue;
    const conditions = rule.has ?? [];
    const hostOk = conditions.every(
      (c) => c.type === 'host' && new RegExp(`^${c.value}$`).test(host),
    );
    if (hostOk) return rule.destination.replace(':path*', match[1]);
  }
  return undefined;
}

test('the dev production host proxies /bff/* to the dev backend', () => {
  assert.equal(
    route('quipu-app-angweb-dev.vercel.app', '/bff/auth/login'),
    `${DEV_API}/bff/auth/login`,
  );
});

test('preview deployments of the project proxy to the dev backend', () => {
  for (const host of [
    'quipu-app-angweb-43xhw1j83-shizukajikus-projects.vercel.app',
    'quipu-app-angweb-dev-git-feat-tar-75-shizukajikus-projects.vercel.app',
  ]) {
    assert.equal(route(host, '/bff/auth/login'), `${DEV_API}/bff/auth/login`, host);
  }
});

test('an unknown host has no /bff rewrite: it fails closed instead of reaching the dev backend', () => {
  assert.equal(route('quipu-app-angweb.vercel.app', '/bff/auth/login'), undefined);
  assert.equal(route('evil.example', '/bff/auth/login'), undefined);
});

test('only /bff/* is rewritten: Angular routes and assets are untouched', () => {
  for (const path of ['/login', '/home', '/main-ABC.js', '/bffx/auth']) {
    assert.equal(route('quipu-app-angweb-dev.vercel.app', path), undefined, path);
  }
});

test('every destination is https and every rule is host-conditional', () => {
  for (const rule of config.rewrites) {
    assert.ok(rule.destination.startsWith('https://'), rule.destination);
    assert.ok(rule.has?.length, rule.source);
  }
});

test('dots in host patterns are literal: lookalike hosts do not match', () => {
  for (const host of [
    'quipu-app-angweb-devXvercelYapp',
    'quipu-app-angweb-dev.vercel.app.evil.example',
    'evil-quipu-app-angweb-dev.vercel.app',
    'quipu-app-angweb-43xhw1j83-shizukajikus-projectsXvercel.app',
  ]) {
    assert.equal(route(host, '/bff/auth/login'), undefined, host);
  }
});
