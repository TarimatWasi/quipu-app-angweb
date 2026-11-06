// QP-UI-01 (TAR-297): the screens are built with the kit. Colors and fonts come from the tokens of
// styles.scss, a table is an app-data-table and a button is a .quipu-button. ESLint stops the
// Material imports the kit replaces; this test reads the sources for what ESLint cannot see in
// templates and styles. The mock panel (core/mock, development only) is outside the kit.

interface Source {
  readonly path: string;
  readonly text: string;
}

interface Rule {
  readonly id: string;
  readonly what: string;
  readonly pattern: RegExp;
  /** Folders where the pattern is the kit's own definition. */
  readonly allowedIn: readonly string[];
}

const RULES: readonly Rule[] = [
  {
    id: 'QP-UI-01',
    what: 'un color escrito a mano en lugar de un token --quipu-*',
    pattern: /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![0-9a-fA-F-])/,
    allowedIn: ['core/mock/'],
  },
  {
    id: 'QP-UI-01',
    what: 'la fuente Fraunces escrita a mano en lugar de --mat-sys-*-font',
    pattern: /['"]Fraunces['"]/,
    allowedIn: [],
  },
  {
    id: 'QP-UI-01',
    what: 'una <table> propia en lugar de app-data-table (P-08)',
    pattern: /<table\b/,
    allowedIn: ['shared/ui/data-table/', 'core/mock/'],
  },
  {
    id: 'QP-UI-01',
    what: 'un botón de Material en lugar de .quipu-button (P-10)',
    pattern: /\smat-(?:flat-|stroked-|raised-)?button\b/,
    allowedIn: [],
  },
];

/** Lines of a source that break a rule, with the rule, the file and the line. */
export function kitViolations(sources: readonly Source[]): string[] {
  const found: string[] = [];
  for (const source of sources) {
    const lines = source.text.split('\n');
    for (const rule of RULES) {
      if (rule.allowedIn.some((folder) => source.path.includes(folder))) continue;
      lines.forEach((line, index) => {
        const code = line.replace(/\/\/.*$|^\s*\*.*$/, '');
        if (rule.pattern.test(code)) {
          found.push(`${rule.id} ${source.path}:${String(index + 1)}: ${rule.what}`);
        }
      });
    }
  }
  return found;
}

interface Dirent {
  name: string;
  isDirectory(): boolean;
}

interface Fs {
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  readFileSync(path: string, encoding: 'utf8'): string;
}

// The module is imported with a computed specifier: the test runs in Node and the project does
// not declare @types/node (no new dependencies), as in app-structure.spec.ts.
async function readSources(root: string): Promise<Source[]> {
  const fs = (await import('node:' + 'fs')) as unknown as Fs;
  const sources: Source[] = [];
  const walk = (folder: string): void => {
    for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
      const path = `${folder}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(path);
      } else if (
        /\.(ts|html|scss)$/.test(entry.name) &&
        !/\.(spec|testing)\.ts$/.test(entry.name)
      ) {
        sources.push({ path: path.slice(root.length + 1), text: fs.readFileSync(path, 'utf8') });
      }
    }
  };
  walk(root);
  return sources;
}

describe('uso del kit (QP-UI-01, TAR-297)', () => {
  it('las pantallas reales usan los tokens, app-data-table y .quipu-button', async () => {
    const sources = await readSources('src/app');
    expect(sources.length).toBeGreaterThan(100);
    expect(kitViolations(sources)).toEqual([]);
  });

  it('falla ante un color, una fuente, una tabla o un botón escritos a mano', () => {
    const found = kitViolations([
      { path: 'features/f/pages/a.component.ts', text: '  styles: `a { color: #1e6b4a; }`' },
      { path: 'features/f/pages/b.component.scss', text: "h1 { font-family: 'Fraunces'; }" },
      { path: 'features/f/pages/c.component.html', text: '<table class="quipu-table"></table>' },
      { path: 'shared/x/d.component.ts', text: '<button mat-stroked-button type="button">' },
    ]);
    expect(found).toHaveLength(4);
    expect(found[0]).toContain('features/f/pages/a.component.ts:1');
  });

  it('admite los tokens, las definiciones del kit, el panel del mock y los comentarios', () => {
    expect(
      kitViolations([
        { path: 'features/f/pages/a.component.scss', text: 'a { color: var(--quipu-chilca); }' },
        {
          path: 'shared/ui/data-table/data-table.component.html',
          text: '<table class="quipu-table">',
        },
        { path: 'core/mock/mock-panel.component.ts', text: 'border: 1px solid #5b3a00;' },
        { path: 'features/f/model/a.ts', text: '// the canvas uses #1e6b4a here' },
        { path: 'features/f/pages/a.component.html', text: '<a href="#top">Arriba</a>' },
      ]),
    ).toEqual([]);
  });
});
