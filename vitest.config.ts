import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      // Code that unit tests cover: the core, the API, and the web app's pure
      // helpers. Components are covered by the Playwright tests in e2e/.
      include: [
        'packages/shared/src/**/*.ts',
        'apps/api/src/**/*.ts',
        'apps/web/src/lib/**/*.ts',
      ],
      exclude: ['**/*.test.ts', 'apps/api/src/fixtures/**'],
      reporter: ['text', 'html'],
    },
  },
})
