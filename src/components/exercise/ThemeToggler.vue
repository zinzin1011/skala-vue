<script setup>
import { useConfigStore } from '@/stores/configStore'
const configStore = useConfigStore()
</script>

<template>
  <!-- 아이콘만으로는 지금 상태인지 누르면 바뀔 상태인지 헷갈릴 수 있어서,
       아이콘이 "현재 모드"를 그대로 나타내도록 하고 글자 라벨을 같이 붙였다. -->
  <button
    class="theme-toggle-btn"
    :title="configStore.isDarkMode ? '클릭하면 라이트 모드로 전환' : '클릭하면 다크 모드로 전환'"
    @click="configStore.toggleDarkMode"
  >
    <span class="icon">{{ configStore.isDarkMode ? '🌙' : '☀️' }}</span>
    <span class="label">{{ configStore.isDarkMode ? '다크' : '라이트' }}</span>
  </button>
</template>

<style scoped>
.theme-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 12px;
  background: var(--ex-panel-1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--ex-border);
  border-radius: 999px;
  color: var(--ex-text-strong);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  transition: background 0.18s ease;
}

.theme-toggle-btn:hover {
  background: var(--ex-input-bg-focus);
}

.icon {
  font-size: 13px;
}
</style>
