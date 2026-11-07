import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
const DEV_API = 'https://quipu-api-dev.onrender.com';

/** The proxy rules of the dev backend: the routes that send /bff to an external destination. */
const proxies = config.routes.filter((rule) => rule.dest?.startsWith('https://'));

/**
 * Emulates Vercel for a proxy route: first rule whose `src` matches the whole path, whose `has`
 * host conditions all match and none of whose `missing` host conditions match. The host patterns
 * are used AS WRITTEN in vercel.json (the anchors live in the JSON, not in this test).
 */
function ruleFor(host, path) {
  for (const rule of proxies) {
    const match = new RegExp(`^${rule.src}$`).exec(path);
    if (!match) continue;
    const hostOk = (rule.has ?? []).every(
      (c) => c.type === 'host' && new RegExp(c.value).test(host),
    );
    const excluded = (rule.missing ?? []).some(
      (c) => c.type === 'host' && new RegExp(c.value).test(host),
    );
    if (hostOk && !excluded) return { rule, dest: rule.dest.replace('$1', match[1] ?? '') };
  }
  return undefined;
}

function route(host, path) {
  return ruleFor(host, path)?.dest;
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
  for (const rule of proxies) {
    for (const c of [...rule.has, ...(rule.missing ?? [])]) {
      assert.ok(c.value.startsWith('^') && c.value.endsWith('$'), `anchors: ${c.value}`);
      assert.ok(!c.value.includes('.*'), `no wildcard: ${c.value}`);
      assert.ok(!c.value.replaceAll('[.]', '').includes('.'), `literal dots: ${c.value}`);
      assert.ok(!c.value.includes('('), `no capture groups: ${c.value}`);
    }
  }
});

test('every destination is https and every rule is host-conditional', () => {
  for (const rule of proxies) {
    assert.ok(rule.dest.startsWith('https://'), rule.dest);
    assert.ok(rule.has?.length, rule.src);
  }
});

test('no rule depends on the team slug or on a project name that was renamed', () => {
  const patterns = proxies.flatMap((r) => [...r.has, ...(r.missing ?? [])]).map((c) => c.value);
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

// TAR-144, TAR-9: the backend only takes /bff/** with the secret of the edge, and then takes the IP
// of the browser from X-Vercel-Forwarded-For. `set` replaces whatever the visitor sent. The value
// comes from the EDGE_SHARED_SECRET variable of Vercel, never from the repository.
const SECRET_HEADER = 'x-quipu-edge-secret';
const secretTransforms = (rule) =>
  (rule.transforms ?? []).filter(
    (t) => t.type === 'request.headers' && t.target?.key?.toLowerCase() === SECRET_HEADER,
  );

test('both /bff rules set the secret of the edge from EDGE_SHARED_SECRET and replace the visitor value', () => {
  assert.equal(proxies.length, 2);
  for (const rule of proxies) {
    const [transform, ...others] = secretTransforms(rule);
    assert.equal(others.length, 0, 'one transform per rule');
    assert.equal(transform?.op, 'set', 'set replaces what the visitor sends');
    assert.equal(transform?.args, '$EDGE_SHARED_SECRET');
    assert.deepEqual(transform?.env, ['EDGE_SHARED_SECRET']);
  }
});

test('the secret never travels in the repository: no literal value anywhere in vercel.json', () => {
  const text = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
  assert.equal(text.match(/EDGE_SHARED_SECRET/g)?.length, 4, 'only the name of the variable');
  for (const rule of proxies) {
    for (const transform of secretTransforms(rule)) {
      assert.match(String(transform.args), /^\$[A-Z_]+$/, 'args is a variable reference');
    }
  }
});

test('no other route carries the secret: not the headers, not the static files, not the fallback', () => {
  for (const rule of config.routes) {
    if (proxies.includes(rule)) continue;
    assert.equal(secretTransforms(rule).length, 0, JSON.stringify(rule));
    const headers = Object.keys(rule.headers ?? {}).map((key) => key.toLowerCase());
    assert.ok(!headers.includes(SECRET_HEADER), 'a response header is not the secret');
  }
});

test('the hosts that reach the dev backend send the secret and the others do not reach it', () => {
  for (const host of DEV_HOSTS) {
    assert.equal(secretTransforms(ruleFor(host, '/bff/auth/login').rule).length, 1, host);
  }
  for (const host of [
    'quipu.tarimatwasi.com',
    'quipu-git-main-tarimatwasi.vercel.app',
    'evil.example',
  ]) {
    assert.equal(ruleFor(host, '/bff/auth/login'), undefined, host);
  }
});

// `routes` is the low-level form: it cannot live with `rewrites` or `headers`, so the security
// headers, the proxy and the fallback of the Angular preset are all routes, in this order.
test('the routes keep the order: security headers, proxies, static files and the fallback', () => {
  assert.equal(config.rewrites, undefined, 'routes cannot be mixed with rewrites');
  assert.equal(config.headers, undefined, 'routes cannot be mixed with headers');
  const [headers, ...rest] = config.routes;
  assert.equal(headers.src, '/(.*)');
  assert.equal(headers.continue, true, 'the headers go on to the next route');
  assert.ok(headers.dest === undefined, 'the headers route sends nowhere');
  const filesystem = rest.findIndex((rule) => rule.handle === 'filesystem');
  assert.ok(filesystem > 0, 'static files are served before the fallback');
  assert.ok(
    rest.slice(0, filesystem).every((rule) => proxies.includes(rule)),
    'proxies first',
  );
  assert.deepEqual(rest.slice(filesystem + 1), [{ src: '/(.*)', dest: '/index.html' }]);
});
