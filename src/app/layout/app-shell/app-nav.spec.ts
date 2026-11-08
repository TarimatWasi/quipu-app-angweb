import type { Session } from '@core/auth/auth.service';
import { sectionsFor } from './app-nav';

const guest: Session = {
  role: 'GUEST',
  guestType: 'CONTRACT',
  name: 'Luis',
  mustChangePassword: false,
  guestStatus: 'ACTIVE',
};

describe('the menu of the bar', () => {
  it('has the sections of the role of an active guest', () => {
    expect(sectionsFor(guest).map((entry) => entry.label)).toEqual([
      'Estado de cuenta',
      'Mi contrato',
      'Historial de pagos',
      'Mis datos',
    ]);
  });

  it('has none for a guest that has not finished its registration: only «Salir» (TAR-141)', () => {
    expect(
      sectionsFor({ ...guest, guestStatus: 'ONBOARDING', nextOnboardingStep: 'DOCUMENTS' }),
    ).toEqual([]);
  });

  it('has none without a session', () => {
    expect(sectionsFor(null)).toEqual([]);
  });
});
