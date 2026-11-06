import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MARKER_SOURCE, bundleProblems, filesWithMarker, readMarker } from './mock-bundle.mjs';

const MARKER = 'quipu-mock-bff-test01';

function withBuilds(files, run) {
  const root = mkdtempSync(join(tmpdir(), 'mock-bundle-'));
  try {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(join(root, path, '..'), { recursive: true });
      writeFileSync(join(root, path), text);
    }
    return run({ productionDir: join(root, 'prod'), mockDir: join(root, 'mock') });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('the marker is read from the real mock source', () => {
  const marker = readMarker(readFileSync(MARKER_SOURCE, 'utf8'));
  assert.match(marker, /^quipu-mock-bff-\w+$/);
});

test('readMarker fails when the source no longer exports the marker', () => {
  assert.throws(() => readMarker("export const OTHER = 'x';"), /MOCK_BUNDLE_MARKER not found/);
});

test('a clean production build and a mock build with the marker pass', () => {
  const problems = withBuilds(
    {
      'prod/main-A1.js': 'console.log("app")',
      'mock/main.js': 'console.log("app")',
      'mock/chunk-X.js': `const h = "${MARKER}";`,
    },
    (dirs) => bundleProblems(dirs, MARKER),
  );
  assert.deepEqual(problems, []);
});

test('a production chunk with the marker fails and names the file', () => {
  const problems = withBuilds(
    {
      'prod/main-A1.js': 'ok',
      'prod/nested/chunk-B2.mjs': `x="${MARKER}"`,
      'mock/main.js': MARKER,
    },
    (dirs) => bundleProblems(dirs, MARKER),
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0], /production bundle carries the mock: .*chunk-B2\.mjs$/);
});

test('a mock build without the marker fails: the check would prove nothing', () => {
  const problems = withBuilds({ 'prod/main.js': 'ok', 'mock/main.js': 'ok' }, (dirs) =>
    bundleProblems(dirs, MARKER),
  );
  assert.deepEqual(problems.length, 1);
  assert.match(problems[0], /mock build does not carry its marker/);
});

test('missing builds are problems, never a silent pass', () => {
  const problems = withBuilds({}, (dirs) => bundleProblems(dirs, MARKER));
  assert.equal(problems.length, 2);
  assert.match(problems[0], /missing production build/);
  assert.match(problems[1], /missing mock build/);
});

test('only JavaScript files are inspected (source maps and HTML do not count)', () => {
  const files = withBuilds(
    { 'prod/main.js.map': MARKER, 'prod/index.html': MARKER, 'prod/main.js': 'ok' },
    ({ productionDir }) => filesWithMarker(productionDir, MARKER),
  );
  assert.deepEqual(files, []);
});

// angular.json: only the `mock` configuration starts from the entry point with the simulated BFF.
const angular = JSON.parse(readFileSync(new URL('../angular.json', import.meta.url), 'utf8'));
const architect = angular.projects['quipu-app-angweb'].architect;

test('only the mock build starts from src/main.mock.ts', () => {
  const build = architect.build;
  assert.equal(build.options.browser, 'src/main.ts');
  assert.equal(build.defaultConfiguration, 'production');
  const entries = Object.entries(build.configurations).map(([name, config]) => [
    name,
    config.browser ?? build.options.browser,
  ]);
  assert.deepEqual(
    entries.filter(([, entry]) => entry !== 'src/main.ts').map(([name]) => name),
    ['mock'],
  );
  assert.equal(build.configurations.mock.browser, 'src/main.mock.ts');
  assert.notEqual(build.configurations.mock.outputPath, undefined);
});

test('src/main.ts never reaches the simulated backend', () => {
  const main = readFileSync(new URL('../src/main.ts', import.meta.url), 'utf8');
  const config = readFileSync(new URL('../src/app/app.config.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /mock/i);
  assert.doesNotMatch(config, /mock/i);
});

test('ng serve: local is the default, dev proxies elsewhere, mock has no proxy', () => {
  const serve = architect.serve;
  assert.equal(serve.defaultConfiguration, 'local');
  assert.equal(serve.options?.proxyConfig, undefined);
  assert.equal(serve.configurations.local.proxyConfig, 'proxy.conf.json');
  assert.equal(serve.configurations.dev.proxyConfig, 'proxy.dev.conf.json');
  assert.equal(serve.configurations.mock.proxyConfig, undefined);
  assert.equal(serve.configurations.mock.buildTarget, 'quipu-app-angweb:build:mock');
});

test('the dev proxy forwards /bff to the dev BFF over https', () => {
  const proxy = JSON.parse(
    readFileSync(new URL('../proxy.dev.conf.json', import.meta.url), 'utf8'),
  );
  assert.deepEqual(proxy['/bff'], {
    target: 'https://quipu-api-dev.onrender.com',
    secure: true,
    changeOrigin: true,
  });
});
