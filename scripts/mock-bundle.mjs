// Prueba de build of QP-ANGWEB-ENV-01: the simulated backend (src/app/core/mock) never reaches the
// production bundle. Run by `npm run verify` after `npm run build` and `npm run build:mock`: it
// fails if any production file carries the marker of the mock, and also if the mock build lacks it
// (then the marker no longer proves anything and the check would pass for the wrong reason).
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
export const MARKER_SOURCE = new URL('src/app/core/mock/mock-bff.ts', ROOT);
export const PRODUCTION_DIR = fileURLToPath(new URL('dist/quipu-app-angweb/browser', ROOT));
export const MOCK_DIR = fileURLToPath(new URL('dist/quipu-app-angweb-mock/browser', ROOT));

/** The marker exported by the mock (`MOCK_BUNDLE_MARKER = '...'`), read from its source. */
export function readMarker(source) {
  const match = /export const MOCK_BUNDLE_MARKER = '([^']{12,})';/.exec(source);
  if (!match) {
    throw new Error('MOCK_BUNDLE_MARKER not found in the mock source');
  }
  return match[1];
}

/** The JavaScript files under `dir` (recursively) whose text contains `marker`. */
export function filesWithMarker(dir, marker) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.m?js$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name))
    .filter((file) => readFileSync(file, 'utf8').includes(marker));
}

/** The problems of a pair of builds: empty when production is clean and the mock carries it. */
export function bundleProblems({ productionDir, mockDir }, marker) {
  const problems = [];
  if (!existsSync(productionDir)) {
    problems.push(`missing production build: ${productionDir} (run npm run build)`);
  } else {
    for (const file of filesWithMarker(productionDir, marker)) {
      problems.push(`the production bundle carries the mock: ${file}`);
    }
  }
  if (!existsSync(mockDir)) {
    problems.push(`missing mock build: ${mockDir} (run npm run build:mock)`);
  } else if (filesWithMarker(mockDir, marker).length === 0) {
    problems.push(`the mock build does not carry its marker: ${mockDir}`);
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const marker = readMarker(readFileSync(MARKER_SOURCE, 'utf8'));
  const problems = bundleProblems({ productionDir: PRODUCTION_DIR, mockDir: MOCK_DIR }, marker);
  if (problems.length > 0) {
    process.stderr.write(`QP-ANGWEB-ENV-01:\n${problems.join('\n')}\n`);
    process.exit(1);
  }
  process.stdout.write(
    'QP-ANGWEB-ENV-01: the production bundle carries no simulated backend; the mock build does\n',
  );
}
