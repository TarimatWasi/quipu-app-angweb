import assert from 'node:assert/strict';
import test from 'node:test';
import { bundleBoundaryProblems, staticClosure } from './bundle-boundaries.mjs';

function output(entryPoint, inputs = [], imports = [], bytes = 10) {
  return {
    entryPoint,
    inputs: Object.fromEntries(inputs.map((input) => [input, { bytesInOutput: 1 }])),
    imports,
    bytes,
  };
}

function build() {
  return {
    outputs: {
      'main.js': output(
        'src/main.ts',
        ['src/main.ts'],
        [{ kind: 'dynamic-import', path: 'shell.js' }],
      ),
      'styles.css': output('angular:styles/global:styles', ['src/styles.scss']),
      'shell.js': output('src/app/layout/app-shell/app-shell.component.ts', [
        'src/app/layout/app-shell/app-shell.component.ts',
      ]),
      'auth.js': output('src/app/features/auth/auth.routes.ts'),
      'guests.js': output('src/app/features/guests/guests.routes.ts'),
      'payments.js': output('src/app/features/payments/payments.routes.ts'),
      'account.js': output('src/app/features/my-account/my-account.routes.ts'),
      'administrators.js': output('src/app/features/administrators/administrators.routes.ts'),
      'home.js': output('src/app/home.routes.ts'),
      'login.js': output('src/app/features/auth/pages/login.component.ts', [
        'src/app/features/auth/pages/login.component.ts',
      ]),
    },
  };
}

test('counts shared static dependencies once and does not traverse dynamic or external imports', () => {
  const stats = build();
  stats.outputs['main.js'].imports.push(
    { kind: 'import-statement', path: 'shared.js' },
    { kind: 'import-statement', path: 'external', external: true },
  );
  stats.outputs['styles.css'].imports.push({ kind: 'import-rule', path: 'shared.js' });
  stats.outputs['shared.js'] = output(undefined, ['shared'], [], 100);
  const closure = staticClosure(stats.outputs, ['src/main.ts', 'angular:styles/global:styles']);
  assert.equal(closure.bytes, 120);
  assert.ok(!closure.inputs.has('src/app/layout/app-shell/app-shell.component.ts'));
  assert.deepEqual(bundleBoundaryProblems(stats).problems, []);
});

test('rejects an eager shell, even through a shared chunk', () => {
  const stats = build();
  stats.outputs['main.js'].imports.push({ kind: 'import-statement', path: 'shell.js' });
  assert.ok(
    bundleBoundaryProblems(stats).problems.some((problem) => problem.includes('Bootstrap')),
  );
});

test('rejects pages bundled into route metadata and overlays bundled into login', () => {
  const stats = build();
  stats.outputs['guests.js'].inputs['src/app/features/guests/pages/guest-detail.component.ts'] = {
    bytesInOutput: 10,
  };
  stats.outputs['login.js'].inputs['node_modules/@angular/material/dialog.mjs'] = {
    bytesInOutput: 10,
  };
  stats.outputs['login.js'].inputs[
    'src/app/features/auth/components/account-locked-dialog.component.ts'
  ] = {
    bytesInOutput: 10,
  };
  const { problems } = bundleBoundaryProblems(stats);
  assert.ok(problems.some((problem) => problem.includes('guests.routes.ts eagerly includes')));
  assert.ok(problems.some((problem) => problem.includes('material/dialog')));
  assert.ok(problems.some((problem) => problem.includes('account-locked-dialog')));
});

test('fails closed on missing entries, missing static chunks and initial size regression', () => {
  const stats = build();
  delete stats.outputs['login.js'];
  assert.throws(() => bundleBoundaryProblems(stats), /Missing build entry point/);
  const oversized = build();
  oversized.outputs['main.js'].bytes = 500_001;
  assert.ok(
    bundleBoundaryProblems(oversized).problems.some((problem) => problem.includes('limit')),
  );
  const missing = build();
  missing.outputs['main.js'].imports.push({ kind: 'import-statement', path: 'missing.js' });
  assert.throws(() => bundleBoundaryProblems(missing), /Missing emitted output/);
});

test('automatically protects a future route entry, following static dependencies but allowing lazy pages', () => {
  const stats = build();
  const route = 'src/app/features/future/future.routes.ts';
  const page = 'src/app/features/future/pages/future.component.ts';
  stats.outputs['future.js'] = output(
    route,
    [],
    [{ kind: 'dynamic-import', path: 'future-page.js' }],
  );
  stats.outputs['future-page.js'] = output(page, [page]);
  assert.deepEqual(bundleBoundaryProblems(stats).problems, []);
  stats.outputs['future.js'].imports[0].kind = 'import-statement';
  assert.ok(
    bundleBoundaryProblems(stats).problems.some((problem) =>
      problem.includes(`${route} eagerly includes ${page}`),
    ),
  );
});
