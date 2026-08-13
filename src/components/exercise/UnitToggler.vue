<script setup>
import { useConfigStore } from '@/stores/configStore'
const configStore = useConfigStore()
</script>

<template>
  <div class="unit-toggler">
    <span class="unit-label"
      >날씨단위: <strong>{{ configStore.unit === 'celsius' ? '섭씨(℃)' : '화씨(℉)' }}</strong></span
    >
    <button @click="configStore.toggleUnit" class="toggle-btn">단위변경</button>
  </div>
</template>

<style scoped>
.unit-toggler {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.unit-label {
  font-size: 13px;
  font-weight: 400;
  color: var(--ex-text-muted);
}

.unit-label strong {
  color: var(--ex-text-strong);
  font-weight: 600;
}

.toggle-btn {
  padding: 5px 12px;
  background: var(--ex-panel-1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--ex-border);
  border-radius: 999px;
  color: var(--ex-accent-strong);
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: background 0.18s ease;
}

.toggle-btn:hover {
  background: var(--ex-input-bg-focus);
}
</style>
