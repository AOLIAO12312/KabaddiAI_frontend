<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">关键帧簇列表</h1>
    <table class="w-full table-auto border-collapse">
      <thead>
      <tr class="bg-gray-200">
        <th class="p-2">簇编号</th>
        <th class="p-2">帧范围</th>
        <th class="p-2">包含帧数</th>
        <th class="p-2">操作</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="cluster in clusters" :key="cluster.id" class="hover:bg-gray-100">
        <td class="p-2">{{ cluster.id }}</td>
        <td class="p-2">{{ cluster.start_frame }} - {{ cluster.end_frame }}</td>
        <td class="p-2">{{ cluster.frame_count }}</td>
        <td class="p-2">
          <router-link :to="`/cluster/${cluster.id}`" class="text-blue-600 underline">
            查看详情
          </router-link>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'


const clusters = ref([
  { id: 1, start_frame: 1, end_frame: 100, frame_count: 100 },
  { id: 2, start_frame: 101, end_frame: 250, frame_count: 150 },
  { id: 3, start_frame: 251, end_frame: 400, frame_count: 150 },
  { id: 4, start_frame: 401, end_frame: 600, frame_count: 200 },
  { id: 5, start_frame: 601, end_frame: 700, frame_count: 100 }
])

// onMounted(async () => {
//   const res = await axios.get('/api/cluster/list')
//   clusters.value = res.data
// })
</script>
