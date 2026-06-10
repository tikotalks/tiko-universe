declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*/tools/vite-plugin-deploy-info.mjs' {
  import type { Plugin } from 'vite'
  export function deployInfo(): Plugin
}
