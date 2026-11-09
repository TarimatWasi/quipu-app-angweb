import { OpenRows } from './open-rows';

describe('OpenRows (P-24)', () => {
  it('opens and closes a row by its id, each one apart', () => {
    const rows = new OpenRows();
    expect(rows.isOpen('a')).toBe(false);

    rows.toggle('a');
    rows.toggle('b');
    expect(rows.ids()).toEqual(['a', 'b']);
    expect(rows.isOpen('a')).toBe(true);

    rows.toggle('a');
    expect(rows.ids()).toEqual(['b']);
    expect(rows.isOpen('a')).toBe(false);
  });
});
