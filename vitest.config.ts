import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@tiko/data': fileURLToPath(new URL('./packages/data/src/index.ts', import.meta.url)),
      '@tiko/data/': fileURLToPath(new URL('./packages/data/src/', import.meta.url)) + '/',
      '@tiko/identity': fileURLToPath(new URL('./packages/identity/src/index.ts', import.meta.url)),
      '@tiko/identity/': fileURLToPath(new URL('./packages/identity/src/', import.meta.url)) + '/',
      '@tiko/i18n': fileURLToPath(new URL('./packages/i18n/src/index.ts', import.meta.url)),
      '@tiko/i18n/': fileURLToPath(new URL('./packages/i18n/src/', import.meta.url)) + '/',
      '@tiko/media': fileURLToPath(new URL('./packages/media/src/index.ts', import.meta.url)),
      '@tiko/media/': fileURLToPath(new URL('./packages/media/src/', import.meta.url)) + '/',
      '@tiko/testing': fileURLToPath(new URL('./packages/testing/src/index.ts', import.meta.url)),
      '@tiko/testing/': fileURLToPath(new URL('./packages/testing/src/', import.meta.url)) + '/',
      '@tiko/ui': fileURLToPath(new URL('./packages/ui/src/index.ts', import.meta.url)),
      '@tiko/ui/': fileURLToPath(new URL('./packages/ui/src/', import.meta.url)) + '/',
      '@tiko/write-glyphs': fileURLToPath(new URL('./packages/write-glyphs/src/index.ts', import.meta.url)),
      '@tiko/write-glyphs/': fileURLToPath(new URL('./packages/write-glyphs/src/', import.meta.url)) + '/'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    // 5s is too tight for this suite now: several specs mount a whole Vue app,
    // and content-api-write.test.ts starts a Miniflare worker with real D1. On a
    // loaded machine those run in parallel and the slow ones were timing out on
    // contention rather than on anything being wrong.
    testTimeout: 20_000,
    hookTimeout: 60_000,
    setupFiles: ['./tests/vitest.setup.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/e2e/**',
        '**/*.config.*',
        '**/vite-env.d.ts'
      ]
    }
  }
})
