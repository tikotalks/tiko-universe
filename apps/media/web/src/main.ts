import { createApp } from 'vue'
import { popupService } from '@sil/ui'
import { injectAppMeta } from '@tiko/ui'
import { createRouter, createWebHistory } from 'vue-router'
import { appConfig } from './appConfig'
import App from './App.vue'
import './styles.scss'

injectAppMeta(appConfig)

const routes = [
  {
    path: '/',
    name: 'gallery',
    component: () => import('./pages/GalleryPage.vue'),
  },
  {
    path: '/asset/:id',
    name: 'asset-detail',
    component: () => import('./pages/AssetDetailPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    // The header links to an in-page section, so a hash has to win over the
    // scroll-to-top default or that link does nothing. The offset clears the
    // fixed header.
    if (to.hash) return { el: to.hash, top: 96, behavior: 'smooth' }
    return { left: 0, top: 0 }
  },
})

const app = createApp(App)
app.provide('popupService', popupService)
app.use(router)
app.mount('#app')
