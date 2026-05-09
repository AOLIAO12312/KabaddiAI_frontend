<template>
  <div class="settings-page">
    <h2>系统设置</h2>

    <!-- 视频设置 -->
    <section class="setting-section">
      <h3>视频设置</h3>
      <label>
        视频源:
        <select v-model="videoSource">
          <option value="camera1">摄像机 1</option>
          <option value="camera2">摄像机 2</option>
          <option value="camera3">摄像机 3</option>
        </select>
      </label>
    </section>

    <!-- AI判罚设置 -->
    <section class="setting-section">
      <h3>AI判罚设置</h3>
      <label>
        判罚置信度阈值: {{ aiThreshold }}%
        <input type="range" min="50" max="100" step="1" v-model="aiThreshold" />
      </label>
    </section>

    <!-- 主题设置 -->
    <section class="setting-section">
      <h3>界面主题</h3>
      <label>
        <input type="radio" value="light" v-model="theme" /> 浅色
      </label>
      <label>
        <input type="radio" value="dark" v-model="theme" /> 深色
      </label>
    </section>

    <!-- 通知设置 -->
    <section class="setting-section">
      <h3>通知</h3>
      <label>
        <input type="checkbox" v-model="enableNotifications" /> 开启比赛事件通知
      </label>
    </section>

    <button @click="saveSettings">保存设置</button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 设置数据
const videoSource = ref('camera1')
const aiThreshold = ref(70)
const theme = ref('light')
const enableNotifications = ref(true)

// 保存设置示例函数
function saveSettings() {
  const settings = {
    videoSource: videoSource.value,
    aiThreshold: aiThreshold.value,
    theme: theme.value,
    enableNotifications: enableNotifications.value
  }
  console.log('保存设置:', settings)
  // 这里可以调用后端接口或存储到 localStorage
  alert('设置已保存！')
}
</script>

<style scoped>
.settings-page {
  padding: 20px;
  max-width: 600px;
}

.setting-section {
  margin-bottom: 20px;
}

h2 {
  margin-bottom: 20px;
}

label {
  display: flex;
  flex-direction: column;
  font-weight: 500;
  margin-bottom: 10px;
}

input[type="range"] {
  margin-top: 5px;
}

button {
  padding: 10px 20px;
  background-color: #3b82f6;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

button:hover {
  background-color: #2563eb;
}
</style>
