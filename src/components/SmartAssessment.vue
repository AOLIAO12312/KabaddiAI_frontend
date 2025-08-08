<template>
  <div class="bg-gray-100 p-4 rounded shadow">
    <h3 class="font-semibold mb-2">AI 智能评估</h3>
    <p>评分: <span class="font-bold">{{ assessment.score }}</span></p>
    <p>建议: {{ assessment.suggestion }}</p>
    <p>标签: {{ assessment.tags.join(', ') }}</p>
  </div>
</template>

<script setup>
defineProps({ assessment: Object })
</script>
