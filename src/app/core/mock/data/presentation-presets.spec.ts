import { HttpParams } from '@angular/common/http';
import { paginate } from '../mock-reply';
import { presentationData } from './presentation-presets';
import { seedDb } from './seed';

describe('Presentation presets', () => {
  it('provides independent payment pages with unique payment and proof identities', () => {
    const data = seedDb('normal').data;
    const fixture = presentationData(data, 'many');
    const pending = fixture.payments.filter((payment) => payment.status === 'PENDING');
    const first = paginate(pending, new HttpParams());
    if (!first.nextCursor) throw new Error('expected pagination cursor');
    const next = paginate(pending, new HttpParams({ fromObject: { after: first.nextCursor } }));
    expect(first.content).toHaveLength(20);
    expect(next.content.length).toBeGreaterThan(0);
    expect(new Set(fixture.payments.map((payment) => payment.id)).size).toBe(
      fixture.payments.length,
    );
    const proofs = fixture.payments.flatMap((payment) => payment.proofs);
    expect(new Set(proofs.map((proof) => proof.id)).size).toBe(proofs.length);
    next.content[0]?.proofs.splice(0);
    expect(data.payments.every((payment) => payment.proofs.length > 0)).toBe(true);
  });

  it('uses long content and an empty payment list without mutating the normal seed', () => {
    const data = seedDb('normal').data;
    const name = data.guests[0]?.name;
    const long = presentationData(data, 'long');
    expect(long.guests[0]?.name?.length).toBeGreaterThan(name?.length ?? 0);
    expect(data.guests[0]?.name).toBe(name);
    const empty = presentationData(data, 'empty');
    expect(empty.payments).toEqual([]);
    expect(empty.guests).toBe(data.guests);
    expect(data.payments.length).toBeGreaterThan(0);
  });
});
