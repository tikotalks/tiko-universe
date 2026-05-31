import { createApp } from 'vue'
import { popupService } from '@sil/ui'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import App from './App.vue'

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/images' },
  { path: '/images', name: 'images', component: () => import('./pages/ImageGeneratorPage.vue') },
  { path: '/stories', name: 'stories', component: () => import('./pages/StoryNarratorPage.vue') },
  { path: '/library', name: 'library', component: () => import('./pages/MediaLibraryPage.vue') },
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
