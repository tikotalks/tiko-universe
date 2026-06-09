import vue from '@vitejs/plugin-vue'
import { ui } from '@sil/ui/vite'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import { deployInfo } from '../../../tools/vite-plugin-deploy-info.mjs'

export default defineConfig({
  plugins: [vue(), ui(), deployInfo()],
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
