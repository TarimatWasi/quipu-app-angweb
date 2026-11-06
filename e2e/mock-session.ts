// How a capture reaches its screen on the `mock` profile: it signs in on the login form with the
// demo account of the role and picks the scenario in the mock panel, as a person would. Nothing
// here changes the app; every account and value is made up (src/app/core/mock/data/demo-users.ts).
import type { Page } from '@playwright/test';
import type { DemoUserKey } from '../src/app/core/mock/data/demo-users';
import type { MockScenario } from '../src/app/core/mock/mock-scenarios';
import type { ScreenReadiness } from './screens';

interface DemoAccount {
  readonly documentType: 'DNI' | 'CE';
  readonly documentNumber: string;
}

/** The demo accounts of the simulated BFF; all of them share the demo «clave». */
const DEMO_ACCOUNTS: Readonly<Record<DemoUserKey, DemoAccount>> = {
  admin: { documentType: 'DNI', documentNumber: '40000001' },
  'contract-guest': { documentType: 'DNI', documentNumber: '70000002' },
  'temporary-guest': { documentType: 'CE', documentNumber: '001234567' },
  'temporary-password': { documentType: 'DNI', documentNumber: '70000003' },
};

/** Not a secret: the backend is simulated in the browser and the panel shows it. */
const DEMO_CLAVE = 'Quipu2026';

/** Hides the mock panel in the capture: it floats over the screen and is not part of the canvas. */
export const CAPTURE_STYLE = 'app-mock-panel { display: none !important; }';

/** Fix the demo's dates without pausing timers, requests, countdowns or skeleton delays. */
export const CAPTURE_INSTANT = '2026-11-05T15:00:00-05:00';

export async function signIn(page: Page, role: DemoUserKey): Promise<void> {
  const account = DEMO_ACCOUNTS[role];
  await page.goto('/login');
  await page.locator('#document-type').selectOption(account.documentType);
  await page.locator('#document-number').fill(account.documentNumber);
  await page.locator('#password').fill(DEMO_CLAVE);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));
}

/** Picks the scenario in the mock panel; the panel reloads the page so every screen asks again. */
export async function chooseScenario(page: Page, scenario: MockScenario): Promise<void> {
  await page.getByRole('button', { name: /^Simulación:/ }).click();
  await Promise.all([
    page.waitForEvent('load'),
    page.locator('#quipu-mock-scenario').selectOption(scenario),
  ]);
}

/**
 * How long the screen must stay without any loading mark before the capture. The simulated BFF
 * answers in 400 ms and a skeleton only shows after 300 ms (P-12), so a screen may look idle for a
 * moment before it starts loading: one second without marks covers that gap.
 */
const QUIET_MS = 1_000;
const POLL_MS = 100;

/** A loading mark of P-12: a busy region, a skeleton block or a «Cargando…» status. */
function isLoading(): boolean {
  if (document.querySelector('[aria-busy="true"], .sk') !== null) {
    return true;
  }
  return Array.from(document.querySelectorAll('[role="status"]')).some((status) =>
    (status.textContent ?? '').trim().startsWith('Cargando'),
  );
}

async function waitForQuiet(page: Page): Promise<void> {
  let quietSince = Date.now();
  while (Date.now() - quietSince < QUIET_MS) {
    await page.waitForTimeout(POLL_MS);
    if (await page.evaluate(isLoading)) {
      quietSince = Date.now();
    }
  }
}

/**
 * Waits until the screen is stable: no network, fonts loaded, its title painted, and then its
 * content (no loading mark for a while) or, for a slow server, its skeleton.
 */
export async function waitUntilStable(page: Page, readiness: ScreenReadiness): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.locator('h1').first().waitFor({ state: 'visible' });
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  if (readiness === 'skeleton') {
    await page
      .locator('[aria-busy="true"] .sk, [aria-busy="true"] app-skeleton-block')
      .first()
      .waitFor({ state: 'visible' });
    return;
  }
  await waitForQuiet(page);
}

/** Fails the capture when the app sent it elsewhere (a guard, a lost session): it would mislead. */
export function ensureOn(page: Page, path: string): void {
  // Only the route counts: a screen may clean its query from the address bar (A0.2, A0.5 take the
  // code out of it once read).
  const current = new URL(page.url()).pathname;
  if (current !== new URL(path, page.url()).pathname) {
    throw new Error(`The capture of ${path} landed on ${current}`);
  }
}
