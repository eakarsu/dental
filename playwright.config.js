const { defineConfig } = require('@playwright/test');

module.defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: {
    headless: false, // Run with visible browser to see what's happening
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1280, height: 720 },
      },
    },
  ],
});
