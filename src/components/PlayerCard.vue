<template>
  <div class="player-card">
    <h5>🧍 运动员 {{ player.person_id }}</h5>
    <p>📍 坐标: {{ player.position.x.toFixed(1) }}, {{ player.position.y.toFixed(1) }}</p>
    <p>🏃 速度: {{ player.velocity.toFixed(1) }} m/s</p>
    <p>
      ⚔️ 状态:
      <span
          :class="player.state === 'ATTACK' ? 'status-attack' : player.state === 'DEFEND' ? 'status-defense' : 'status-notin'"
      >
  {{ player.state }}
      </span>
    </p>
  </div>
</template>

<script setup>
defineProps({
  player: {
    type: Object,
    required: true
  }
});
</script>

<style scoped>
.player-card {
  background-color: white;
  border-radius: 16px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border: 1px solid #d1d5db;
  padding: 16px;
  margin: 8px;
  width: 10rem;
  flex-shrink: 0;
  font-size: 14px;
}
.player-card h5 {
  font-size: 18px;
  font-weight: bold;
  color: #1f2937;
  margin-bottom: 8px;
}
.player-card p {
  color: #4b5563;
  margin-bottom: 4px;
}
.status-attack {
  color: #16a34a;
  font-weight: 600;
}
.status-defense {
  color: #dc2626;
  font-weight: 600;
}
.status-notin {
  color: #4e4d4d;
  font-weight: 600;
}
</style>
