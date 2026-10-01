// Proves that every restriction in eslint.config.js bites: each case is a violating sample that
// must fail with the rule ID in its message, plus controls that must stay clean. Type-aware rules
// are switched off here (they need real files); the rules under test do not use type information.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import config from '../eslint.config.js';

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
  ['src/app/a.ts', 'export const a = () => { debugger; };', 'debugger'],
  ['src/app/a.ts', 'export const a = () => eval("1");', 'eval'],
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
  ['src/app/a.html', '<button type="button">x</button>'],
];

for (const [filePath, code] of controls) {
  test(`${filePath} stays clean: ${code.split('\n')[0].slice(0, 50)}`, async () => {
    assert.equal(await messagesFor(filePath, code), '');
  });
}
