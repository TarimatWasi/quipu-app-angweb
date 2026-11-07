import { documentLabel } from './document-text';

describe('the document of a person', () => {
  it('puts its type before its number', () => {
    expect(documentLabel('DNI', '70412233')).toBe('DNI 70412233');
    expect(documentLabel('CE', '001234567')).toBe('CE 001234567');
    expect(documentLabel('PASSPORT', 'X123')).toBe('Pasaporte X123');
  });
});
