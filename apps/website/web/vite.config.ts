import vue from '@vitejs/plugin-vue'
import { ui } from '@sil/ui/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [vue(), ui()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('../../../node_modules/@sil/ui/src', import.meta.url))
    }
  },
  optimizeDeps: {
    include: ['highlight.js/lib/core']
  },
  test: {
    environment: 'jsdom'
  }
})
