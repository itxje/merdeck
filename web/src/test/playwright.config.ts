import { fileURLToPath } from 'node:url'
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  outputDir: fileURLToPath(new URL('../../../tmp/playwright-results', import.meta.url)),
  reporter: [['list']],
  workers: 1,
  retries: 0,
  timeout: 45000,
  use: {
    baseURL: process.env.MERDECK_TEST_URL,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
})
