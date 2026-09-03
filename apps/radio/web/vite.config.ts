import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { ui } from '@sil/ui/vite'
import { deployInfo } from '../../../tools/vite-plugin-deploy-info.mjs'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue(), ui(), deployInfo()],
  resolve: {
    alias: {
      '@tiko/ui': fileURLToPath(new URL('../../../packages/ui/src/index.ts', import.meta.url)),
    },
  },
  optimizeDeps: {
    include: ['highlight.js/lib/core'],
    // @sil/ui ships TypeScript source. Letting Vite pre-bundle it in dev
    // produces a second copy of its popup service, so the app's popups are
    // registered on one instance while <Popup /> renders from the other and
    // nothing appears on screen. Production bundles resolve it once.
    exclude: ['@sil/ui'],
  },
})
