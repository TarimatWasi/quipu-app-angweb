import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthService } from '@core/auth/auth.service';
import type { Session } from '@core/auth/auth.service';
import { authGuard } from './auth.guard';
import { onboardingGuard, registrationGuard } from './onboarding.guard';

@Component({ selector: 'app-stub', template: '' })
class StubComponent {}

const registering = (step: 'PERSONAL_DATA' | 'DOCUMENTS' | 'CONSENT'): Session => ({
  role: 'GUEST',
  guestType: 'CONTRACT',
  name: 'DNI 70412233',
  mustChangePassword: false,
  guestStatus: 'ONBOARDING',
  nextOnboardingStep: step,
});

/** The routes as app.routes has them: the shell guards its children, not only its own entry. */
async function setup(first: Session) {
  const session = signal<Session | null>(first);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        {
          path: '',
          canActivate: [authGuard],
          canActivateChild: [registrationGuard],
          children: [
            { path: 'home', component: StubComponent },
            { path: 'guest/profile', component: StubComponent },
            {
              path: 'onboarding',
              canActivate: [onboardingGuard],
              children: [
                { path: 'personal-data', component: StubComponent },
                { path: 'documents', component: StubComponent },
                { path: 'consent', component: StubComponent },
              ],
            },
          ],
        },
      ]),
      {
        provide: AuthService,
        useValue: {
          restored: () => Promise.resolve(),
          isAuthenticated: () => session() !== null,
          session,
        },
      },
    ],
  });
  await RouterTestingHarness.create();
  const router = TestBed.inject(Router);
  return { router, session };
}

describe('the registration of a guest across successive navigations (TAR-141)', () => {
  it('sends a guest in onboarding to its step from the first navigation', async () => {
    const { router } = await setup(registering('DOCUMENTS'));

    await router.navigateByUrl('/home');

    expect(router.url).toBe('/onboarding/documents');
  });

  it('keeps it there when it later goes to another screen of the shell, which is already active', async () => {
    const { router } = await setup(registering('DOCUMENTS'));
    await router.navigateByUrl('/onboarding/documents');

    await router.navigateByUrl('/home');
    expect(router.url).toBe('/onboarding/documents');
    await router.navigateByUrl('/guest/profile');
    expect(router.url).toBe('/onboarding/documents');
  });

  it('does not let it jump to another step, and lets it into the next one once it is done', async () => {
    const { router, session } = await setup(registering('DOCUMENTS'));
    await router.navigateByUrl('/onboarding/documents');

    await router.navigateByUrl('/onboarding/consent');
    expect(router.url).toBe('/onboarding/documents');

    session.set(registering('CONSENT'));
    await router.navigateByUrl('/onboarding/consent');
    expect(router.url).toBe('/onboarding/consent');
  });

  it('opens the rest of the app once the guest is active', async () => {
    const { router, session } = await setup(registering('CONSENT'));
    await router.navigateByUrl('/onboarding/consent');

    session.set({ ...registering('CONSENT'), guestStatus: 'ACTIVE' });
    await router.navigateByUrl('/home');

    expect(router.url).toBe('/home');
  });
});
