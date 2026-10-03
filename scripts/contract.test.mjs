import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  compareTypes,
  downloadSpec,
  readConfig,
  renderTypes,
  sha256Of,
  specUrl,
  verifySpec,
} from './contract.mjs';

const SPEC = `openapi: 3.0.3
info: { title: T, version: "1" }
paths:
  /ping:
    get:
      responses:
        "200":
          description: ok
          content:
            application/json:
              schema:
                type: object
                required: [pong]
                properties:
                  pong: { type: boolean }
`;
const sha = (text) => createHash('sha256').update(text).digest('hex');
const BYTES = Buffer.from(SPEC);
const CONFIG = { repository: 'Org/repo', version: 'v1.2.3' };
const RAW = 'https://raw.githubusercontent.com/Org/repo/v1.2.3/openapi/bff.yaml';
const ok = (body = BYTES, url = RAW) => ({
  ok: true,
  status: 200,
  url,
  arrayBuffer: () =>
    Promise.resolve(body.buffer.slice(body.byteOffset, body.byteOffset + body.length)),
});
const status = (code) => ({ ok: false, status: code, url: RAW });

test('the spec is downloaded from the pinned tag of the shared contracts repository', () => {
  assert.equal(
    specUrl({ repository: 'Org/repo', version: 'v1.2.3' }),
    'https://raw.githubusercontent.com/Org/repo/v1.2.3/openapi/bff.yaml',
  );
});

test('a downloaded spec with another hash than the pinned one is rejected', () => {
  assert.doesNotThrow(() => verifySpec(BYTES, sha(SPEC), 'v1.2.3'));
  assert.throws(() => verifySpec(`${SPEC}\n# changed`, sha(SPEC), 'v1.2.3'), /v1\.2\.3.*hash/s);
});

test('the generated types carry the contract version and keep required fields required', async () => {
  const types = await renderTypes(BYTES, 'v1.2.3');
  assert.match(types, /v1\.2\.3/);
  assert.match(types, /pong: boolean;/);
  assert.doesNotMatch(types, /pong\?:/);
});

test('generating the same spec twice gives the same text', async () => {
  assert.equal(await renderTypes(BYTES, 'v1'), await renderTypes(BYTES, 'v1'));
});

test('the versioned types must equal the regenerated ones', () => {
  assert.deepEqual(compareTypes('a', 'a'), { ok: true });
  const result = compareTypes('a', 'b');
  assert.equal(result.ok, false);
  assert.match(result.reason, /npm run contract:sync/);
});

test('contract.json pins a tag and the hash of its spec', () => {
  const config = readConfig();
  assert.match(config.version, /^v\d+\.\d+\.\d+$/);
  assert.match(config.sha256, /^[0-9a-f]{64}$/);
  assert.equal(config.repository, 'TarimatWasi/quipu-lib-contracts');
});

test('the committed types name the pinned version and the hash of its spec (offline guard)', () => {
  const config = readConfig();
  const committed = readFileSync(
    new URL('../src/app/core/api/bff.generated.d.ts', import.meta.url),
    'utf8',
  );
  const header = committed.slice(0, committed.indexOf('*/'));
  assert.ok(header.includes(`contract ${config.version}`), 'run npm run contract:sync');
  assert.ok(header.includes(`sha256 ${config.sha256}`), 'run npm run contract:sync');
});

test('the hash is taken over the bytes as served, like sha256sum', () => {
  const withBom = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), BYTES]);
  assert.notEqual(sha256Of(withBom), sha256Of(BYTES));
  assert.equal(sha256Of(BYTES), sha(SPEC));
});

test('invalid UTF-8 in the spec is rejected, never silently replaced', async () => {
  await assert.rejects(() => renderTypes(Buffer.from([0xff, 0xfe, 0xfd]), 'v1'));
});

test('a 404 is final: the tag does not exist, retrying cannot help', async () => {
  let calls = 0;
  const fetchImpl = () => {
    calls++;
    return Promise.resolve(status(404));
  };
  await assert.rejects(() => downloadSpec(CONFIG, { fetchImpl, backoffMs: 0 }), /HTTP 404/);
  assert.equal(calls, 1);
});

test('a 5xx or a network error is retried and the download then succeeds', async () => {
  const answers = [
    () => Promise.resolve(status(503)),
    () => Promise.reject(new Error('fetch failed')),
    () => Promise.resolve(ok()),
  ];
  let calls = 0;
  const fetchImpl = () => answers[calls++]();
  const bytes = await downloadSpec(CONFIG, { fetchImpl, backoffMs: 0 });
  assert.equal(calls, 3);
  assert.equal(sha256Of(bytes), sha(SPEC));
});

test('it gives up after three attempts and reports the last failure', async () => {
  let calls = 0;
  const fetchImpl = () => {
    calls++;
    return Promise.resolve(status(500));
  };
  await assert.rejects(() => downloadSpec(CONFIG, { fetchImpl, backoffMs: 0 }), /HTTP 500/);
  assert.equal(calls, 3);
});

test('a download that ends on another host is refused', async () => {
  const fetchImpl = () => Promise.resolve(ok(BYTES, 'https://evil.example/bff.yaml'));
  await assert.rejects(
    () => downloadSpec(CONFIG, { fetchImpl, backoffMs: 0 }),
    /Unexpected download location/,
  );
});
