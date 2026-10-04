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

// El módulo se importa con un especificador calculado: la prueba corre en Node y el proyecto no
// declara @types/node (sin dependencias nuevas).
async function subfolders(path: string): Promise<string[]> {
  const fs = (await import('node:' + 'fs')) as unknown as {
    readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  };
  return fs
    .readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

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
