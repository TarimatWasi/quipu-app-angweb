import { countText, loadErrorText, noMatchHeading } from './list-text';

describe('the sentences of a list (TAR-321)', () => {
  it('says how many of the loaded ones are shown, with or without «cargados» or a unit', () => {
    expect(countText(3, 17)).toBe('Mostrando 3 de 17 cargados');
    expect(countText(5, 17, 'cobros')).toBe('Mostrando 5 de 17 cobros');
    expect(countText(3, 5, '')).toBe('Mostrando 3 de 5');
  });

  it('says that nothing matches the filters for each subject', () => {
    expect(noMatchHeading('contrato')).toBe('Ningún contrato coincide con los filtros.');
    expect(noMatchHeading('huésped')).toBe('Ningún huésped coincide con los filtros.');
  });

  it('says what could not be loaded, in the singular or the plural', () => {
    expect(loadErrorText('el contrato')).toBe('No se pudo cargar el contrato.');
    expect(loadErrorText('Finanzas')).toBe('No se pudo cargar Finanzas.');
    expect(loadErrorText('los huéspedes', true)).toBe('No se pudieron cargar los huéspedes.');
  });
});
