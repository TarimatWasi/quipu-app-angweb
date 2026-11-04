// QP-UI-13, ADR-F7 (fase 1): one PNG per screen, scenario and width of the list in screens.ts.
// Files go to playwright-output/screenshots (ignored by git; CI uploads it as an artifact).
// Evidence for the comparison with the canvas, not a test: there is no expectation on the screen
// and no baseline (toHaveScreenshot is fase 2).
import { test } from '@playwright/test';
import { CAPTURE_STYLE, chooseScenario, ensureOn, signIn, waitUntilStable } from './mock-session';
import { SCREENS } from './screens';

const SCREENSHOT_DIR = 'playwright-output/screenshots';

const captures = SCREENS.flatMap((screen) =>
  screen.scenarios.map((scenario) => ({ screen, scenario, name: `${screen.id}__${scenario}` })),
);

const repeated = captures.filter(
  (capture, index) => captures.findIndex(({ name }) => name === capture.name) !== index,
);
if (repeated.length > 0) {
  throw new Error(
    `Repeated captures in screens.ts: ${repeated.map(({ name }) => name).join(', ')}`,
  );
}

for (const { screen, scenario, name } of captures) {
  test(name, async ({ page }, testInfo) => {
    const width = testInfo.project.use.viewport?.width ?? 0;
    if (screen.role !== 'anonymous') {
      await signIn(page, screen.role);
    }
    await page.goto(screen.path);
    if (scenario !== 'normal') {
      await chooseScenario(page, scenario);
    }
    await waitUntilStable(page, screen.readiness ?? 'content');
    ensureOn(page, screen.path);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/${name}__${String(width)}.png`,
      fullPage: true,
      animations: 'disabled',
      caret: 'hide',
      style: CAPTURE_STYLE,
    });
  });
}
