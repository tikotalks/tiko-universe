import { createApp } from 'vue'
import { popupService } from '@sil/ui'
import { injectAppMeta } from '@tiko/ui'
import { appConfig } from './appConfig'
import App from './App.vue'

injectAppMeta(appConfig)
const app = createApp(App)
app.provide('popupService', popupService)
app.mount('#app')
