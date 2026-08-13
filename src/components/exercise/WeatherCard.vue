<script setup>
import { computed } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import { withIGa } from '@/utils/josa'

// 1. 상위로부터 단방향 주입받을 객체 데이터 규격 검수 (매크로)
const props = defineProps({
  cityItem: {
    type: Object,
    required: true,
  },
  // 검색해서 추가한 지역만 삭제 버튼을 보여주고 싶을 때 true로 전달한다.
  removable: {
    type: Boolean,
    default: false,
  },
})

// 2. 상위로 송신할 세 가지 경로의 커스텀 이벤트 식별자 등록 (매크로)
const emit = defineEmits(['select-card', 'click-detail', 'remove-card'])

// 3. 섭씨/화씨 단위는 Store 상태를 그대로 읽어 카드 단위에서 실시간 반영
const configStore = useConfigStore()

// 5. API 응답이 도착하기 전(null)에는 로딩 중으로 간주한다.
const isLoaded = computed(() => props.cityItem.tempC !== null && props.cityItem.tempC !== undefined)

const statusIcon = computed(() => {
  const icons = { 맑음: '☀️', 비: '🌧️', 구름: '☁️', 눈: '❄️' }
  return icons[props.cityItem.status] ?? '🌤️'
})

const displayTemp = computed(() => {
  if (!isLoaded.value) return '–'
  const { tempC } = props.cityItem
  if (configStore.unit === 'celsius') {
    return `${tempC}${configStore.unitSymbol}`
  }
  const tempF = Math.round((tempC * 9) / 5 + 32)
  return `${tempF}${configStore.unitSymbol}`
})

// 4. 자외선지수는 수치 하나로는 위험도를 가늠하기 어려워 등급 라벨을 함께 계산
const uvLevel = computed(() => {
  const uv = props.cityItem.uvIndex
  if (uv === null || uv === undefined) return { label: '-', className: '' }
  if (uv >= 8) return { label: '매우 나쁨', className: 'uv-danger' }
  if (uv >= 6) return { label: '높음', className: 'uv-high' }
  if (uv >= 3) return { label: '보통', className: 'uv-mid' }
  return { label: '낮음', className: 'uv-low' }
})
</script>

<template>
  <!-- 컴포넌트 전용 클래스 이름은 exercise.css의 과제1/2 공용 클래스(.weather-card, .badge, .btn-detail 등)와
       절대 겹치지 않도록 고유 접두사를 사용한다. (겹치면 전역 스타일이 scoped 스타일 위로 새어 들어와 깨진다) -->
  <div
    class="weather-tile"
    @click="emit('select-card', `${withIGa(cityItem.name)} 선택되었습니다.`)"
  >
    <div class="tile-top">
      <div class="place-block">
        <div class="place-name-row">
          <h4 class="place-name">{{ cityItem.name }}</h4>
          <span v-if="isLoaded && cityItem.tempC >= 25" class="tag tag-hot">더움</span>
          <span v-else-if="isLoaded" class="tag tag-cool">선선함</span>
        </div>
        <p class="place-status">{{ statusIcon }} {{ cityItem.status || '불러오는 중' }}</p>
      </div>
      <div class="tile-top-right">
        <button
          v-if="removable"
          class="remove-btn"
          title="목록에서 삭제"
          @click.stop="emit('remove-card', cityItem.id)"
        >
          ✕
        </button>
        <div class="temp-number">{{ displayTemp }}</div>
      </div>
    </div>

    <div v-if="isLoaded" class="metrics-strip">
      <div class="metric-col">
        <span class="metric-value"
          >{{ cityItem.windSpeed }}<span class="metric-unit">m/s</span></span
        >
        <span class="metric-label">💨 풍속</span>
      </div>
      <div class="metric-col">
        <span class="metric-value"
          >{{ cityItem.precipitation }}<span class="metric-unit">mm</span></span
        >
        <span class="metric-label">🌧️ 강수량</span>
      </div>
      <div class="metric-col">
        <span class="metric-value">{{ cityItem.rainfall }}<span class="metric-unit">mm</span></span>
        <span class="metric-label">☔ 강우량</span>
      </div>
      <div class="metric-col">
        <span class="metric-value" :class="uvLevel.className">{{ cityItem.uvIndex }}</span>
        <span class="metric-label">🔆 {{ uvLevel.label }}</span>
      </div>
    </div>
    <p v-else class="loading-line">⏳ 실시간 날씨 정보를 불러오는 중...</p>

    <div class="tile-footer">
      <button
        class="detail-link"
        :disabled="!isLoaded"
        @click.stop="emit('click-detail', cityItem.name, cityItem.status)"
      >
        상세 날씨 ›
      </button>
    </div>
  </div>
</template>

<style scoped>
.weather-tile {
  position: relative;
  background: var(--ex-panel-2);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid var(--ex-border);
  padding: 18px 20px;
  margin-bottom: 12px;
  border-radius: 20px;
  cursor: pointer;
  box-shadow:
    0 4px 18px rgba(var(--ex-shadow-rgb), 0.07),
    inset 0 1px 0 var(--ex-highlight);
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    background 0.25s ease,
    border-color 0.25s ease;
}

.weather-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(var(--ex-shadow-rgb), 0.12);
}

.tile-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.place-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.place-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--ex-text-strong);
}

.place-status {
  margin: 4px 0 0 0;
  font-size: 13px;
  font-weight: 400;
  color: var(--ex-text-muted);
}

.tile-top-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.temp-number {
  font-size: 40px;
  font-weight: 200;
  line-height: 1;
  color: var(--ex-text-strong);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.remove-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--ex-border-soft);
  color: var(--ex-text-muted);
  border-radius: 50%;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.18s ease;
}

.remove-btn:hover {
  background: rgba(220, 38, 38, 0.2);
  color: #f87171;
}

.loading-line {
  margin: 14px 0 0 0;
  padding: 10px;
  text-align: center;
  font-size: 12px;
  color: var(--ex-text-muted);
  background: var(--ex-panel-1);
  border-radius: 12px;
}

.metrics-strip {
  display: flex;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--ex-border-soft);
}

.metric-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
  border-right: 1px solid var(--ex-border-soft);
}

.metric-col:last-child {
  border-right: none;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--ex-text-strong);
}

.metric-unit {
  margin-left: 2px;
  font-size: 10px;
  font-weight: 400;
  color: var(--ex-text-faint);
}

.metric-label {
  font-size: 11px;
  color: var(--ex-text-muted);
}

.uv-low {
  color: #16a34a;
}
.uv-mid {
  color: #ca8a04;
}
.uv-high {
  color: #ea580c;
}
.uv-danger {
  color: #dc2626;
}

.tag {
  display: inline-block;
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  white-space: nowrap;
}

.tag-hot {
  background: var(--ex-tag-hot-bg);
  color: var(--ex-tag-hot-text);
}

.tag-cool {
  background: var(--ex-tag-cool-bg);
  color: var(--ex-tag-cool-text);
}

.tile-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.detail-link {
  padding: 4px 2px;
  border: none;
  background: none;
  color: var(--ex-accent-strong);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.18s ease;
}

.detail-link:hover:not(:disabled) {
  color: var(--ex-accent);
  text-decoration: underline;
}

.detail-link:disabled {
  color: var(--ex-text-faint);
  cursor: not-allowed;
}
</style>
