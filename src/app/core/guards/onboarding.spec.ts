import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  RedirectCommand,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import type { Session } from '@core/auth/auth.service';
import { authGuard } from './auth.guard';
import { registrationTarget } from './onboarding';
import { onboardingGuard } from './onboarding.guard';

const registering = (step?: Session['nextOnboardingStep']): Session => ({
  role: 'GUEST',
  guestType: 'CONTRACT',
  name: 'DNI 70412233',
  mustChangePassword: false,
  guestStatus: 'ONBOARDING',
  ...(step !== undefined && { nextOnboardingStep: step }),
});
const ACTIVE: Session = { ...registering(), guestStatus: 'ACTIVE' };
const ADMIN: Session = { role: 'ADMIN', name: 'Rosa', mustChangePassword: false };

function run(guard: CanActivateFn, session: Session | null, url: string) {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      {
        provide: AuthService,
        useValue: {
          restored: () => Promise.resolve(),
          isAuthenticated: () => session !== null,
          session: () => session,
        },
      },
    ],
  });
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  );
}

const pathOf = (result: unknown) =>
  result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;

describe('where a guest in its registration must be (TAR-141, RN-33)', () => {
  it.each([
    ['nobody', null],
    ['the administrator', ADMIN],
    ['an active guest', ACTIVE],
  ])('leaves %s where it is', (_who, session) => {
    expect(registrationTarget(session, '/home')).toBeNull();
  });

  it.each([
    ['PERSONAL_DATA', '/onboarding/personal-data'],
    ['DOCUMENTS', '/onboarding/documents'],
    ['CONSENT', '/onboarding/consent'],
  ] as const)('sends it from any other screen to the page of %s', (step, path) => {
    expect(registrationTarget(registering(step), '/home')).toBe(path);
    expect(registrationTarget(registering(step), '/guest/profile')).toBe(path);
  });

  it('does not let it jump ahead to a later step or go back to an earlier one', () => {
    expect(registrationTarget(registering('DOCUMENTS'), '/onboarding/consent')).toBe(
      '/onboarding/documents',
    );
    expect(registrationTarget(registering('DOCUMENTS'), '/onboarding/personal-data')).toBe(
      '/onboarding/documents',
    );
  });

  it('lets it stay on its own step, with a query or a fragment', () => {
    const session = registering('DOCUMENTS');
    expect(registrationTarget(session, '/onboarding/documents')).toBeNull();
    expect(registrationTarget(session, '/onboarding/documents?x=1')).toBeNull();
    expect(registrationTarget(session, '/onboarding/documents#files')).toBeNull();
    expect(registrationTarget(session, '/onboarding/documents-old')).toBe('/onboarding/documents');
  });

  it('starts at the personal data when the next step is the password or unknown', () => {
    expect(registrationTarget(registering('PASSWORD'), '/home')).toBe('/onboarding/personal-data');
    expect(registrationTarget(registering(), '/home')).toBe('/onboarding/personal-data');
  });
});

describe('authGuard and the registration (TAR-141)', () => {
  it('sends a guest in onboarding to the step it has to do next', async () => {
    const result = await run(authGuard, registering('CONSENT'), '/home');

    expect(pathOf(result)).toBe('/onboarding/consent');
  });

  it('lets it into the page of its own step', async () => {
    expect(await run(authGuard, registering('CONSENT'), '/onboarding/consent')).toBe(true);
  });

  it.each([
    ['an active guest', ACTIVE, '/home'],
    ['an administrator', ADMIN, '/admin/guests'],
  ])('does not stop %s', async (_who, session, url) => {
    expect(await run(authGuard, session, url)).toBe(true);
  });

  it('still sends a guest that must change its password to that page first', async () => {
    const result = await run(
      authGuard,
      { ...registering('PASSWORD'), mustChangePassword: true },
      '/home',
    );

    expect(pathOf(result)).toBe('/change-password');
  });
});

describe('onboardingGuard (TAR-141)', () => {
  it('opens for a guest that is registering', async () => {
    expect(await run(onboardingGuard, registering('DOCUMENTS'), '/onboarding/documents')).toBe(
      true,
    );
  });

  it('sends an active guest home', async () => {
    const result = await run(onboardingGuard, ACTIVE, '/onboarding/documents');

    expect(pathOf(result)).toBe('/home');
  });

  it('shows «Sin acceso» to the administrator under the address it asked for', async () => {
    const result = await run(onboardingGuard, ADMIN, '/onboarding/documents');

    expect(result).toBeInstanceOf(RedirectCommand);
    expect((result as RedirectCommand).navigationBehaviorOptions?.browserUrl).toBe(
      '/onboarding/documents',
    );
  });
});
