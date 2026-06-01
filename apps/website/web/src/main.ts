import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './styles.scss'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./pages/HomePage.vue') },
    { path: '/tools', redirect: '/apps' },
    { path: '/why-tiko', component: () => import('./pages/WhyTikoPage.vue') },
    { path: '/apps', component: () => import('./pages/AppListPage.vue') },
    { path: '/apps/:slug', component: () => import('./pages/AppDetailPage.vue') },
    { path: '/how-it-works', component: () => import('./pages/HowItWorksPage.vue') },
    { path: '/caregivers', component: () => import('./pages/CaregiversPage.vue') },
    { path: '/faq', component: () => import('./pages/FaqPage.vue') },
    { path: '/docs', component: () => import('./pages/DocsPage.vue') },
    { path: '/docs/:section', component: () => import('./pages/DocsPage.vue') },
  ],
  scrollBehavior(_to, _from, savedPosition) {
    if (savedPosition) return savedPosition
    return { left: 0, top: 0 }
  },
})

createApp(App).use(router).mount('#app')
