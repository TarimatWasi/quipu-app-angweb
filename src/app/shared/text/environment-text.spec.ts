import { environmentLabel } from './environment-text';

describe('the name of an environment', () => {
  it('puts its type before its code', () => {
    expect(environmentLabel('ROOM', '201')).toBe('Habitación 201');
    expect(environmentLabel('CABIN', 'C1')).toBe('Cabaña C1');
  });
});
