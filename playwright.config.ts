// ADR-F7 (D-89 a): Playwright only takes the visual captures of QP-UI-13 on the `mock` profile
// (fase 1, evidence). It is not part of `npm run verify` nor of any build: `npm run screenshots`.
import { defineConfig, devices } from '@playwright/test';

const PORT = 4320;
const isCi = Boolean(process.env['CI']);

/** The three widths of QP-UI-13; the project name is the width the file name carries. */
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 768, height: 1024 },
  { width: 390, height: 844 },
] as const;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.capture.ts',
  outputDir: './playwright-output/test-results',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  workers: isCi ? 2 : undefined,
  // «Servidor lento» waits for the session and the screen at 9 s each before the skeleton settles.
  timeout: 60_000,
  reporter: isCi ? [['list'], ['github']] : [['list']],
  use: {
    baseURL: `http://localhost:${String(PORT)}`,
    locale: 'es-PE',
    timezoneId: 'America/Lima',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  projects: VIEWPORTS.map((viewport) => ({
    name: String(viewport.width),
    use: { ...devices['Desktop Chrome'], viewport },
  })),
  webServer: {
    command: `npm run start:mock -- --port ${String(PORT)}`,
    url: `http://localhost:${String(PORT)}/login`,
    reuseExistingServer: !isCi,
    timeout: 180_000,
    env: { NG_CLI_ANALYTICS: 'false' },
  },
});
