import { defineConfig, devices } from '@playwright/test'

const isCI = !!process.env.CI
// En CI on pointe sur le serveur Next.js démarré par le workflow.
// En local on réutilise un serveur existant (npm run dev ou npm start).
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  // En CI le serveur est démarré par le workflow avant que Playwright tourne.
  // En local, on réutilise le serveur existant.
  webServer: isCI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
