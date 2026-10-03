// Types of the BFF API, generated from the shared contract (TAR-23, QP-ANGWEB-CTR-01).
// The OpenAPI spec lives in TarimatWasi/quipu-lib-contracts. contract.json pins one tag of it and
// the sha256 of its spec bytes; this script downloads exactly that tag, refuses a spec whose hash
// differs, and generates src/app/core/api/bff.generated.d.ts with openapi-typescript.
//   node scripts/contract.mjs sync          downloads the pinned tag and rewrites the types
//   node scripts/contract.mjs check         fails if the versioned types differ from the regenerated ones
//   node scripts/contract.mjs pin <tag>     moves to another contract version: downloads it, pins its
//                                           hash in contract.json and rewrites the types
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import openapiTS, { astToString } from 'openapi-typescript';

const CONFIG = new URL('../contract.json', import.meta.url);
const TARGET = new URL('../src/app/core/api/bff.generated.d.ts', import.meta.url);

const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const VERSION = /^v\d+\.\d+\.\d+$/;
const SHA256 = /^[0-9a-f]{64}$/;
const RAW_HOST = 'https://raw.githubusercontent.com/';
const ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 15_000;

export function readConfig() {
  const config = JSON.parse(readFileSync(CONFIG, 'utf8'));
  if (!REPOSITORY.test(config.repository ?? '')) {
    throw new Error('contract.json: "repository" must be owner/name');
  }
  if (!VERSION.test(config.version ?? '')) {
    throw new Error('contract.json: "version" must be a tag like v1.2.3');
  }
  if (!SHA256.test(config.sha256 ?? '')) {
    throw new Error('contract.json: "sha256" must be 64 lowercase hex digits');
  }
  return config;
}

export function specUrl({ repository, version }) {
  return `${RAW_HOST}${repository}/${version}/openapi/bff.yaml`;
}

export function sha256Of(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/** The hash is taken over the bytes as served, so it equals `sha256sum bff.yaml`. */
export function verifySpec(bytes, expectedSha256, version) {
  const actual = sha256Of(bytes);
  if (actual !== expectedSha256) {
    throw new Error(
      `The spec of contract ${version} has another hash than contract.json pins ` +
        `(expected ${expectedSha256}, got ${actual}). A tag must never change: do not trust it.`,
    );
  }
}

export async function renderTypes(specBytes, version) {
  const text = new TextDecoder('utf-8', { fatal: true }).decode(specBytes);
  const header =
    `/**\n * Generated from the BFF contract ${version} (TarimatWasi/quipu-lib-contracts), ` +
    `spec sha256 ${sha256Of(specBytes)}.\n` +
    ' * Do not edit by hand: run `npm run contract:sync`.\n */\n\n';
  return header + astToString(await openapiTS(text));
}

export function compareTypes(versioned, regenerated) {
  return versioned === regenerated
    ? { ok: true }
    : {
        ok: false,
        reason:
          'The versioned API types differ from the ones generated from the pinned contract: ' +
          'run npm run contract:sync and commit the result.',
      };
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A failure that retrying cannot fix (a 404, an unexpected host). */
class FinalError extends Error {}

/**
 * Downloads the spec as bytes. A network error, a timeout, a 429 or a 5xx is retried with backoff
 * (raw.githubusercontent.com blips must not fail CI); any other status is final.
 */
export async function downloadSpec(config, { fetchImpl = fetch, backoffMs = 1_000 } = {}) {
  const url = specUrl(config);
  let failure;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const response = await fetchImpl(url, { signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS) });
      if (response.ok) {
        if (!response.url.startsWith(RAW_HOST)) {
          throw new FinalError(`Unexpected download location: ${response.url}`);
        }
        return Buffer.from(await response.arrayBuffer());
      }
      failure = new Error(
        `Could not download the contract ${config.version}: HTTP ${response.status}`,
      );
      if (response.status !== 429 && response.status < 500) {
        throw new FinalError(failure.message);
      }
    } catch (error) {
      if (error instanceof FinalError) {
        throw error;
      }
      failure = error;
    }
    if (attempt < ATTEMPTS) {
      await wait(backoffMs * attempt);
    }
  }
  throw failure;
}

function writeTypes(text) {
  mkdirSync(new URL('./', TARGET), { recursive: true });
  writeFileSync(TARGET, text);
}

async function pin(version) {
  if (!VERSION.test(version ?? '')) {
    throw new Error('Usage: node scripts/contract.mjs pin vMAJOR.MINOR.PATCH');
  }
  const config = { ...readConfig(), version };
  const spec = await downloadSpec(config);
  config.sha256 = sha256Of(spec);
  const types = await renderTypes(spec, version);
  // Both files are written only after the spec downloaded and rendered: no half-applied state.
  writeFileSync(CONFIG, `${JSON.stringify(config, null, 2)}\n`);
  writeTypes(types);
  process.stdout.write(`Pinned contract ${version} (${config.sha256})\n`);
}

async function main(command, argument) {
  if (command === 'pin') {
    return pin(argument);
  }
  if (command !== 'sync' && command !== 'check') {
    throw new Error('Usage: node scripts/contract.mjs sync|check|pin <tag>');
  }
  const config = readConfig();
  const spec = await downloadSpec(config);
  verifySpec(spec, config.sha256, config.version);
  const generated = await renderTypes(spec, config.version);
  if (command === 'sync') {
    writeTypes(generated);
    process.stdout.write(`API types written for contract ${config.version}\n`);
    return undefined;
  }
  const result = compareTypes(readFileSync(TARGET, 'utf8'), generated);
  if (!result.ok) {
    throw new Error(result.reason);
  }
  process.stdout.write(`API types match contract ${config.version}\n`);
  return undefined;
}

// import.meta.main (Node 22.18+): unlike comparing argv[1] with the module path, it cannot make an
// integrity check silently do nothing when the paths differ (symlink, drive-letter case).
if (import.meta.main) {
  main(process.argv[2], process.argv[3]).catch((error) => {
    const cause = error.cause ? ` (${error.cause.message ?? error.cause})` : '';
    process.stderr.write(`${error.message}${cause}\n`);
    process.exit(1);
  });
}
