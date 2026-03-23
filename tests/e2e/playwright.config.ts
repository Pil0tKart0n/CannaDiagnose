import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:8081',
    headless: true,
    viewport: { width: 375, height: 812 },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'cd ../.. && npx expo start --web --port 8081',
    port: 8081,
    timeout: 60000,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 375, height: 812 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } } },
  ],
});
