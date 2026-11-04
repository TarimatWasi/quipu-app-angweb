import { ok } from './mock-reply';
import { MockRegistry } from './mock-registry';
import type { MockRoute } from './mock-types';

const handler = () => ok(null);
const detail: MockRoute = { key: 'GET /bff/admin/payments/{id}', handler };
const proofs: MockRoute = { key: 'PUT /bff/admin/payments/{id}/proofs', handler };
const stay: MockRoute = { key: 'PATCH /bff/admin/guests/{id}/stays/{stayId}', handler };
const list: MockRoute = { key: 'GET /bff/admin/payments', handler };

describe('MockRegistry', () => {
  const registry = new MockRegistry([list, detail, proofs, stay]);

  it('resolves a route with one parameter, decoding it', () => {
    const resolved = registry.resolve('GET', '/bff/admin/payments/pago%2F7%20b');
    expect(resolved?.route).toBe(detail);
    expect(resolved?.params).toEqual({ id: 'pago/7 b' });
  });

  it('resolves a route with two parameters', () => {
    const resolved = registry.resolve('PATCH', '/bff/admin/guests/g-1/stays/s-9');
    expect(resolved?.route).toBe(stay);
    expect(resolved?.params).toEqual({ id: 'g-1', stayId: 's-9' });
  });

  it('tells apart a route and its sub-route by the number of segments', () => {
    expect(registry.resolve('PUT', '/bff/admin/payments/p-1/proofs')?.route).toBe(proofs);
    expect(registry.resolve('GET', '/bff/admin/payments')?.route).toBe(list);
    expect(registry.resolve('GET', '/bff/admin/payments/p-1/proofs')).toBeNull();
  });

  it('matches the method too, in any case', () => {
    expect(registry.resolve('get', '/bff/admin/payments/p-1')?.route).toBe(detail);
    expect(registry.resolve('DELETE', '/bff/admin/payments/p-1')).toBeNull();
  });

  it('rejects an empty or malformed parameter and a different literal segment', () => {
    expect(registry.resolve('GET', '/bff/admin/payments/')).toBeNull();
    expect(registry.resolve('GET', '/bff/admin/payments/%E0%A4%A')).toBeNull();
    expect(registry.resolve('GET', '/bff/admin/pagos/p-1')).toBeNull();
  });

  it('refuses two routes with the same key', () => {
    expect(() => new MockRegistry([detail, { ...detail }])).toThrow(
      'Mock route registered twice: GET /bff/admin/payments/{id}',
    );
  });
});
