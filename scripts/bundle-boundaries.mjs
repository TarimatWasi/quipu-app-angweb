import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STATS = new URL('../dist/quipu-app-angweb/browser-stats.json', import.meta.url);
const MAIN = 'src/main.ts';
const STYLES = 'angular:styles/global:styles';
const SHELL = 'src/app/layout/app-shell/app-shell.component.ts';
const LOGIN = 'src/app/features/auth/pages/login.component.ts';
const ROUTES = ['auth', 'guests', 'payments', 'my-account', 'administrators'].map(
  (feature) => `src/app/features/${feature}/${feature}.routes.ts`,
);
ROUTES.push('src/app/home.routes.ts');
const INITIAL_LIMIT = 500_000;

/** Follow emitted static imports only; dynamic imports are the actual lazy boundaries. */
export function staticClosure(outputs, entryPoints) {
  const files = new Set();
  const visit = (file) => {
    if (files.has(file)) return;
    const output = outputs[file];
    if (!output) throw new Error(`Missing emitted output: ${file}`);
    files.add(file);
    for (const imported of output.imports ?? []) {
      if (imported.kind !== 'dynamic-import' && !imported.external) visit(imported.path);
    }
  };
  for (const entryPoint of entryPoints) {
    const entries = Object.entries(outputs).filter(
      ([, output]) => output.entryPoint === entryPoint,
    );
    if (entries.length === 0) throw new Error(`Missing build entry point: ${entryPoint}`);
    for (const [file] of entries) visit(file);
  }
  const inputs = new Set();
  let bytes = 0;
  for (const file of files) {
    bytes += outputs[file].bytes;
    for (const [input, contribution] of Object.entries(outputs[file].inputs ?? {})) {
      if (contribution.bytesInOutput > 0) inputs.add(input.replaceAll('\\', '/'));
    }
  }
  return { bytes, inputs };
}

const isPage = (input) => input.startsWith('src/app/features/') && input.includes('/pages/');
const isDialog = (input) => input.endsWith('-dialog.component.ts');
const isOverlay = (input) => /node_modules\/@angular\/(material|cdk)\//.test(input);

/** Protect bootstrap, login and route metadata against accidental eager imports. */
export function bundleBoundaryProblems(stats) {
  const problems = [];
  const initial = staticClosure(stats.outputs, [MAIN, STYLES]);
  if (initial.bytes > INITIAL_LIMIT) {
    problems.push(`Initial JS/CSS is ${initial.bytes} bytes; limit is ${INITIAL_LIMIT}`);
  }
  for (const input of initial.inputs) {
    if (input === SHELL || isPage(input) || isDialog(input) || isOverlay(input)) {
      problems.push(`Bootstrap eagerly includes ${input}`);
    }
  }
  const routeEntries = new Set([
    ...ROUTES,
    ...Object.values(stats.outputs)
      .map((output) => output.entryPoint)
      .filter((entry) => entry?.endsWith('.routes.ts')),
  ]);
  for (const route of routeEntries) {
    for (const input of staticClosure(stats.outputs, [route]).inputs) {
      if (isPage(input) || isDialog(input)) problems.push(`${route} eagerly includes ${input}`);
    }
  }
  for (const input of staticClosure(stats.outputs, [MAIN, STYLES, ROUTES[0], LOGIN]).inputs) {
    if (
      input === SHELL ||
      isDialog(input) ||
      isOverlay(input) ||
      (isPage(input) && input !== LOGIN)
    ) {
      problems.push(`Login eagerly includes ${input}`);
    }
  }
  return { problems, initialBytes: initial.bytes };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = bundleBoundaryProblems(JSON.parse(readFileSync(STATS, 'utf8')));
    if (result.problems.length > 0) throw new Error(result.problems.join('\n'));
    process.stdout.write(
      `Bundle boundaries preserved; initial JS/CSS ${result.initialBytes} bytes\n`,
    );
  } catch (error) {
    process.stderr.write(`Bundle boundaries: ${error.message}\n`);
    process.exitCode = 1;
  }
}
