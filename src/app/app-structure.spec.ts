// FE-ANG-ORG-01 (Guía Angular): src/app tiene core/, shared/ y features/<feature>/, organizado por
// funcionalidad y sin carpetas globales por tipo. Las carpetas propias de Quipu se declaran en su
// perfil técnico (QP-ANGWEB-ORG-01: layout/) y se agregan a PRODUCT_FOLDERS.
const REQUIRED_FOLDERS = ['core', 'shared', 'features'];
const PRODUCT_FOLDERS = ['layout'];
const TYPE_FOLDERS = ['components', 'services', 'directives'];

function structureViolations(folders: readonly string[]): string[] {
  const violations: string[] = [];
  for (const folder of REQUIRED_FOLDERS) {
    if (!folders.includes(folder)) violations.push(`falta la carpeta ${folder}/`);
  }
  for (const folder of folders) {
    if (TYPE_FOLDERS.includes(folder)) {
      violations.push(`${folder}/ es una carpeta global por tipo`);
    } else if (!REQUIRED_FOLDERS.includes(folder) && !PRODUCT_FOLDERS.includes(folder)) {
      violations.push(`${folder}/ no está declarada en el perfil técnico`);
    }
  }
  return violations;
}

interface Dirent {
  name: string;
  isDirectory(): boolean;
}

// QP-ANGWEB-ORG-01: one feature per domain. The ones not built yet are not required; any feature
// that exists must be one of these.
const FEATURES = [
  'auth',
  'dashboard',
  'environments',
  'guests',
  'contracts',
  'payments',
  'finance',
  'administrators',
  'my-account',
  'onboarding',
];
// QP-ANGWEB-ORG-02: inside a feature only `<f>.routes.ts` and these layers.
const FEATURE_LAYERS = ['pages', 'components', 'data', 'model'];

function featureViolations(feature: string, entries: readonly Dirent[]): string[] {
  const violations: string[] = [];
  if (!FEATURES.includes(feature)) {
    violations.push(`features/${feature}/ no figura en QP-ANGWEB-ORG-01`);
  }
  const routes = `${feature}.routes.ts`;
  if (!entries.some((entry) => !entry.isDirectory() && entry.name === routes)) {
    violations.push(`falta features/${feature}/${routes}`);
  }
  for (const entry of entries) {
    if (entry.isDirectory() && !FEATURE_LAYERS.includes(entry.name)) {
      violations.push(`features/${feature}/${entry.name}/ no es una capa de QP-ANGWEB-ORG-02`);
    } else if (!entry.isDirectory() && entry.name !== routes) {
      violations.push(`features/${feature}/${entry.name} debe ir dentro de una capa`);
    }
  }
  return violations;
}

// El módulo se importa con un especificador calculado: la prueba corre en Node y el proyecto no
// declara @types/node (sin dependencias nuevas).
async function entries(path: string): Promise<Dirent[]> {
  const fs = (await import('node:' + 'fs')) as unknown as {
    readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  };
  return fs.readdirSync(path, { withFileTypes: true });
}

async function subfolders(path: string): Promise<string[]> {
  return (await entries(path)).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

const folder = (name: string): Dirent => ({ name, isDirectory: () => true });
const file = (name: string): Dirent => ({ name, isDirectory: () => false });

describe('estructura de src/app (FE-ANG-ORG-01)', () => {
  it('la estructura real cumple la regla', async () => {
    expect(structureViolations(await subfolders('src/app'))).toEqual([]);
  });

  it('falla ante una carpeta global por tipo', () => {
    expect(structureViolations(['core', 'shared', 'features', 'components'])).toEqual([
      'components/ es una carpeta global por tipo',
    ]);
  });

  it('falla ante una carpeta no declarada en el perfil', () => {
    expect(structureViolations(['core', 'shared', 'features', 'utils'])).toEqual([
      'utils/ no está declarada en el perfil técnico',
    ]);
  });

  it('falla si falta una de las carpetas obligatorias', () => {
    expect(structureViolations(['core', 'features'])).toEqual(['falta la carpeta shared/']);
  });

  it('admite las carpetas propias declaradas en el perfil', () => {
    expect(structureViolations(['core', 'shared', 'features', 'layout'])).toEqual([]);
  });
});

describe('estructura de cada feature (QP-ANGWEB-ORG-01, QP-ANGWEB-ORG-02)', () => {
  it('las features reales cumplen la regla', async () => {
    const violations: string[] = [];
    for (const feature of await subfolders('src/app/features')) {
      violations.push(...featureViolations(feature, await entries(`src/app/features/${feature}`)));
    }
    expect(violations).toEqual([]);
  });

  it('admite una feature de la lista con su archivo de rutas y sus capas', () => {
    expect(
      featureViolations('payments', [
        file('payments.routes.ts'),
        folder('pages'),
        folder('components'),
        folder('data'),
        folder('model'),
      ]),
    ).toEqual([]);
  });

  it('no exige las capas que la feature aún no usa', () => {
    expect(featureViolations('dashboard', [file('dashboard.routes.ts'), folder('pages')])).toEqual(
      [],
    );
  });

  it('falla ante una feature que no figura en la lista', () => {
    expect(featureViolations('home', [file('home.routes.ts')])).toEqual([
      'features/home/ no figura en QP-ANGWEB-ORG-01',
    ]);
  });

  it('falla si falta el archivo de rutas de la feature', () => {
    expect(featureViolations('guests', [file('guest.routes.ts'), folder('pages')])).toEqual([
      'falta features/guests/guests.routes.ts',
      'features/guests/guest.routes.ts debe ir dentro de una capa',
    ]);
  });

  it('falla ante una carpeta que no es una capa', () => {
    expect(featureViolations('auth', [file('auth.routes.ts'), folder('services')])).toEqual([
      'features/auth/services/ no es una capa de QP-ANGWEB-ORG-02',
    ]);
  });

  it('falla ante un archivo suelto en la raíz de la feature', () => {
    expect(featureViolations('auth', [file('auth.routes.ts'), file('lock-countdown.ts')])).toEqual([
      'features/auth/lock-countdown.ts debe ir dentro de una capa',
    ]);
  });
});
