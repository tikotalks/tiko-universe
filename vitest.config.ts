import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@tiko/identity': fileURLToPath(new URL('./packages/identity/src/index.ts', import.meta.url)),
      '@tiko/identity/': fileURLToPath(new URL('./packages/identity/src/', import.meta.url)) + '/',
      '@tiko/i18n': fileURLToPath(new URL('./packages/i18n/src/index.ts', import.meta.url)),
      '@tiko/i18n/': fileURLToPath(new URL('./packages/i18n/src/', import.meta.url)) + '/',
      '@tiko/ui': fileURLToPath(new URL('./packages/ui/src/index.ts', import.meta.url)),
      '@tiko/ui/': fileURLToPath(new URL('./packages/ui/src/', import.meta.url)) + '/'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/vitest.setup.ts']
  }
})
