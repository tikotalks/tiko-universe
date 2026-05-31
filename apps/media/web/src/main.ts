import { createApp } from 'vue'
import { popupService } from '@sil/ui'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'

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
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { left: 0, top: 0 }
  },
})

const app = createApp(App)
app.provide('popupService', popupService)
app.use(router)
app.mount('#app')
