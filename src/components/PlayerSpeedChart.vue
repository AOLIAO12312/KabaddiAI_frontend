<template>
  <button @click="$emit('back')">🔙 返回</button>
  <v-chart class="chart" :option="chartOption" autoresize />
</template>

<script setup>
import {ref, onMounted, onBeforeUnmount, watch} from 'vue';
import { use } from 'echarts/core';
import VChart from 'vue-echarts';
import { LineChart } from 'echarts/charts';
import { TitleComponent, TooltipComponent, GridComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

use([LineChart, TitleComponent, TooltipComponent, GridComponent, CanvasRenderer]);

const props = defineProps({
  playerData: {
    type: Array,
    required: true
  },
  playerId:{
    type: Number,
    required: true
  }
});

const chartOption = ref({
  animation: false,
  animationDuration: 100,      // 动画只持续 200 毫秒
  animationEasing: 'linear',   // 匀速动画
  title: { text: '运动员' + props.playerId + '速度变化' },
  tooltip: {},
  xAxis: {
    type: 'category',
    name: '帧数',
  },
  yAxis: {
    type: 'value',
    name: '速度 (m/s)',
    min: 0,          // 可选：设置最小值为 0
    max: 5          // ✅ 固定最大值为 10（你可以根据你运动员的实际速度设置）
  },
  series: [
    {
      name: '速度',
      type: 'line',
      data: [],
      smooth: true,
    },
  ],
});

let intervalId = null;

// 初始化设置一次
chartOption.value.title.text = '运动员 ' + props.playerId + ' 速度';

watch(() => props.playerData, (newData) => {
  if (Array.isArray(newData)) {
    // 每个对象形如 { 115: 3.5 }
    chartOption.value.series[0].data = newData.map(obj => {
      const frameIndex = Number(Object.keys(obj)[0]);
      const velocity = parseFloat(obj[frameIndex].toFixed(2));
      return [frameIndex, velocity]; // x: 帧号, y: 速度
    });
  }
}, { immediate: true, deep: false });


// 监听 props.playerId 的变化
watch(
    () => props.playerId,
    (newId) => {
      chartOption.value.title.text = '运动员 ' + newId + ' 速度';
    }
);

onBeforeUnmount(() => {
  clearInterval(intervalId);
});
</script>


<style scoped>
.chart {
  width: 1200%;
  height: 300px;
}
</style>
