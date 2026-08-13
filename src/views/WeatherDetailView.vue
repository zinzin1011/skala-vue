<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfigStore } from '@/stores/configStore'
import { CITY_LIST } from '@/services/weatherApi'
import { fetchBaseCityWeatherOW } from '@/services/openWeatherApi'

const route = useRoute()
const router = useRouter()
const configStore = useConfigStore()

const cityName = computed(
  () => CITY_LIST.find((city) => city.id === route.params.cityId)?.name ?? null,
)

const cityData = ref(null)
const isLoading = ref(false)
const loadError = ref('')

const displayTemp = computed(() => {
  if (!cityData.value) return null
  const { tempC } = cityData.value
  if (configStore.unit === 'celsius') return `${tempC}${configStore.unitSymbol}`
  return `${Math.round((tempC * 9) / 5 + 32)}${configStore.unitSymbol}`
})

// 종합실습가이드 Day3-3: 이 라우터 블록(같은 파일)을 그대로 고쳐서 OpenWeatherMap으로
// 데이터 출처를 바꾼다. /weather/:cityId는 CITY_LIST(city_01~03)만 다루므로 항상
// fetchBaseCityWeatherOW로 조회한다 (검색으로 추가한 도시는 이 라우트로 들어오지 않는다).
const loadDetail = async () => {
  if (!cityName.value) {
    loadError.value = '등록되지 않은 지역입니다.'
    return
  }
  isLoading.value = true
  loadError.value = ''
  try {
    cityData.value = await fetchBaseCityWeatherOW(route.params.cityId)
  } catch (error) {
    console.error('실시간 상세 날씨 조회 실패:', error)
    loadError.value =
      '실시간 날씨 정보를 불러오지 못했습니다. 네트워크 상태를 확인하고 다시 시도해 주세요.'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadDetail)
</script>

<template>
  <div class="detail-container">
    <h3>📊 {{ cityName ?? '알 수 없는 지역' }} 상세 기상 관측 정보</h3>
    <hr />

    <p v-if="loadError" class="error-message">⚠️ {{ loadError }}</p>

    <div v-else-if="isLoading" class="loading-line">⏳ 실시간 날씨 정보를 불러오는 중...</div>

    <div v-else-if="cityData" class="info-card">
      <p class="temp-row">
        실시간 기온: <strong>{{ displayTemp }}</strong>
      </p>
      <p>기상 현황: {{ cityData.status }}</p>
      <p>대기 습도: {{ cityData.humidity ?? '-' }}%</p>
      <p>현재 풍속: {{ cityData.windSpeed }} m/s</p>
      <p>강수량: {{ cityData.precipitation }} mm · 강우량: {{ cityData.rainfall }} mm</p>
      <p>자외선지수: {{ cityData.uvIndex ?? '–' }}</p>
    </div>

    <button class="back-btn" @click="router.push('/')">← 메인 대시보드로 돌아가기</button>
  </div>
</template>

<style scoped>
.detail-container {
  max-width: 600px;
  margin: 0 auto;
  background: var(--ex-panel-1);
  backdrop-filter: blur(26px) saturate(160%);
  -webkit-backdrop-filter: blur(26px) saturate(160%);
  border: 1px solid var(--ex-border);
  padding: 24px;
  border-radius: 22px;
  box-shadow:
    0 4px 20px rgba(var(--ex-shadow-rgb), 0.06),
    inset 0 1px 0 var(--ex-highlight);
  color: var(--ex-text-body);
}

.detail-container h3 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--ex-text-strong);
}

.detail-container hr {
  border: none;
  border-top: 1px solid var(--ex-border-soft);
  margin: 12px 0 16px 0;
}

.loading-line {
  padding: 20px 0;
  text-align: center;
  color: var(--ex-text-muted);
  font-size: 13px;
}

.error-message {
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(254, 226, 226, 0.5);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #b91c1c;
  font-size: 13px;
}

.info-card {
  background: var(--ex-panel-soft);
  padding: 16px 18px;
  border-radius: 14px;
  margin: 0 0 16px 0;
}

.info-card p {
  margin: 6px 0;
  font-size: 14px;
  color: var(--ex-text-body);
}

.temp-row strong {
  font-size: 18px;
  color: var(--ex-accent-strong);
}

.back-btn {
  padding: 8px 16px;
  border: 1px solid var(--ex-border);
  background: var(--ex-panel-1);
  color: var(--ex-accent-strong);
  font-weight: 600;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.18s ease;
}

.back-btn:hover {
  background: var(--ex-input-bg-focus);
}
</style>
