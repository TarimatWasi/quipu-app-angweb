// TAR-300: each existing HttpClient mutation starts inside the CSRF coordinator, before the native
// XSRF interceptor. Parse code rather than matching comments/strings. This guards the local client
// convention (`this.http` / `this.csrf`); backend enforcement remains the security authority.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import ts from 'typescript';

function isField(node, name) {
  return (
    ts.isPropertyAccessExpression(node) &&
    node.name.text === name &&
    node.expression.kind === ts.SyntaxKind.ThisKeyword
  );
}

function preparesCsrf(node) {
  return (
    ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'protect' &&
    isField(node.expression.expression, 'csrf')
  );
}

function unpreparedWrites(text) {
  const source = ts.createSourceFile('client.ts', text, ts.ScriptTarget.Latest, true);
  const failures = [];
  const visit = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression;
      if (
        isField(method.expression, 'http') &&
        ['post', 'put', 'patch', 'delete', 'request'].includes(method.name.text)
      ) {
        let owner = node.parent;
        while (owner && !preparesCsrf(owner)) owner = owner.parent;
        if (!owner)
          failures.push(source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return failures;
}

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = join(dir, entry.name);
    return entry.isDirectory()
      ? sourceFiles(file)
      : file.endsWith('.ts') && !/\.(spec|testing)\.ts$/.test(file)
        ? [file]
        : [];
  });
}

test('all current BFF client mutations prepare CSRF before starting HttpClient', () => {
  const failures = sourceFiles('src/app').flatMap((file) =>
    unpreparedWrites(readFileSync(file, 'utf8')).map((line) => `${file}:${line}`),
  );
  assert.deepEqual(
    failures,
    [],
    'Wrap BFF writes with this.csrf.protect(() => this.http.post/put/patch/delete(...))',
  );
});

test('the write guard rejects direct writes, permits preparation and ignores reads and text', () => {
  assert.equal(unpreparedWrites('this.http.post("/bff/a", body).pipe(map(x => x))').length, 1);
  assert.equal(unpreparedWrites('this.http.request("DELETE", "/bff/a")').length, 1);
  assert.deepEqual(
    unpreparedWrites('this.csrf.protect(() => this.http.post("/bff/a", body)).pipe(map(x => x))'),
    [],
  );
  assert.deepEqual(
    unpreparedWrites('this.csrf\n .protect(() => this.http\n .post("/bff/a", body))'),
    [],
  );
  assert.deepEqual(
    unpreparedWrites('this.http.get("/bff/a"); const text = "this.http.post()";'),
    [],
  );
});
