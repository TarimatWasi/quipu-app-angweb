// Proves that every restriction in eslint.config.js bites: each case is a violating sample that
// must fail with the rule ID in its message, plus controls that must stay clean. Type-aware rules
// are switched off here (they need real files); the rules under test do not use type information.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { MAX_FEATURE_DEPTH, createConfig, discoverFeatures } from '../eslint.config.js';

const config = createConfig(['f', 'g']);

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    ...config,
    tseslint.configs.disableTypeChecked,
    {
      files: ['**/*.ts'],
      languageOptions: { parserOptions: { projectService: false } },
      rules: { '@angular-eslint/no-uncalled-signals': 'off' }, // needs type information
    },
  ],
});

async function messagesFor(filePath, code) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.map((m) => `${m.ruleId}: ${m.message}`).join('\n');
}

const violations = [
  // FE-ANG-ORG-02: dependency direction between folders.
  ['src/app/shared/a.ts', "import { x } from '@core/x';\nexport const a = x;", 'FE-ANG-ORG-02'],
  [
    'src/app/shared/a.ts',
    "import { x } from '../../core/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/shared/a.ts',
    "import { x } from '@features/f/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  ['src/app/core/a.ts', "import { x } from '@features/f/x';\nexport const a = x;", 'FE-ANG-ORG-02'],
  ['src/app/core/a.ts', "import { x } from '@layout/x';\nexport const a = x;", 'FE-ANG-ORG-02'],
  [
    'src/app/features/f/pages/a.ts',
    "import { x } from '@features/g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/pages/a.ts',
    "import { x } from '../../g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/f.routes.ts',
    "import { x } from '../g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/pages/a.ts',
    "import { x } from '@layout/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  // Components keep the folder restrictions and add the HttpClient one (the rules must combine).
  [
    'src/app/shared/a.component.ts',
    "import { x } from '@core/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/core/a.component.ts',
    "import { x } from '@features/f/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/pages/a.component.ts',
    "import { x } from '@features/g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/f.component.ts',
    "import { x } from '../g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/shared/a.component.ts',
    "import { HttpClient } from '@angular/common/http';\nexport const a = HttpClient;",
    'FE-ANG-DI-03',
  ],
  [
    'src/app/features/f/pages/a.component.ts',
    "import { HttpClient } from '@angular/common/http';\nexport const a = HttpClient;",
    'FE-ANG-DI-03',
  ],
  [
    'src/app/features/f/pages/a.component.ts',
    "import { NgClass } from '@angular/common';\nexport const a = NgClass;",
    'FE-ANG-TPL-02',
  ],
  // Imports.
  [
    'src/app/a.ts',
    "import { NgClass } from '@angular/common';\nexport const a = NgClass;",
    'FE-ANG-TPL-02',
  ],
  [
    'src/app/a.ts',
    "import { HttpInterceptor } from '@angular/common/http';\nexport type A = HttpInterceptor;",
    'FE-ANG-DI-04',
  ],
  [
    'src/app/a.ts',
    "import { FormsModule } from '@angular/forms';\nexport const a = FormsModule;",
    'FE-ANG-FRM-02',
  ],
  ['src/app/a.ts', "import 'zone.js';\nexport const a = 1;", 'FE-ANG-CMP-04'],
  ['src/app/a.ts', "import 'zone.js/testing';\nexport const a = 1;", 'FE-ANG-CMP-04'],
  [
    'src/app/a.ts',
    "import { Store } from '@ngrx/store';\nexport const a = Store;",
    'FE-ANG-SIG-05',
  ],
  ['src/app/a.ts', "import '@angular/localize/init';\nexport const a = 1;", 'QP-ANGWEB-LNG-01'],
  [
    'src/app/a.component.ts',
    "import { HttpClient } from '@angular/common/http';\nexport const a = HttpClient;",
    'FE-ANG-DI-03',
  ],
  // Syntax and globals.
  ['src/app/a.ts', "@HostBinding('class.a') class A {}\nexport { A };", 'FE-ANG-CMP-03'],
  ['src/app/a.ts', 'export const a = ChangeDetectionStrategy.Eager;', 'FE-ANG-CMP-04'],
  ['src/app/a.ts', 'export const a = provideZoneChangeDetection();', 'FE-ANG-CMP-04'],
  ['src/app/a.ts', 'export const a = (s: S) => s.bypassSecurityTrustHtml("x");', 'FE-ANG-SEC-01'],
  ['src/app/a.ts', 'export const a = (e: E) => { e.innerHTML = "x"; };', 'FE-ANG-SEC-01'],
  ['src/app/a.ts', 'export const a = localStorage;', 'FE-ANG-HTTP-02'],
  ['src/app/a.ts', 'export const a = window.sessionStorage;', 'FE-ANG-HTTP-02'],
  ['src/app/a.ts', "export const a = 'https://api.example.org';", 'FE-ANG-HTTP-01'],
  ['src/app/a.ts', 'export const a = `https://api.example.org/${1}`;', 'FE-ANG-HTTP-01'],
  ['src/app/a.ts', 'export const a = () => { console.log(1); };', 'no-console'],
  ['src/app/a.ts', 'export const a = () => { debugger; };', 'no-debugger'],
  ['src/app/a.ts', 'export const a = () => eval("1");', 'no-eval'],
  ['src/app/a.ts', "export const a = globalThis['localStorage'];", 'FE-ANG-HTTP-02'],
  ['src/app/a.ts', "export const a = 'HTTPS://api.example.org';", 'FE-ANG-HTTP-01'],
  // Cross-feature imports are rejected at any depth, by alias and by relative path.
  [
    'src/app/features/f/pages/detail/a.ts',
    "import { x } from '@features/g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/pages/detail/a.ts',
    "import { x } from '../../../g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/pages/detail/a.ts',
    "import { x } from '../../../../g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/a/b/c/d/a.ts',
    "import { x } from '@features/g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/pages/a.ts',
    "import { x } from '../../../core/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  // Fail closed beyond the per-depth scopes: the alias rule has no depth.
  [
    'src/app/features/f/a/b/c/d/e/h/i/j/a.ts',
    "import { x } from '@features/g/x';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  [
    'src/app/features/f/a/b/c/d/e/h/i/j/k/a.ts',
    "import { x } from '@features/g';\nexport const a = x;",
    'FE-ANG-ORG-02',
  ],
  // Files directly under features/ are not part of a feature but still never use the layout.
  ['src/app/features/a.ts', "import { x } from '@layout/x';\nexport const a = x;", 'FE-ANG-ORG-02'],
  ['src/app/a.spec.ts', 'export const a = jasmine;', 'FE-ANG-TST-01'],
  // Templates.
  ['src/app/a.html', '<button>x</button>', 'button-has-type'],
  ['src/app/a.html', '<div *ngIf="a">x</div>', 'prefer-control-flow'],
  ['src/app/a.html', '<img src="a.png" alt="a">', 'prefer-ngsrc'],
  ['src/app/a.html', '<div style="color: red">x</div>', 'no-inline-styles'],
];

for (const [filePath, code, expected] of violations) {
  test(`${filePath} rejects: ${code.split('\n').pop().slice(0, 50)}`, async () => {
    assert.match(await messagesFor(filePath, code), new RegExp(expected));
  });
}

const controls = [
  ['src/app/shared/a.ts', "import { x } from '@shared/x';\nexport const a = x;"],
  ['src/app/features/f/pages/a.ts', "import { x } from '@core/x';\nexport const a = x;"],
  ['src/app/features/f/pages/a.ts', "import { x } from '../components/x';\nexport const a = x;"],
  ['src/app/layout/a.ts', "import { x } from '@shared/x';\nexport const a = x;"],
  ['src/app/a.spec.ts', "export const a = 'https://example.org';"],
  // Package paths that merely contain a folder name are not folder imports.
  ['src/app/shared/a.ts', "import { x } from '@angular/core/testing';\nexport const a = x;"],
  ['src/app/shared/a.ts', "import { x } from '@angular/core/rxjs-interop';\nexport const a = x;"],
  ['src/app/shared/a.spec.ts', "import { x } from '@angular/core/testing';\nexport const a = x;"],
  ['src/app/shared/a.ts', "import { x } from '../core-utils/x';\nexport const a = x;"],
  // FE-ANG-ORG-02: core may use shared; a feature may use its own code by any path.
  ['src/app/core/a.ts', "import { x } from '@shared/x';\nexport const a = x;"],
  ['src/app/features/f/pages/a.ts', "import { x } from '../../f/other';\nexport const a = x;"],
  ['src/app/features/f/pages/a.ts', "import { x } from '@features/f/other';\nexport const a = x;"],
  [
    'src/app/features/f/pages/detail/a.ts',
    "import { x } from '../../data/x';\nexport const a = x;",
  ],
  [
    'src/app/features/f/pages/a.component.ts',
    "import { x } from '@shared/x';\nexport const a = x;",
  ],
  // FE-ANG-ORG-02 only forbids a feature importing another feature; a file directly under
  // features/ (for example the routes that lazy-load each feature) is not inside any feature.
  ['src/app/features/a.ts', "import { x } from '@features/f/x';\nexport const a = x;"],
  ['src/app/features/a.ts', "import { x } from './f/x';\nexport const a = x;"],
  ['src/app/a.html', '<button type="button">x</button>'],
];

for (const [filePath, code] of controls) {
  test(`${filePath} stays clean: ${code.split('\n')[0].slice(0, 50)}`, async () => {
    assert.equal(await messagesFor(filePath, code), '');
  });
}

// discoverFeatures: an absent features folder means nothing to enforce yet; any other failure
// must surface instead of silently disabling the cross-feature rule.
test('discoverFeatures returns [] only when the features folder does not exist', () => {
  const root = mkdtempSync(join(tmpdir(), 'features-'));
  try {
    assert.deepEqual(
      discoverFeatures(new URL(`file:///${join(root, 'missing').replaceAll(sep, '/')}/`)),
      [],
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('discoverFeatures lists feature folders and ignores files', () => {
  const root = mkdtempSync(join(tmpdir(), 'features-'));
  try {
    mkdirSync(join(root, 'contracts'));
    mkdirSync(join(root, 'guests'));
    writeFileSync(join(root, 'features.routes.ts'), '');
    const features = discoverFeatures(new URL(`file:///${root.replaceAll(sep, '/')}/`));
    assert.deepEqual(features.sort(), ['contracts', 'guests']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('discoverFeatures rethrows errors other than a missing folder', () => {
  // An invalid argument fails with ERR_INVALID_ARG_TYPE, not ENOENT, on every platform
  // (reading a file as a folder gives ENOENT on Windows and ENOTDIR elsewhere).
  assert.throws(() => discoverFeatures(42), { code: 'ERR_INVALID_ARG_TYPE' });
});

// The relative-import scopes stop at MAX_FEATURE_DEPTH folders below a feature; the alias scope
// has no limit. Deeper files would silently miss the relative rule, so fail loudly instead.
function filesTooDeep(featuresDir, files = readdirSync(featuresDir, { recursive: true })) {
  return files
    .map((file) => file.split(sep))
    .filter((parts) => parts.length >= 2 && parts.at(-1).endsWith('.ts'))
    .filter((parts) => parts.length - 2 > MAX_FEATURE_DEPTH)
    .map((parts) => join(featuresDir, ...parts));
}

test('filesTooDeep flags files below the supported depth', () => {
  const ok = ['f', ...Array.from({ length: MAX_FEATURE_DEPTH }, (_, i) => `d${i}`), 'a.ts'];
  const deep = ['f', ...Array.from({ length: MAX_FEATURE_DEPTH + 1 }, (_, i) => `d${i}`), 'a.ts'];
  assert.deepEqual(filesTooDeep('features', [ok.join(sep), deep.join(sep), 'f']), [
    join('features', ...deep),
  ]);
});

test(`no file under src/app/features is deeper than ${MAX_FEATURE_DEPTH} folders (raise MAX_FEATURE_DEPTH or flatten)`, () => {
  const dir = new URL('../src/app/features/', import.meta.url);
  let tooDeep = [];
  try {
    tooDeep = filesTooDeep(dir.pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  assert.deepEqual(
    tooDeep.map((file) => relative(process.cwd(), file)),
    [],
    `Files below ${MAX_FEATURE_DEPTH} folders in a feature escape the relative-import rule of FE-ANG-ORG-02`,
  );
});
