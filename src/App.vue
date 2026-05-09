<script setup>
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'
import LivePage from './views/LiveView.vue'
// import StatsPage from './pages/StatsPage.vue'
// import EventsPage from './pages/EventsPage.vue'
// import PlayersPage from './pages/PlayersPage.vue'
// import AIAnalysisPage from './pages/AIAnalysisPage.vue'
import SettingsPage from './pages/SettingsPage.vue'
const activePage = ref('live')
</script>

<template>
  <div class="app">
    <Sidebar @select-page="activePage = $event" />
    <div class="main-content">
      <LivePage v-if="activePage === 'live'" />
      <StatsPage v-if="activePage === 'stats'" />
      <EventsPage v-if="activePage === 'events'" />
      <PlayersPage v-if="activePage === 'players'" />
      <AIAnalysisPage v-if="activePage === 'ai'" />
      <SettingsPage v-if="activePage === 'settings'" />
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
