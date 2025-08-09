<script setup>
import {onBeforeUnmount, onMounted, ref, computed, nextTick} from 'vue';
import PlayerCard from "../components/PlayerCard.vue";
import axios from "axios";
import PlayerSpeedChart from "../components/PlayerSpeedChart.vue";

// 运动员数据，初始化为空
const players = ref([]);
// 视频流源
const playerDataSrc = "http://localhost:8080/stream/playerData"
const eventDataSrc = "http://localhost:8080/stream/eventData"
let eventSource;
let eventSource2;
const isShowingChart = ref(false);  // 控制显示图表还是卡片
const currentFrameUrl0 = ref(null)
const currentFrameUrl1 = ref(null)
const frameQueue0 = []
const frameQueue1 = []
const playerDataQueue = []
const currentFrameIndex = ref(-1)
const fps = ref(0)
const currentTrackingPlayer = ref(0)
let frameCount = 0
let lastTime = Date.now()
let status = ref('waiting')
// 保存900帧（30s）的历史数据，使之可以按帧回溯
const maxQueueSize = 300
let absoluteFrameIndex = -1
let abortControllers = {};
// 三个关键数据
const eventFrames = ref([]) // 响应式标注帧集合
const absoluteFrameIndexRef = ref(0)    // 当前全局帧
const frameQueueLength = ref(0)          // 缓存帧长度
// 计算出可见的标注点及其位置
const visibleMarkers = computed(() => {
  return eventFrames.value
      .map(f => {
        const offset = f + 1 - (absoluteFrameIndexRef.value - frameQueueLength.value)
        if (offset < 0 || offset > frameQueueLength.value) return null
        return {
          frame: f,
          left: `calc(${(offset / frameQueueLength.value) * 92}%)`
        }
      })
      .filter(Boolean) // 去掉 null
})

const showModal = ref(false);
const imageRaw = ref("");
const imageAi = ref("");

const statusMap = {
  live:     { text: '直播中',   color: 'bg-red-500', icon: '🔴' },
  replay:   { text: '回放中',   color: 'bg-blue-500', icon: '⏪' },
  waiting:  { text: '等待连接', color: 'bg-gray-400', icon: '⏳' },
  ai:       { text: 'AI判定中', color: 'bg-purple-500', icon: '🧠' },
  pause:    { text: '暂停中',   color: 'bg-yellow-400', icon: '⏸' },
  error:    { text: '异常中断', color: 'bg-red-800', icon: '⚠️' }
}
const statusText = computed(() => statusMap[status.value]?.text || '未知状态')
const statusIcon = computed(() => statusMap[status.value]?.icon || '❔')
const statusClass = computed(() => statusMap[status.value]?.color || 'bg-gray-500')
// 控制播放状态：true = 正在播放，false = 已暂停
const isStreaming = ref(true);
let updateTimer = null;
let currentTargetId = null;
let eventLogs = ref([]); // 存放事件流数据


function showImages(camera, frame) {
  if(status.value === 'live'){
    alert("请先暂停直播")
    return
  }
  // 请求原始图
  fetch(`http://localhost:8080/api/judgment-image/raw?camera=${camera}&frame=${frame}`)
      .then(res => res.blob())
      .then(blob => {
        imageRaw.value = URL.createObjectURL(blob);
      });

  // 请求AI解析图
  fetch(`http://localhost:8080/api/judgment-image/ai?camera=${camera}&frame=${frame}`)
      .then(res => res.blob())
      .then(blob => {
        imageAi.value = URL.createObjectURL(blob);
      });

  // 打开弹窗
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
  imageRaw.value = "";
  imageAi.value = "";
}

const riskClass = (level) => {
  if (level.includes("高风险")) return "risk high";
  if (level.includes("中风险")) return "risk medium";
  return "risk low";
};
function onFrameChange(event) {
  if(status.value !== 'live'){
    status.value = 'replay'
    const index = Number(event.target.value);
    if(index <= 1){
      return
    }
    currentFrameUrl0.value = frameQueue0[index];
    currentFrameUrl1.value = frameQueue1[index];
    players.value = playerDataQueue[index];
  }else{
    alert("请在暂停后回放")
  }
}
function prevFrame(){
  if(currentFrameIndex.value > 0 && currentFrameIndex.value <= frameQueue0.length && status.value !== 'live'){
    status.value = 'replay'
    currentFrameIndex.value -= 1
    currentFrameUrl0.value = frameQueue0[currentFrameIndex.value];
    currentFrameUrl1.value = frameQueue1[currentFrameIndex.value];
    players.value = playerDataQueue[currentFrameIndex.value];
  }else{
    if(status.value === 'live'){
      alert("请在暂停后回放")
      return
    }
    alert("回放索引范围越界")
  }
}
function nextFrame(){
  if(currentFrameIndex.value >= 0 && currentFrameIndex.value < frameQueue0.length - 1 && status.value !== 'live') {
    status.value = 'replay'
    currentFrameIndex.value += 1
    currentFrameUrl0.value = frameQueue0[currentFrameIndex.value];
    currentFrameUrl1.value = frameQueue1[currentFrameIndex.value];
    players.value = playerDataQueue[currentFrameIndex.value];
  }else{
    if(status.value === 'live'){
      alert("请在暂停后回放")
      return
    }
    alert("回放索引范围越界")
  }
}
const startPlayerDataStream = () => {
  console.log('正在初始化 EventSource');
  eventSource = new EventSource(playerDataSrc);

  eventSource.onopen = () => {
    console.log('EventSource 连接已建立');
    status.value = 'live'
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // === 1. 忽略心跳包 ===
      if (data.type === 'heartbeat') {
        console.debug('收到心跳包:', data);
        return; // 不进行后续处理
      }

      // === 2. 正常 players 数据处理 ===
      if (!data.players || !Array.isArray(data.players)) {
        console.warn('无效的 players 数据:', data.players);
        players.value = [];
        return;
      }

      players.value = data.players.map(player => {
        if (!player.position ||
            player.position.x === undefined ||
            player.position.y === undefined ||
            isNaN(player.position.x) ||
            isNaN(player.position.y)) {
          console.warn(`修复缺失的 position 数据 (person_id: ${player.person_id}):`, player);
          return {
            ...player,
            position: { x: -1, y: -1 }
          };
        }
        return player;
      });
      if(playerDataQueue.length >= maxQueueSize){
        playerDataQueue.shift() // 清理久远记录
      }
      playerDataQueue.push(players.value)

      // 每收到一帧就计数
      absoluteFrameIndex++
      absoluteFrameIndexRef.value++
      frameCount++
      frameQueueLength.value = frameQueue0.length
      const now = Date.now()
      const elapsed = now - lastTime

      if (elapsed >= 1000) {
        // 每秒更新一次fps
        fps.value = frameCount
        frameCount = 0
        lastTime = now
      }
    } catch (e) {
      console.error('JSON 解析失败:', e, '原始数据:', event.data);
      players.value = [];
    }
  };

  eventSource.onerror = (e) => {
    console.error('数据流连接失败:', e);
  };
};
const stopPlayerDataStream = () => {
  if (eventSource) {
    eventSource.close();
    console.log('关闭 EventSource数据流');
  }
};
function pushFrameQueue(newUrl,frameQueue){
  if(frameQueue.length > maxQueueSize){
    // 清除历史帧记录
    let oldUrl = frameQueue.shift()
    URL.revokeObjectURL(oldUrl);
  }
  frameQueue.push(newUrl)
}
async function startStream(inputUrl, currentFrameUrl, frameQueue, videoId) {
  // 创建控制器
  let abortController = new AbortController();
  const response = await fetch(inputUrl, {
    signal: abortController.signal  // 绑定 signal
  });
  console.log("建立video" + videoId + "的连接")
  abortControllers[videoId] = abortController;
  const reader = response.body.getReader();
  const boundary = "--frame";

  let buffer = new Uint8Array(); // 维护一个动态缓冲区

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      // 拼接新数据到 buffer 中
      const tmp = new Uint8Array(buffer.length + value.length);
      tmp.set(buffer, 0);
      tmp.set(value, buffer.length);
      buffer = tmp;

      // 查找边界 "--frame"
      const boundaryStr = new TextEncoder().encode(boundary);
      let boundaryIndex = searchBoundary(buffer, boundaryStr);
      while (boundaryIndex !== -1) {
        const nextBoundaryIndex = searchBoundary(buffer, boundaryStr, boundaryIndex + boundaryStr.length);
        if (nextBoundaryIndex === -1) break;

        // 提取单帧的数据块
        const part = buffer.slice(boundaryIndex + boundaryStr.length, nextBoundaryIndex);
        buffer = buffer.slice(nextBoundaryIndex); // 剩余数据

        // 查找 "\r\n\r\n" 分隔头部和图像内容
        const headerEndIndex = findDoubleCRLF(part);
        if (headerEndIndex === -1) continue;

        const imageBytes = part.slice(headerEndIndex + 4); // 4字节跳过 \r\n\r\n

        // 显示图像
        const blob = new Blob([imageBytes], { type: "image/jpeg" });
        const url = URL.createObjectURL(blob);
        // 缓存30s帧数据
        pushFrameQueue(url,frameQueue)
        // 取出最后一个元素,进行显示
        currentFrameUrl.value = url
        currentFrameIndex.value = frameQueue.length - 1

        boundaryIndex = searchBoundary(buffer, boundaryStr);
      }
    }
  }catch (err){
    if (err.name === 'AbortError') {
      console.log('Fetch 被手动中止');
    } else {
      console.error('读取失败:', err);
    }
  }
}
// 查找子数组出现的位置（从 offset 起）
function searchBoundary(buffer, pattern, offset = 0) {
  for (let i = offset; i <= buffer.length - pattern.length; i++) {
    let match = true;
    for (let j = 0; j < pattern.length; j++) {
      if (buffer[i + j] !== pattern[j]) {
        match = false;
        break;
      }
    }
    if (match) return i;
  }
  return -1;
}
// 查找第一个 "\r\n\r\n" 的位置
function findDoubleCRLF(buffer) {
  for (let i = 0; i < buffer.length - 3; i++) {
    if (
        buffer[i] === 13 && buffer[i + 1] === 10 && // \r\n
        buffer[i + 2] === 13 && buffer[i + 3] === 10 // \r\n
    ) {
      return i;
    }
  }
  return -1;
}
const toggleStream = async () => {
  try {
    if (isStreaming.value) {
      await axios.post('http://localhost:8080/stream/pause');
      stopUpdate()
      console.log("已暂停视频流");
      status.value = 'pause'
    } else {
      await axios.post('http://localhost:8080/stream/resume');
      isShowingChart.value = false
      console.log("已恢复视频流");
      status.value = 'live'
    }
    isStreaming.value = !isStreaming.value; // 切换状态
  } catch (error) {
    console.error("切换失败", error);
    status.value = 'error'
  }
};
const currentSpeedChartData = ref([]); // 存储当前选中球员的速度数据
function startUpdate(playerId, interval = 200) {
  stopUpdate(); // 若已有定时器则先停掉
  let isFirst = true
  currentTargetId = playerId;
  currentTrackingPlayer.value = playerId
  currentSpeedChartData.value = []; // 清空历史数据
  isShowingChart.value = true;

  let lastCheckedFrame = absoluteFrameIndex;


  function updateChart() {
    if (isFirst || absoluteFrameIndex - lastCheckedFrame >= 15) {
      lastCheckedFrame = absoluteFrameIndex;
      isFirst = false
      const data = [];

      // 每隔30帧向前取10个数据点（300帧）
      for (let i = 0; i < 20; i++) {
        const frameIndex = playerDataQueue.length - i * 15;
        if (frameIndex < 0 || frameIndex >= playerDataQueue.length) continue;

        const frame = playerDataQueue[frameIndex];
        const player = frame.find(p => p.person_id === currentTargetId);
        if (player) {
          // 添加 { frameIndex: velocity } 结构的数据
          data.unshift({ [absoluteFrameIndex - i * 15]: player.velocity });
        }
      }

      currentSpeedChartData.value = data;
    }
  }

  updateChart()

  updateTimer = setInterval(updateChart, interval);
}
function stopUpdate() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}


const startEventDataStream = () => {
  console.log('正在初始化 EventSource2');
  eventSource2 = new EventSource(eventDataSrc);

  eventSource2.onopen = () => {
    console.log('EventSource2 连接已建立');
  };

  eventSource2.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      eventFrames.value.push(Number(data.frame))

      const now = new Date();
      const timeStr = `[${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ` +
          `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}]`;

      data.events.forEach((ev, index) => {
        eventLogs.value.push({
          time: timeStr,
          frame: data.frame,
          attacker: ev.attacker,
          defender: ev.defender,
          observations: ev.observations.map(obs => ({
            cameraName: obs.cameraName,
            poseDist: obs.poseDist.toFixed(3),
            coordDist: obs.coordDist.toFixed(3),
            bestFrame: obs.bestFrame
          })),
          riskLevel: ev.riskLevel
        });
      });

      // 自动滚动到底部
      nextTick(() => {
        const box = document.querySelector('.info-text');
        if (box) {
          box.scrollTop = box.scrollHeight;
        }
      });

    } catch (e) {
      console.error("解析事件数据失败", e);
    }
  }

  eventSource2.onerror = (e) => {
    console.error('数据流连接失败:', e);
  };
};
const stopEventDataStream = () => {
  if (eventSource2) {
    eventSource2.close();
    console.log('关闭 EventSource2数据流');
  }
};


onMounted(() => {
  console.log('组件已挂载，正在启动数据流');
  startPlayerDataStream();
  // 延时1s等待后端启动数据流
  setTimeout(() => {
    // 启动视频数据流
    startStream("http://localhost:8080/stream/video0",currentFrameUrl0,frameQueue0,'0');
    startStream("http://localhost:8080/stream/video1",currentFrameUrl1,frameQueue1,'1');
    startEventDataStream()
  },1000)
});

onBeforeUnmount(() => {
  console.log('组件即将卸载，停止数据流');
  status.value = 'waiting'
  if (abortControllers['0']) {
    abortControllers['0'].abort();
    console.log("停止video0数据流")
  }
  if (abortControllers['1']) {
    abortControllers['1'].abort();
    console.log("停止video1数据流")
  }
  stopEventDataStream();
  stopPlayerDataStream();
});

</script>

<template>

  <!-- 遮罩层 -->
  <div v-if="showModal" class="modal-overlay">
    <div class="modal-content">
      <div class="image-container">
        <div>
          <h4>原始图</h4>
          <img :src="imageRaw" alt="原始图" class="preview-img" />
        </div>
        <div>
          <h4>AI解析图</h4>
          <img :src="imageAi" alt="AI解析图" class="preview-img" />
        </div>
      </div>
      <button @click="closeModal" class="close-btn">关闭</button>
    </div>
  </div>


  <div class="flex items-center ml-4 space-x-4">
    <!-- 状态指示器 -->
    <div :class="['inline-block px-4 py-2 text-white text-lg font-semibold rounded-full shadow-md', statusClass]">
      <span>{{ statusIcon }}</span>
      <span class="ml-1">{{ statusText }}</span>
    </div>
    <p class="info-title mt-2">FPS:{{fps}}</p>
    <!-- 进度条容器 -->
    <div class="relative w-[1000px] mt-2 ml-3">
      <!-- 进度条 -->
      <div class="flex items-center">
        <input
            type="range"
            min="0"
            :max="frameQueue0.length - 1"
            v-model="currentFrameIndex"
            @input="onFrameChange"
            class="w-full h-3 appearance-none cursor-pointer bg-gray-300 custom-range"
        />
        <span class="ml-4 text-sm text-gray-700 whitespace-nowrap">
      {{ absoluteFrameIndex - frameQueue0.length + Number(currentFrameIndex) + 1 }}/{{ absoluteFrameIndex }}
    </span>
      </div>

      <!-- 标注点（绘制在滑轨上方） -->
      <div class="absolute top-[-2px] left-0 w-full h-3 pointer-events-none">
        <div
            v-for="marker in visibleMarkers"
            :key="marker.frame"
            :style="{ left: marker.left }"
            class="absolute h-5 w-1 bg-red-500 rounded-sm"
        ></div>
      </div>
    </div>
  </div>

  <div class="flex flex-col h-screen p-0 bg-gray-100">
    <!-- 上部分视频区域固定高度 -->
    <div class="flex justify-start items-start gap-4 p-2 flex-shrink-0" style="height: 430px;">
      <!-- 左侧视频 -->
      <div class="left-video">
        <img
            class="w-full h-full bg-black rounded shadow"
            :src="currentFrameUrl0"
            alt="Video Stream"
        />
      </div>

      <!-- 右侧视频 -->
      <div class="right-video">
        <img
            class="w-full h-full bg-black rounded shadow"
            :src="currentFrameUrl1"
            alt="Video Stream"
        />
      </div>
    </div>




    <!-- 包裹整体的flex容器：左侧grid + 右侧文字框 -->
    <div class="player-container">
      <!-- 📊 图表或卡片区域 -->
      <div>
        <PlayerSpeedChart
            v-if="isShowingChart"
            class="player-grid"
            :playerData="currentSpeedChartData"
            :playerId="currentTrackingPlayer"
            @back="isShowingChart = false"
        />

        <div v-else class="player-grid">
          <div
              v-for="player in players"
              :key="player.person_id"
              class="player-item"
              @click="startUpdate(player.person_id)"
          >
            <PlayerCard :player="player" />
          </div>
        </div>
      </div>

      <!-- 📋 信息框 -->
      <div class="info-box">
        <div class="control-buttons">
          <button class="btn-pause" @click="toggleStream">{{ isStreaming ? '暂停' : '继续' }}</button>
          <button class="btn-prev" @click="prevFrame">后退1帧</button>
          <button class="btn-next" @click="nextFrame">前进1帧</button>
        </div>
        <div class="info-text">
          <div v-if="true" class="event-list">
            <div v-for="(log, index) in eventLogs" :key="index" class="event-card">
              <div class="event-header">
                ⏱ {{ log.time }} | 🎞 Frame {{ log.frame }}
              </div>
              <div class="event-title">
                🎯 进攻者 #{{ log.attacker }}  vs  🛡 防守者 #{{ log.defender }}
              </div>
              <ul class="obs-list">
                <li v-for="(obs, idx) in log.observations" :key="idx"
                    class="clickable"
                    @click="showImages(obs.cameraName, obs.bestFrame)">
                  📷 {{ obs.cameraName }} | 姿态差: {{ obs.poseDist }}px | 坐标差: {{ obs.coordDist }}m | 最佳帧: {{ obs.bestFrame }}
                </li>
              </ul>
              <div class="risk" :class="riskClass(log.riskLevel)">
                ⚠ 风险评估: {{ log.riskLevel }}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<style scoped>
video {
  object-fit: cover;
}

.left-video {
  width: 650px;
  height: 400px;
}

.right-video {
  width: 530px;
  height: 400px;
}

.player-item {
  min-width: 0;
}
.info-text {
  font-size: 0.875rem; /* text-sm */
  color: #1f2937; /* text-gray-800 */
  background-color: #ffffff;
  border-radius: 0.5rem; /* rounded */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1); /* shadow */
  padding: 0.5rem;
  width: 100%;
  height: 100%;
}

.info-title {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.player-container {
  display: flex;
  padding: 16px;
  background-color: #f5f5f5;
  height: 350px;
}

.player-grid {
  flex: 1; /* 占3份 */
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0;
}

.info-box {
  flex: 1; /* 占1份 */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding-left: 16px;
}

.control-buttons {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  width: 100%; /* 横向填充 */
}

.control-buttons button {
  flex: 1; /* 每个按钮等宽 */
  padding: 10px 0;
  border: none;
  border-radius: 9999px;
  color: white;
  cursor: pointer;
  text-align: center;
  font-size: 18px;
}


/* 🔴 暂停按钮：红色 */
.btn-pause {
  background-color: #e53935;
}
.btn-pause:hover {
  background-color: #c62828;
}

/* 🔵 后退按钮：蓝色 */
.btn-prev {
  background-color: #1e88e5;
}
.btn-prev:hover {
  background-color: #1565c0;
}

/* 🟢 前进按钮：绿色 */
.btn-next {
  background-color: #43a047;
}
.btn-next:hover {
  background-color: #2e7d32;
}

/* 简约风格滑轨 */
input.custom-range::-webkit-slider-runnable-track {
  height: 4px;
  background: #3b82f6; /* 单一蓝色 */
  border-radius: 0px;
}

/* 拖拽按钮：方形，不圆角 */
input.custom-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 14px;
  width: 10px;
  background-color: white;
  border: 2px solid #3b82f6;
  border-radius: 2px; /* 方形边角稍微圆润 */
  margin-top: -5px; /* 垂直居中 */
}

/* Firefox 支持 */
input.custom-range::-moz-range-track {
  height: 4px;
  background: #3b82f6;
  border-radius: 0px;
}

input.custom-range::-moz-range-thumb {
  height: 14px;
  width: 10px;
  background-color: white;
  border: 2px solid #3b82f6;
  border-radius: 2px;
}

.info-text {
  max-height: 400px; /* 限制高度 */
  overflow-y: auto; /* 垂直滚动条 */
  padding: 10px;
  background: #f9f9f9;
}

.event-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.event-card {
  background: white;
  border-radius: 8px;
  padding: 10px 15px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.1);
}

.event-header {
  font-size: 0.85rem;
  color: gray;
  margin-bottom: 4px;
}

.event-title {
  font-weight: bold;
  font-size: 1rem;
  margin-bottom: 6px;
}

.obs-list {
  list-style: none;
  padding-left: 0;
  margin-bottom: 6px;
}

.obs-list li {
  font-size: 0.9rem;
}

.risk {
  font-weight: bold;
  padding: 4px 6px;
  border-radius: 4px;
  display: inline-block;
}

.risk.high {
  background: #ffdddd;
  color: #a00;
}

.risk.medium {
  background: #fff0cc;
  color: #a60;
}

.risk.low {
  background: #ddffdd;
  color: #060;
}

.clickable {
  cursor: pointer;
  color: #007bff;
}
.clickable:hover {
  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.25s ease-out;
}

.modal-content {
  background: white;
  padding: 24px;
  border-radius: 16px;
  max-width: 90%;
  max-height: 90%;
  overflow-y: auto;
  box-shadow: 0 8px 20px rgba(0,0,0,0.3);
  animation: slideUp 0.3s ease-out;
}

.image-container {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.preview-img {
  height: 400px;           /* 统一高度 */
  max-width: 100%;         /* 防止超出容器 */
  object-fit: contain;
}

/* 动画效果 */
@keyframes fadeIn {
  from { background: rgba(0,0,0,0); }
  to { background: rgba(0,0,0,0.65); }
}

@keyframes slideUp {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.close-btn {
  background: #1e90ff; /* 天蓝色背景 */
  color: white;
  font-size: 16px;
  font-weight: bold;
  padding: 10px 20px;
  border: none;
  border-radius: 25px;  /* 圆角按钮 */
  cursor: pointer;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: all 0.2s ease-in-out;
}

.close-btn:hover {
  background: #187bcd; /* 悬停时更深的蓝色 */
  transform: scale(1.05); /* 鼠标移上去微微放大 */
}

.close-btn:active {
  transform: scale(0.97); /* 点击时轻微缩小 */
}



</style>