import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import TimelineView from '../views/TimelineView.vue'
import AnalyticsView from '../views/AnalyticsView.vue'
import ImportView from '../views/ImportView.vue'
import SettingsView from '../views/SettingsView.vue'
import SessionView from '../views/SessionView.vue'

const routes = [
  { path: '/', name: 'home', component: HomeView },
  { path: '/timeline', name: 'timeline', component: TimelineView },
  { path: '/timeline/:id', name: 'session-timeline', component: SessionView, props: true },
  { path: '/analytics', name: 'analytics', component: AnalyticsView },
  { path: '/analytics/:id', name: 'session-analytics', component: () => import('../views/AnalyticsDetailView.vue'), props: true },
  { path: '/import', name: 'import', component: ImportView },
  { path: '/settings', name: 'settings', component: SettingsView },
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router