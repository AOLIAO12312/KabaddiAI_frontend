<script setup>
import { ref, computed } from 'vue'
import Sidebar from './components/Sidebar.vue'

// 页面内容组件
import LiveView from './views/LiveView.vue'
import KeyframeCluster from './views/KeyframeCluster.vue'
import DataView from './views/MatchStats.vue'

const currentPage = ref('live')

const currentView = computed(() => {
  switch (currentPage.value) {
    case 'live':
      return LiveView
    case 'keyframes':
      return KeyframeCluster
    case 'data':
      return DataView
    default:
      return DataView
  }
})
</script>

<template>
  <div class="app">
    <Sidebar @select-page="currentPage = $event" />
    <div class="main-content">
      <component :is="currentView" />
    </div>
  </div>
</template>


<style scoped>
.app {
  display: flex;
}

.main-content {
  flex: 1;
  padding: 20px;
  background-color: #f1f5f9;
  min-height: 100vh;
}
</style>
