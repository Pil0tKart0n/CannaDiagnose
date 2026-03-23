import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: [
      'node_modules/**',
      'dist/**',
      'tests/e2e/**', // E2E tests use Playwright, not Vitest
    ],
  },
});
