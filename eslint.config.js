// Flat config (FE-ANG-EST-02). Messages cite the rule ID from "Guía Angular" (FE-ANG-...) or from
// the "Perfil técnico de Quipu" (QP-ANGWEB-...) so a failure explains itself.
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
const folderImports = (extraPatterns) => ({
  'no-restricted-imports': [
    'error',
    { ...baseRestrictedImports, patterns: [...baseRestrictedImports.patterns, ...extraPatterns] },
  ],
});
const forbidFolders = (...folders) =>
  folders.map((folder) => ({
    group: [`@${folder}/*`, `**/${folder}/**`],
    ...restrict('FE-ANG-ORG-02', `this folder must not import from ${folder}/`),
  }));

const absoluteUrl = {
  selector: 'Literal[value=/^https?:\\/\\//]',
  message: 'FE-ANG-HTTP-01: no absolute URLs; take the base URL from environment',
};
const absoluteUrlTemplate = {
  selector: 'TemplateElement[value.raw=/^https?:\\/\\//]',
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
];

const restrictedGlobals = ['localStorage', 'sessionStorage'].map((name) => ({
  name,
  message: 'FE-ANG-HTTP-02 / FE-ANG-SEC-02: no browser storage for tokens or personal data',
}));

export default tseslint.config(
  { ignores: ['dist/', '.angular/', 'coverage/', 'node_modules/', 'src/environments/'] },
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
  // FE-ANG-ORG-02 by folder.
  {
    files: ['src/app/shared/**/*.ts'],
    rules: folderImports(forbidFolders('core', 'features', 'layout')),
  },
  { files: ['src/app/core/**/*.ts'], rules: folderImports(forbidFolders('features', 'layout')) },
  { files: ['src/app/features/**/*.ts'], rules: folderImports(forbidFolders('layout')) },
  {
    // A feature never reaches another feature: relative imports cannot climb out of it.
    files: ['src/app/features/*/*/*.ts'],
    rules: folderImports([
      ...forbidFolders('layout'),
      {
        group: ['@features/*', '../../**'],
        ...restrict(
          'FE-ANG-ORG-02',
          'a feature must not import another feature; use @core/ or @shared/',
        ),
      },
    ]),
  },
  {
    files: ['src/app/features/*/*.ts'],
    rules: folderImports([
      ...forbidFolders('layout'),
      {
        group: ['@features/*', '../**'],
        ...restrict('FE-ANG-ORG-02', 'a feature must not import another feature'),
      },
    ]),
  },
  {
    // FE-ANG-DI-03: components never inject HttpClient.
    files: ['**/*.component.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          ...baseRestrictedImports,
          paths: [
            ...baseRestrictedImports.paths,
            {
              name: '@angular/common/http',
              importNames: ['HttpClient'],
              ...restrict('FE-ANG-DI-03', 'components never inject HttpClient; use a data service'),
            },
          ],
        },
      ],
    },
  },
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
    files: ['scripts/**/*.mjs'],
    extends: [eslint.configs.recommended],
    languageOptions: { globals: { process: 'readonly' } },
  },
  prettier,
);
