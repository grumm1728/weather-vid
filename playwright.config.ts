import { defineConfig } from '@playwright/test';

const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const extraBrowsers = process.env.WEATHER_COMPAT === '1';

export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4180/miniatures/',
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: {
          executablePath,
          args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
        },
      },
    },
    ...(extraBrowsers ? (['firefox', 'webkit'] as const).map(browserName => ({
      name: browserName,
      testMatch: 'compat.spec.ts',
      use: { browserName },
    })) : []),
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4180 --strictPort --base /miniatures/',
    url: 'http://127.0.0.1:4180/miniatures/',
    reuseExistingServer: !process.env.CI,
    env: { VITE_WEATHER_MODE: 'direct' },
  },
});
