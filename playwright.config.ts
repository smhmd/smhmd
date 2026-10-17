import { defineConfig } from '@playwright/test'

const port = 5199

// Interaction tests against the real app in headless Chromium, on the GPU.
export default defineConfig({
  testDir: 'src',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  workers: '50%',
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 800 },
    launchOptions: { args: ['--enable-gpu'] },
  },
  webServer: {
    command: `pnpm exec vite --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
