import { COLLATOR, fold, matchesAny } from './search';

describe('search texts', () => {
  it('folds case and accents', () => {
    expect(fold('Huamán ÑUÑOA')).toBe('huaman nunoa');
  });

  it('matches any of the texts, and everything with an empty search', () => {
    expect(matchesAny(['Carmen Huamán', '001234567'], ' huaman ')).toBe(true);
    expect(matchesAny(['Carmen Huamán', '001234567'], '1234')).toBe(true);
    expect(matchesAny(['Carmen Huamán'], 'quispe')).toBe(false);
    expect(matchesAny([], '  ')).toBe(true);
  });

  it('orders numbers inside a code by their value', () => {
    expect(['C10', 'C2'].sort(COLLATOR.compare)).toEqual(['C2', 'C10']);
  });
});
