import { createRouter, createWebHistory } from 'vue-router'
import LiveView from '../views/LiveView.vue'
import KeyframeCluster from '../views/KeyframeCluster.vue'
import MatchStats from '../views/MatchStats.vue'


const routes = [
    { path: '/', redirect: '/live' },
    { path: '/live', name: 'LiveView', component: LiveView },
    { path: '/analysis', name: 'KeyframeClusterList', component: KeyframeCluster },
    { path: '/stats', name: 'MatchStats', component: MatchStats }
]

const router = createRouter({
    history: createWebHistory(),
    routes,
})

export default router
