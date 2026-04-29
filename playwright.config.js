import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'sh -ec "pnpm --dir Frontend/insighta-portal run dev -- --host 0.0.0.0 --port 5173 >/tmp/insighta-frontend.log 2>&1 & frontend_pid=$!; until curl -sf http://127.0.0.1:5173 >/dev/null; do sleep 1; done; pnpm --dir Backend/Api-integration run start >/tmp/insighta-backend.log 2>&1 & backend_pid=$!; wait $backend_pid $frontend_pid"',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
