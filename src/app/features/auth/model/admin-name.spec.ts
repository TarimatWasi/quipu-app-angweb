import { adminNameProblem } from './admin-name';

describe('the name of an administrator (A0.5, contract v0.23.0)', () => {
  it('accepts a name with accents, inner spaces and surrounding whitespace', () => {
    expect(adminNameProblem('Rosa Elvira Quispe Mamani')).toBeNull();
    expect(adminNameProblem('  Ñusta Pérez  ')).toBeNull();
  });

  it('asks for a name when there is none or only whitespace', () => {
    for (const name of ['', '   ', '\t\n ']) {
      expect(adminNameProblem(name)).toEqual({
        kind: 'required',
        message: 'Escribe tu nombre completo',
      });
    }
  });

  it('allows up to 100 characters once trimmed', () => {
    expect(adminNameProblem(`${'a'.repeat(100)}  `)).toBeNull();
    expect(adminNameProblem('a'.repeat(101))?.kind).toBe('maxLength');
  });

  it('refuses control characters inside the name: line break, tab, NUL, DEL', () => {
    for (const name of ['Rosa\nQuispe', 'Rosa\tQuispe', 'Rosa\u0000Quispe', 'Rosa\u007fQuispe']) {
      expect(adminNameProblem(name)?.kind).toBe('pattern');
    }
  });
});
