import { createApp } from 'vue'
import { injectAppMeta } from '@tiko/ui'
import { appConfig } from './appConfig'
import App from './App.vue'
import './styles.scss'

injectAppMeta(appConfig)
createApp(App).mount('#app')
