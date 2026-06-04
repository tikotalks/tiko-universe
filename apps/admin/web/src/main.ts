import { createApp } from 'vue'
import { popupService } from '@sil/ui'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import App from './App.vue'

void unregisterLegacyServiceWorkers()

async function unregisterLegacyServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  try {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))

    if ('caches' in window) {
      const cacheNames = await caches.keys()
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))
    }
  } catch (error) {
    console.warn('Unable to clear legacy admin service worker cache', error)
  }
}

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: () => import('./pages/HomePage.vue') },
  { path: '/images', name: 'images', component: () => import('./pages/ImageGeneratorPage.vue') },
  { path: '/stories', name: 'stories', component: () => import('./pages/StoryNarratorPage.vue') },
  { path: '/library', name: 'library', component: () => import('./pages/MediaLibraryPage.vue') },
  { path: '/users', name: 'users', component: () => import('./pages/UsersPage.vue') },
  { path: '/profile', name: 'profile', component: () => import('./pages/ProfilePage.vue') },
  { path: '/settings', name: 'settings', component: () => import('./pages/SettingsPage.vue') },
  { path: '/defaults', name: 'defaults', component: () => import('./pages/AppDefaultsPage.vue') },
  { path: '/support', name: 'support', component: () => import('./pages/CommunicationInboxPage.vue') },
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
