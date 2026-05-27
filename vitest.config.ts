import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@tiko/ui': fileURLToPath(new URL('./packages/ui/src/index.ts', import.meta.url)),
      '@tiko/ui/': fileURLToPath(new URL('./packages/ui/src/', import.meta.url)) + '/'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})
