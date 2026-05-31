import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { ui } from '@sil/ui/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), ui()],
  resolve: {
    alias: {
      '@tiko/ui': fileURLToPath(new URL('../../../packages/ui/src/index.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['highlight.js/lib/core'],
  },
})
