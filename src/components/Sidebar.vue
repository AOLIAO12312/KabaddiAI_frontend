<template>
  <div class="sidebar">
    <!-- LOGO部分 -->
    <div class="logo-container">
      <h1 class="logo-text">SmartKabaddi</h1>
    </div>

    <!-- 导航列表 -->
    <ul class="nav-list">
      <li @click="navigate('live')" :class="{ active: activePage === 'live' }">实时直播</li>
      <li @click="navigate('stats')" :class="{ active: activePage === 'stats' }">比赛统计</li>
      <li @click="navigate('events')" :class="{ active: activePage === 'events' }">事件回放</li>
      <li @click="navigate('players')" :class="{ active: activePage === 'players' }">运动员信息</li>
      <li @click="navigate('ai')" :class="{ active: activePage === 'ai' }">AI判罚分析</li>
      <li @click="navigate('settings')" :class="{ active: activePage === 'settings' }">设置</li>
    </ul>

  </div>
</template>

<script setup>
import { defineEmits, ref } from 'vue'

const emit = defineEmits(['select-page'])
const activePage = ref('live')

function navigate(page) {
  activePage.value = page
  emit('select-page', page)
}
</script>

<style scoped>
.sidebar {
  width: 260px;
  height: 100vh;
  padding: 30px 20px;
  box-sizing: border-box;
  background: linear-gradient(180deg, #3b82f6, #1e40af); /* 蓝色渐变 */
  color: #f0f9ff;
  box-shadow: 2px 0 10px rgb(0 0 0 / 0.15);
  display: flex;
  flex-direction: column;
  user-select: none;
}

.logo-container {
  text-align: center;
  margin-bottom: 40px;
}

/* logo 改成白色或亮色 */
.logo-text {
  font-style: italic;
  font-weight: 700;
  font-size: 28px;
  color: #f0f9ff; /* 浅白蓝色 */
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  letter-spacing: 2px;
  margin: 0;
  padding: 0;
  user-select: none;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  flex-grow: 1;
}

.nav-list li {
  padding: 14px 20px;
  margin-bottom: 12px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 18px;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
  color: #dbeafe; /* 浅蓝白 */
}

.nav-list li:hover {
  background-color: #60a5fa; /* 天蓝 */
  color: #ffffff;
  box-shadow: 0 4px 8px rgb(96 165 250 / 0.4);
}

.nav-list li.active {
  background-color: #2563eb; /* 深蓝 */
  color: #ffffff;
  box-shadow: 0 0 12px rgb(37 99 235 / 0.7);
  font-weight: 700;
}

.nav-list li.active:hover {
  background-color: #1e40af; /* 更深的蓝 */
  box-shadow: 0 0 14px rgb(30 64 175 / 0.8);
}
</style>
