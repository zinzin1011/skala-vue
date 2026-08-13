<script setup>
// 1. 상위로 입력 텍스트를 전달할 커스텀 이벤트 등록 (매크로)
defineEmits(['update-query'])

// 2. 상위로부터 현재 검색 상태 값을 수신 (한글 동기화 상태 유지용)
defineProps({
  currentQuery: {
    type: String,
    default: '',
  },
})
</script>

<template>
  <div class="search-inner">
    <h3>🔍 지역 날씨 검색</h3>
    <input
      type="text"
      :value="currentQuery"
      @input="$emit('update-query', $event.target.value)"
      placeholder="도시 이름으로 검색 (예: 서울, 수원, 부산)"
    />
    <p>
      검색 중인 도시: <strong>{{ currentQuery || '전체' }}</strong>
    </p>
  </div>
</template>

<style scoped>
.search-inner h3 {
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ex-text-strong);
}

.search-inner input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px 16px;
  background: var(--ex-input-bg);
  border: 1px solid var(--ex-border);
  border-radius: 999px;
  font-size: 14px;
  outline: none;
  color: var(--ex-text-body);
  transition:
    border-color 0.2s ease,
    background 0.2s ease;
}

.search-inner input::placeholder {
  color: var(--ex-text-faint);
}

.search-inner input:focus {
  background: var(--ex-input-bg-focus);
  border-color: var(--ex-accent);
}

.search-inner p {
  margin: 10px 2px 0 2px;
  font-size: 13px;
  color: var(--ex-text-muted);
}

.search-inner strong {
  color: var(--ex-accent-strong);
  font-weight: 600;
}
</style>
