// QP-UI-19 (patrón de skeleton): un skeleton solo cubre los puntos donde la API pone un dato; lo
// demás es el componente real. Un rectángulo de alto fijo en una pantalla es un componente entero
// dibujado a ojo (su fuente, su alto y su espacio no siguen al real), así que no se admite.
// A fixed height is right where the real thing has none of its own: the image of a proof.
const MEDIA_PLACEHOLDERS = ['features/payments/pages/payment-review.component.html'];

interface Dirent {
  name: string;
  isDirectory(): boolean;
}
interface Fs {
  readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  readFileSync(path: string, encoding: 'utf8'): string;
}

// The module is imported with a computed specifier: the test runs in Node and the project does not
// declare @types/node.
async function nodeFs(): Promise<Fs> {
  const module: unknown = await import('node:' + 'fs');
  return module as Fs;
}

async function templates(dir: string): Promise<string[]> {
  const fs = await nodeFs();
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await templates(path)));
    else if (/\.component\.(html|ts)$/.test(entry.name)) found.push(path);
  }
  return found;
}

const FIXED_RECTANGLE = /<app-skeleton-block\b(?=[^>]*shape="rectangle")(?=[^>]*\sheight=")[^>]*>/;

async function offenders(): Promise<string[]> {
  const fs = await nodeFs();
  const files = await templates('src/app/features');
  return files
    .filter((path) => FIXED_RECTANGLE.test(fs.readFileSync(path, 'utf8')))
    .map((path) => path.replace('src/app/', ''))
    .sort();
}

// Las tablas con ancho por columna (TAR-319): sin él el ancho sigue al contenido y el esqueleto no
// coincide con la lista cargada. review-amounts es una tabla de tres columnas dentro de otra pantalla.
const TABLES_WITHOUT_WIDTHS = ['features/payments/components/review-amounts.component.ts'];

async function tablesWithoutWidths(): Promise<string[]> {
  const fs = await nodeFs();
  const files = await templates('src/app/features');
  return files
    .filter((path) => path.endsWith('.ts'))
    .filter((path) => {
      const source = fs.readFileSync(path, 'utf8');
      return source.includes('DataColumn<') && !source.includes("width: '");
    })
    .map((path) => path.replace('src/app/', ''))
    .sort();
}

describe('patrón de skeleton (TAR-311)', () => {
  it('toda tabla da el ancho de sus columnas (TAR-319)', async () => {
    expect((await tablesWithoutWidths()).filter((p) => !TABLES_WITHOUT_WIDTHS.includes(p))).toEqual(
      [],
    );
  });

  it('ninguna pantalla nueva dibuja un componente como rectángulo de alto fijo', async () => {
    expect((await offenders()).filter((path) => !MEDIA_PLACEHOLDERS.includes(path))).toEqual([]);
  });

  it('detecta un rectángulo de alto fijo y deja pasar un bloque sin él', () => {
    expect(FIXED_RECTANGLE.test('<app-skeleton-block shape="rectangle" height="152px" />')).toBe(
      true,
    );
    expect(FIXED_RECTANGLE.test('<app-skeleton-block shape="rectangle" />')).toBe(false);
    expect(FIXED_RECTANGLE.test('<app-skeleton-block width="60%" height="1.25rem" />')).toBe(false);
  });
});
