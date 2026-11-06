import { TestBed } from '@angular/core/testing';
import { AccessHandoffService } from './access-handoff.service';
import type { AccessHandoff } from './access-handoff.service';

const HANDOFF: AccessHandoff = {
  guestId: 'g1',
  documentType: 'DNI',
  documentNumber: '70412233',
  type: 'CONTRACT',
  phone: null,
  contactEmail: null,
  access: {
    mode: 'TEMPORARY_PASSWORD',
    temporaryPassword: 'clave-secreta',
    expiresAt: '2026-11-05T16:42:00Z',
    emailSent: false,
    shareMessage: 'clave-secreta',
  },
  regenerated: false,
};

describe('AccessHandoffService (A3.1 → A3.7, in memory only)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives the access once, to its guest only', () => {
    const service = TestBed.inject(AccessHandoffService);
    service.put(HANDOFF);

    expect(service.take('g1')).toBe(HANDOFF);
    expect(service.take('g1')).toBeNull();
  });

  it('forgets the access when another guest asks for it', () => {
    const service = TestBed.inject(AccessHandoffService);
    service.put(HANDOFF);

    expect(service.take('g2')).toBeNull();
    expect(service.take('g1')).toBeNull();
  });

  it('never writes the access to the browser storage, the history or the address', () => {
    const stored = vi.spyOn(Storage.prototype, 'setItem');
    const pushed = vi.spyOn(history, 'pushState');
    const replaced = vi.spyOn(history, 'replaceState');
    const url = location.href;
    const service = TestBed.inject(AccessHandoffService);

    service.put(HANDOFF);
    service.take('g1');

    expect(stored).not.toHaveBeenCalled();
    expect(pushed).not.toHaveBeenCalled();
    expect(replaced).not.toHaveBeenCalled();
    expect(location.href).toBe(url);
  });
});
