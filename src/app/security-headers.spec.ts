// SEC-03 a SEC-06 (SRS 11, "Cabeceras de seguridad HTTP"): el frontend se sirve por Vercel
// (vercel.json) o por la imagen con nginx (nginx.conf). Las dos capas declaran las mismas cabeceras
// y la misma política CSP: si una cambia sin la otra, esta prueba falla.
interface VercelConfig {
  routes: { src?: string; headers?: Record<string, string>; continue?: boolean }[];
}

async function readText(path: string): Promise<string> {
  const fs = (await import('node:' + 'fs')) as unknown as {
    readFileSync(path: string, encoding: 'utf8'): string;
  };
  return fs.readFileSync(path, 'utf8');
}

async function vercelHeaders(): Promise<Map<string, string>> {
  const config = JSON.parse(await readText('vercel.json')) as VercelConfig;
  // «routes» is the low-level form of Vercel: the headers are the first route and go on (TAR-144).
  const all = config.routes.filter((rule) => rule.src === '/(.*)' && rule.headers !== undefined);
  expect(all.length).toBe(1);
  expect(all[0]?.continue).toBe(true);
  return new Map(Object.entries(all[0]?.headers ?? {}));
}

async function nginxHeaders(): Promise<Map<string, string>> {
  const found = (await readText('nginx.conf')).matchAll(/add_header\s+(\S+)\s+"(.*)"\s+always;/g);
  return new Map([...found].map((m): [string, string] => [m[1] ?? '', m[2] ?? '']));
}

const COMMON = [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Content-Security-Policy',
];

describe('cabeceras de seguridad del frontend (SEC-03 a SEC-06)', () => {
  it('Vercel declara HSTS, nosniff, DENY y una CSP sin orígenes ajenos', async () => {
    const headers = await vercelHeaders();

    expect(headers.get('Strict-Transport-Security')).toMatch(/^max-age=\d{7,}$/);
    expect(headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(headers.get('X-Frame-Options')).toBe('DENY');
    const csp = headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toMatch(/https?:\/\//);
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it.each(COMMON)('nginx y Vercel declaran %s con el mismo valor', async (key) => {
    const [vercel, nginx] = await Promise.all([vercelHeaders(), nginxHeaders()]);

    expect(vercel.get(key)).toBeDefined();
    expect(nginx.get(key)).toBe(vercel.get(key));
  });
});
