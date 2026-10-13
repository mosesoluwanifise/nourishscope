import { defineConfig, devices } from '@playwright/test';

// Runs against the production build via `astro preview`.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4322/',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npx astro preview --port 4322',
    url: 'http://localhost:4322/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
