<script setup>
import { computed } from 'vue'
import { useConfigStore } from '@/stores/configStore'
import { withIGa } from '@/utils/josa'

// 과제5 전용 카드. 과제3과 공유하는 WeatherCard.vue는 그대로 두고(과제3 화면이 깨지지 않도록),
// 요청받은 새 정보 구성(현재기온/오늘 최고·최저/강수확률·강수량/미세먼지)을 위해 이 컴포넌트를
// 새로 만들었다. 미세먼지는 처음엔 국내 지역에만 보여줬는데, 그러면 카드마다 4번째 항목이
// 국내/해외로 서로 달라져서(미세먼지 vs 습도·풍속) 통일성이 없었다. Open-Meteo Air Quality API가
// 해외 지역도 지원해서, 국내외 구분 없이 모두 미세먼지로 통일했다.
// 자외선지수·풍속·습도·기압·일출일몰처럼 자주 안 보는 정보는 여기 카드가 아니라 '상세 날씨'
// 버튼을 눌렀을 때 뜨는 모달(WeatherDetailModal.vue)에서 보여준다.
const props = defineProps({
  cityItem: {
    type: Object,
    required: true,
  },
  removable: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['select-card', 'click-detail', 'remove-card'])

const configStore = useConfigStore()

const isLoaded = computed(() => props.cityItem.tempC !== null && props.cityItem.tempC !== undefined)

const statusIcon = computed(() => {
  const icons = { 맑음: '☀️', 비: '🌧️', 구름: '☁️', 눈: '❄️' }
  return icons[props.cityItem.status] ?? '🌤️'
})

// 섭씨 숫자를 현재 단위 설정에 맞는 표시 문자열로 바꾼다. (현재기온/최고/최저 셋 다 같은 규칙 사용)
const toDisplayUnit = (celsius) => {
  if (celsius === null || celsius === undefined) return '–'
  if (configStore.unit === 'celsius') return `${celsius}${configStore.unitSymbol}`
  return `${Math.round((celsius * 9) / 5 + 32)}${configStore.unitSymbol}`
}

const displayTemp = computed(() => (isLoaded.value ? toDisplayUnit(props.cityItem.tempC) : '–'))
const displayHigh = computed(() => toDisplayUnit(props.cityItem.dailyHighC))
const displayLow = computed(() => toDisplayUnit(props.cityItem.dailyLowC))

const airGradeClass = computed(() => {
  const grade = props.cityItem.airGrade
  if (grade === '좋음') return 'air-good'
  if (grade === '보통') return 'air-mid'
  if (grade === '나쁨') return 'air-bad'
  if (grade === '매우 나쁨') return 'air-danger'
  return ''
})
</script>

<template>
  <!-- 클래스 이름은 WeatherCard.vue와 겹치지 않도록 'card5-' 접두사를 쓴다 (스타일 충돌 방지 규칙 동일) -->
  <div class="card5-tile" @click="emit('select-card', `${withIGa(cityItem.name)} 선택되었습니다.`)">
    <div class="card5-top">
      <div class="card5-place-block">
        <div class="card5-place-name-row">
          <h4 class="card5-place-name">{{ cityItem.name }}</h4>
          <span v-if="isLoaded && cityItem.tempC >= 25" class="card5-tag card5-tag-hot">더움</span>
          <span v-else-if="isLoaded" class="card5-tag card5-tag-cool">선선함</span>
        </div>
        <p class="card5-place-status">{{ statusIcon }} {{ cityItem.status || '불러오는 중' }}</p>
        <p v-if="isLoaded" class="card5-high-low">
          오늘 최고 {{ displayHigh }} · 최저 {{ displayLow }}
        </p>
      </div>
      <div class="card5-top-right">
        <button
          v-if="removable"
          class="card5-remove-btn"
          title="목록에서 삭제"
          @click.stop="emit('remove-card', cityItem.id)"
        >
          ✕
        </button>
        <div class="card5-temp-number">{{ displayTemp }}</div>
      </div>
    </div>

    <div v-if="isLoaded" class="card5-metrics-strip">
      <div class="card5-metric-col">
        <span class="card5-metric-value"
          >{{ cityItem.precipitationProbability }}<span class="card5-metric-unit">%</span></span
        >
        <span class="card5-metric-label">☔ 강수확률</span>
      </div>
      <div class="card5-metric-col">
        <span class="card5-metric-value"
          >{{ cityItem.precipitation }}<span class="card5-metric-unit">mm</span></span
        >
        <span class="card5-metric-label">🌧️ 강수량</span>
      </div>

      <!-- 국내/해외 구분 없이 모든 지역에서 동일하게 미세먼지를 보여준다 -->
      <div class="card5-metric-col">
        <span class="card5-metric-value" :class="airGradeClass">{{
          cityItem.airGrade ?? '–'
        }}</span>
        <span class="card5-metric-label">🌫️ 미세먼지</span>
      </div>
      <div class="card5-metric-col">
        <span class="card5-metric-value"
          >{{ cityItem.pm10 ?? '–' }}<span class="card5-metric-unit">㎍/m³</span></span
        >
        <span class="card5-metric-label">🏭 PM10</span>
      </div>
    </div>
    <p v-else class="card5-loading-line">⏳ 실시간 날씨 정보를 불러오는 중...</p>

    <div class="card5-footer">
      <button
        class="card5-detail-link"
        :disabled="!isLoaded"
        @click.stop="emit('click-detail', cityItem.id)"
      >
        상세 날씨 ›
      </button>
    </div>
  </div>
</template>

<style scoped>
.card5-tile {
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

.card5-tile:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(var(--ex-shadow-rgb), 0.12);
}

.card5-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card5-place-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card5-place-name {
  margin: 0;
  font-size: 17px;
  font-weight: 600;
  color: var(--ex-text-strong);
}

.card5-place-status {
  margin: 4px 0 0 0;
  font-size: 13px;
  font-weight: 400;
  color: var(--ex-text-muted);
}

.card5-high-low {
  margin: 4px 0 0 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--ex-text-faint);
}

.card5-top-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card5-temp-number {
  font-size: 40px;
  font-weight: 200;
  line-height: 1;
  color: var(--ex-text-strong);
  letter-spacing: -0.02em;
  white-space: nowrap;
}

.card5-remove-btn {
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

.card5-remove-btn:hover {
  background: rgba(220, 38, 38, 0.2);
  color: #f87171;
}

.card5-loading-line {
  margin: 14px 0 0 0;
  padding: 10px;
  text-align: center;
  font-size: 12px;
  color: var(--ex-text-muted);
  background: var(--ex-panel-1);
  border-radius: 12px;
}

.card5-metrics-strip {
  display: flex;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--ex-border-soft);
}

.card5-metric-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  text-align: center;
  border-right: 1px solid var(--ex-border-soft);
}

.card5-metric-col:last-child {
  border-right: none;
}

.card5-metric-value {
  font-size: 14px;
  font-weight: 600;
  color: var(--ex-text-strong);
}

.card5-metric-unit {
  margin-left: 2px;
  font-size: 10px;
  font-weight: 400;
  color: var(--ex-text-faint);
}

.card5-metric-label {
  font-size: 11px;
  color: var(--ex-text-muted);
}

.air-good {
  color: #16a34a;
}
.air-mid {
  color: #ca8a04;
}
.air-bad {
  color: #ea580c;
}
.air-danger {
  color: #dc2626;
}

.card5-tag {
  display: inline-block;
  padding: 2px 9px;
  font-size: 11px;
  font-weight: 600;
  border-radius: 999px;
  white-space: nowrap;
}

.card5-tag-hot {
  background: var(--ex-tag-hot-bg);
  color: var(--ex-tag-hot-text);
}

.card5-tag-cool {
  background: var(--ex-tag-cool-bg);
  color: var(--ex-tag-cool-text);
}

.card5-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.card5-detail-link {
  padding: 4px 2px;
  border: none;
  background: none;
  color: var(--ex-accent-strong);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: color 0.18s ease;
}

.card5-detail-link:hover:not(:disabled) {
  color: var(--ex-accent);
  text-decoration: underline;
}

.card5-detail-link:disabled {
  color: var(--ex-text-faint);
  cursor: not-allowed;
}
</style>
