// Flat config (FE-ANG-EST-02). Messages cite the rule ID from "Guía Angular" (FE-ANG-...) or from
// the "Perfil técnico de Quipu" (QP-ANGWEB-...) so a failure explains itself.
import { readdirSync } from 'node:fs';
import eslint from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

const restrict = (id, message) => ({ message: `${id}: ${message}` });

const baseRestrictedImports = {
  paths: [
    {
      name: '@angular/common',
      importNames: ['NgClass', 'NgStyle'],
      ...restrict('FE-ANG-TPL-02', 'use [class] and [style] bindings'),
    },
    {
      name: '@angular/common/http',
      importNames: ['HttpInterceptor'],
      ...restrict('FE-ANG-DI-04', 'use functional interceptors (HttpInterceptorFn)'),
    },
    {
      name: '@angular/forms',
      importNames: ['FormsModule'],
      ...restrict('FE-ANG-FRM-02', 'no template-driven forms'),
    },
    { name: 'zone.js', ...restrict('FE-ANG-CMP-04', 'the app is zoneless') },
    {
      name: '@angular/localize',
      ...restrict('QP-ANGWEB-LNG-01', 'no i18n framework; the UI is Spanish only'),
    },
  ],
  patterns: [
    { group: ['zone.js/*'], ...restrict('FE-ANG-CMP-04', 'the app is zoneless') },
    { group: ['@ngrx/*'], ...restrict('FE-ANG-SIG-05', 'no state library without an ADR') },
    {
      group: ['@angular/localize/*'],
      ...restrict('QP-ANGWEB-LNG-01', 'no i18n framework; the UI is Spanish only'),
    },
  ],
};

// FE-ANG-ORG-02 / QP-ANGWEB-ORG-01: folders talk to each other through the @core, @shared,
// @features and @layout aliases; relative imports never leave a folder.
// A later matching config block replaces (does not extend) the rule options, so every block
// below is built from the full set: base restrictions + folder patterns (+ HttpClient for components).
const httpClientPath = {
  name: '@angular/common/http',
  importNames: ['HttpClient'],
  ...restrict('FE-ANG-DI-03', 'components never inject HttpClient; use a data service'),
};
const folderImports = (extraPatterns, extraPaths = []) => ({
  'no-restricted-imports': [
    'error',
    {
      paths: [...baseRestrictedImports.paths, ...extraPaths],
      patterns: [...baseRestrictedImports.patterns, ...extraPatterns],
    },
  ],
});
// Anchored on the alias (`@core/...`) and on relative paths (`../core/...`): a bare `**/core/**`
// would also match package paths such as `@angular/core/testing`.
const forbidFolders = (...folders) =>
  folders.flatMap((folder) => {
    const message = restrict('FE-ANG-ORG-02', `this folder must not import from ${folder}/`);
    return [
      { group: [`@${folder}/*`], ...message },
      { regex: `^\\.{1,2}/(.*/)?${folder}(/|$)`, ...message },
    ];
  });

const escapeRegex = (text) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
export const MAX_FEATURE_DEPTH = 8;

// FE-ANG-ORG-02: `shared` imports neither `core` nor `features`; `core` does not import `features`
// (it may use `shared`); a feature never imports another feature (files directly under features/
// belong to no feature and may reference any of them). The last rule needs the feature name, so
// each feature gets: a catch-all scope that bans `@features/<other>` at ANY depth (an alias needs
// no depth), plus one scope per folder depth up to MAX_FEATURE_DEPTH for relative imports: an
// import climbing out of the feature (`../` more times than the file's depth) may only re-enter
// the same feature. Relative imports below MAX_FEATURE_DEPTH are not covered, so the test
// "no file under src/app/features is deeper than ..." fails instead of letting them slip through.
const featureScopes = (feature) => {
  const name = escapeRegex(feature);
  const message = restrict(
    'FE-ANG-ORG-02',
    `a feature must not import another feature; use @core/ or @shared/ (this file is in ${feature})`,
  );
  const otherFeatureAlias = { regex: `^@features/(?!${name}(/|$))`, ...message };
  return [
    {
      dir: `src/app/features/${feature}/**`,
      patterns: [...forbidFolders('layout'), otherFeatureAlias],
    },
    ...Array.from({ length: MAX_FEATURE_DEPTH + 1 }, (_, depth) => ({
      dir: `src/app/features/${feature}${'/*'.repeat(depth)}`,
      patterns: [
        ...forbidFolders('layout'),
        otherFeatureAlias,
        { regex: `^(\\.\\./){${depth + 1},}(?!${name}(/|$))`, ...message },
      ],
    })),
  ];
};

const folderScopes = (features) => [
  { dir: 'src/app/shared/**', patterns: forbidFolders('core', 'features', 'layout') },
  { dir: 'src/app/core/**', patterns: forbidFolders('features', 'layout') },
  { dir: 'src/app/features/**', patterns: forbidFolders('layout') },
  ...features.flatMap(featureScopes),
];

// Features are the folders under src/app/features, discovered each time ESLint loads this file
// (command line, CI). An editor's ESLint server keeps the list it loaded: restart it after adding
// a feature. A missing folder only means there is nothing to enforce yet; any other error (for
// example a permissions problem) must surface instead of silently disabling the cross-feature rule.
export const discoverFeatures = (dir = new URL('./src/app/features/', import.meta.url)) => {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

const absoluteUrl = {
  selector: 'Literal[value=/^https?:\\/\\//i]',
  message: 'FE-ANG-HTTP-01: no absolute URLs; take the base URL from environment',
};
const absoluteUrlTemplate = {
  selector: 'TemplateElement[value.raw=/^https?:\\/\\//i]',
  message: 'FE-ANG-HTTP-01: no absolute URLs; take the base URL from environment',
};
const restrictedSyntax = [
  {
    selector: 'Decorator[expression.callee.name=/^(HostBinding|HostListener)$/]',
    message: 'FE-ANG-CMP-03: use the host property of the component decorator',
  },
  {
    selector: "MemberExpression[object.name='ChangeDetectionStrategy'][property.name='Eager']",
    message: 'FE-ANG-CMP-04: OnPush is the default; do not use Eager',
  },
  {
    selector: "CallExpression[callee.name='provideZoneChangeDetection']",
    message: 'FE-ANG-CMP-04: use provideZonelessChangeDetection',
  },
  {
    selector: 'CallExpression[callee.property.name=/^bypassSecurityTrust/]',
    message: 'FE-ANG-SEC-01: never bypass Angular sanitization',
  },
  {
    selector: "AssignmentExpression[left.property.name='innerHTML']",
    message: 'FE-ANG-SEC-01: do not assign innerHTML',
  },
  {
    selector: 'MemberExpression[property.name=/^(localStorage|sessionStorage)$/]',
    message: 'FE-ANG-HTTP-02: no browser storage for tokens or personal data',
  },
  {
    selector: 'MemberExpression[computed=true][property.value=/^(localStorage|sessionStorage)$/]',
    message: 'FE-ANG-HTTP-02: no browser storage for tokens or personal data',
  },
];

const restrictedGlobals = ['localStorage', 'sessionStorage'].map((name) => ({
  name,
  message: 'FE-ANG-HTTP-02 / FE-ANG-SEC-02: no browser storage for tokens or personal data',
}));

// `features` are the folders under src/app/features; tests pass their own list.
export const createConfig = (features) =>
  tseslint.config(
    {
      ignores: [
        'dist/',
        '.angular/',
        'coverage/',
        'node_modules/',
        'src/environments/',
        'src/app/core/api/bff.generated.d.ts',
      ],
    },
    {
      files: ['**/*.ts'],
      extends: [
        eslint.configs.recommended,
        ...tseslint.configs.strictTypeChecked,
        ...tseslint.configs.stylisticTypeChecked,
        ...angular.configs.tsRecommended,
      ],
      processor: angular.processInlineTemplates,
      languageOptions: {
        parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
      },
      rules: {
        '@angular-eslint/component-selector': [
          'error',
          { type: 'element', prefix: 'app', style: 'kebab-case' },
        ],
        '@angular-eslint/directive-selector': [
          'error',
          { type: 'attribute', prefix: 'app', style: 'camelCase' },
        ],
        '@angular-eslint/prefer-signals': 'error',
        '@angular-eslint/prefer-output-readonly': 'error',
        '@angular-eslint/prefer-output-emitter-ref': 'error',
        '@angular-eslint/no-uncalled-signals': 'error',
        '@angular-eslint/no-empty-lifecycle-method': 'error',
        '@angular-eslint/prefer-inject': 'error',
        // Angular components and services are decorated classes that may legitimately be empty.
        '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
        'no-console': 'error',
        'no-debugger': 'error',
        'no-alert': 'error',
        'no-eval': 'error',
        'no-new-func': 'error',
        'max-lines': ['error', { max: 800, skipBlankLines: true, skipComments: true }],
        'max-depth': ['error', 4],
        'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
        '@typescript-eslint/naming-convention': [
          'error',
          { selector: 'default', format: ['camelCase'] },
          { selector: 'variable', format: ['camelCase', 'UPPER_CASE'] },
          { selector: 'typeLike', format: ['PascalCase'] },
          { selector: 'enumMember', format: ['PascalCase', 'UPPER_CASE'] },
          { selector: 'property', format: null },
          { selector: 'parameter', format: ['camelCase'], leadingUnderscore: 'allow' },
        ],
        'no-restricted-imports': ['error', baseRestrictedImports],
        'no-restricted-syntax': ['error', ...restrictedSyntax, absoluteUrl, absoluteUrlTemplate],
        'no-restricted-globals': ['error', ...restrictedGlobals],
      },
    },
    // FE-ANG-ORG-02 by folder, then the same scopes again for components (FE-ANG-DI-03). Scopes go
    // from broad to narrow, and all component blocks come after all plain blocks, so the last match
    // always carries both the folder patterns and the HttpClient restriction.
    { files: ['**/*.component.ts'], rules: folderImports([], [httpClientPath]) },
    ...folderScopes(features).flatMap(({ dir, patterns }) => [
      { files: [`${dir}/*.ts`], rules: folderImports(patterns) },
    ]),
    ...folderScopes(features).flatMap(({ dir, patterns }) => [
      { files: [`${dir}/*.component.ts`], rules: folderImports(patterns, [httpClientPath]) },
    ]),
    {
      // Tests: Vitest only (FE-ANG-TST-01); they may use literal URLs and long describe blocks.
      files: ['**/*.spec.ts'],
      rules: {
        'max-lines-per-function': 'off',
        'no-restricted-syntax': ['error', ...restrictedSyntax],
        'no-restricted-globals': [
          'error',
          ...restrictedGlobals,
          { name: 'jasmine', message: 'FE-ANG-TST-01: Vitest only, no Jasmine' },
        ],
      },
    },
    {
      files: ['**/*.html'],
      extends: [...angular.configs.templateRecommended, ...angular.configs.templateAccessibility],
      rules: {
        '@angular-eslint/template/button-has-type': 'error',
        '@angular-eslint/template/no-inline-styles': 'error',
        '@angular-eslint/template/prefer-at-empty': 'error',
        '@angular-eslint/template/prefer-ngsrc': 'error',
        '@angular-eslint/template/prefer-self-closing-tags': 'error',
        '@angular-eslint/template/prefer-control-flow': 'error',
        '@angular-eslint/template/eqeqeq': 'error',
        '@angular-eslint/template/no-negated-async': 'error',
      },
    },
    {
      files: ['scripts/**/*.mjs', 'eslint.config.js'],
      extends: [eslint.configs.recommended],
      languageOptions: {
        globals: {
          process: 'readonly',
          URL: 'readonly',
          Buffer: 'readonly',
          fetch: 'readonly',
          TextDecoder: 'readonly',
          AbortSignal: 'readonly',
          setTimeout: 'readonly',
        },
      },
    },
    prettier,
  );

export default createConfig(discoverFeatures());
