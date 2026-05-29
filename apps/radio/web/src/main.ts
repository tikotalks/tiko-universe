import { createApp } from 'vue'
import { popupService } from '@sil/ui'
import App from './App.vue'

const app = createApp(App)
app.provide('popupService', popupService)
app.mount('#app')
