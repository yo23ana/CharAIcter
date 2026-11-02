import { defineConfig, devices } from '@playwright/test'

// Own ports, so the tests never collide with `npm run dev` (5173 and 3000).
const apiPort = 3100
const webPort = 4173

// `npm run test:e2e` builds everything first; the servers run the build.
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${webPort}`,
    contextOptions: { reducedMotion: 'reduce' },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node apps/api/dist/server.js',
      env: { PORT: String(apiPort) },
      url: `http://localhost:${apiPort}/health`,
    },
    {
      command: `npx vite preview --config apps/web/vite.config.ts --port ${webPort} --strictPort`,
      env: { API_PROXY_TARGET: `http://localhost:${apiPort}` },
      url: `http://localhost:${webPort}`,
    },
  ],
})
