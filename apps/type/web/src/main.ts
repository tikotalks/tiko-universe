import { createApp } from 'vue'
import { injectAppMeta } from '@tiko/ui'
import { appConfig } from './appConfig'
import App from './App.vue'

injectAppMeta(appConfig)
createApp(App).mount('#app')
