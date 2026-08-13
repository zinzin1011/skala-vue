<script setup>
import { ref, computed, watch, watchEffect, onMounted } from 'vue'
// 1. 컴포넌트 파일명 국룰 표기법(PascalCase) 매칭 수입
import BaseDashboardCard from './BaseDashboardCard.vue'
import SearchBar from './SearchBar.vue'
import WeatherCard from './WeatherCard.vue'
import UnitToggler from './UnitToggler.vue'
import { fetchCurrentWeatherByCoords, CITY_LIST, CITY_COORDS } from '@/services/weatherApi'

// 위치 기반 날씨 정보: 기온(섭씨) 외 풍속·강수량·강우량·자외선지수를 실시간 API로 채운다.
// 초기값은 아직 응답이 없는 상태(null)로 두고, onMounted에서 실제 데이터로 덮어쓴다.
// 도시 목록은 WeatherHomeView/WeatherDetailView와 동일한 weatherApi의 CITY_LIST/CITY_COORDS를 공유한다.
// loadWeather가 이름이 아니라 좌표(lat/lon)로 새로고침하므로 아이템마다 위경도를 들고 다닌다.
const createEmptyWeatherList = () =>
  CITY_LIST.map((city) => ({
    ...city,
    lat: CITY_COORDS[city.name]?.lat ?? null,
    lon: CITY_COORDS[city.name]?.lon ?? null,
    admin1: '',
    tempC: null,
    status: '',
    windSpeed: null,
    precipitation: null,
    rainfall: null,
    uvIndex: null,
  }))

const weatherList = ref(createEmptyWeatherList())
const isLoading = ref(false)
const loadError = ref('')

const searchQuery = ref('')
const selectedCityInfo = ref('카드를 클릭하거나 검색해 보세요.')

// 기존 핵심 비즈니스 로직(computed, watch)의 소유권은 안전하게 부모 콘텍스트가 격리 유지
const filteredWeatherList = computed(() => {
  const query = searchQuery.value.trim()
  if (!query) return weatherList.value
  return weatherList.value.filter((item) => item.name.includes(query))
})

watch(selectedCityInfo, (newInfo) => {
  console.log(`👁️‍🗨️ [watch 감지] 상태 바 문구가 업데이트되었습니다 -> "${newInfo}"`)
})

watchEffect(() => {
  console.log(
    `🤖 [watchEffect 자동 호출] 현재 검색어 '${searchQuery.value}'에 매칭되는 API 데이터를 필터링합니다.`,
  )
})

// Open-Meteo(무료, API Key 불필요)로 현재 목록에 있는 모든 도시(기본 3곳 + 검색으로 추가한 도시)를 병렬 새로고침한다.
// Promise.all이 아니라 Promise.allSettled를 쓰는 이유: 도시 하나의 요청이 실패해도 나머지 성공한
// 도시들은 정상 반영하고, 실패한 도시만 이전(직전) 값을 그대로 유지하기 위해서다 (부분 실패 복구).
// forceRefresh: true면 weatherApi의 TTL 캐시를 건너뛰고 강제로 새 요청을 보낸다 (새로고침 버튼 전용).
const loadWeather = async ({ forceRefresh = false } = {}) => {
  isLoading.value = true
  loadError.value = ''

  const outcomes = await Promise.allSettled(
    weatherList.value.map((city) =>
      fetchCurrentWeatherByCoords(city.lat, city.lon, { forceRefresh }),
    ),
  )

  let failedCount = 0
  weatherList.value = weatherList.value.map((city, index) => {
    const outcome = outcomes[index]
    if (outcome.status === 'fulfilled') {
      return { ...city, ...outcome.value }
    }
    failedCount += 1
    console.error(`${city.name} 날씨 조회 실패:`, outcome.reason)
    return city // 실패한 도시는 직전 값을 그대로 유지 (완전히 비우지 않는다)
  })

  if (failedCount > 0) {
    loadError.value = `${failedCount}개 지역의 날씨를 새로 불러오지 못했습니다. 해당 카드는 이전 값을 표시 중입니다.`
  }

  isLoading.value = false
}

onMounted(() => loadWeather())

const showDetail = (cityName, status) => {
  window.alert(`${cityName}의 현재 날씨는 [${status}] 상태입니다.`)
}

// 지역 검색/추가 기능은 과제5(WeatherHomeView.vue)로 옮겼다. (useCityAddition 컴포저블)
// 여기 과제3에는 카드 제거(✕) 기능만 남아 있다.

// 카드의 ✕ 버튼으로 목록에서 제거한다 (기본 3개 도시도 제거 가능).
const removeCity = (cityId) => {
  weatherList.value = weatherList.value.filter((item) => item.id !== cityId)
}
</script>

<template>
  <!-- 컴포넌트 전용 클래스 이름은 exercise.css의 과제1/2 공용 클래스(.dashboard-wrapper, .status-bar, .empty-message)와
       겹치지 않도록 고유 이름을 사용한다. (겹치면 전역 스타일이 scoped 스타일 위로 새어 들어와 레이아웃이 깨진다) -->
  <div class="weather-dashboard">
    <BaseDashboardCard>
      <SearchBar :current-query="searchQuery" @update-query="(val) => (searchQuery = val)" />
    </BaseDashboardCard>

    <BaseDashboardCard>
      <div class="section-header">
        <h3>🌍 위치별 실시간 날씨</h3>
        <div class="header-actions">
          <UnitToggler />
          <!-- 다크모드 토글은 App.vue의 과제/실습 전환 버튼 옆으로 옮겨서 여기서는 제거 -->
          <button
            class="refresh-btn"
            :disabled="isLoading"
            @click="loadWeather({ forceRefresh: true })"
          >
            {{ isLoading ? '⏳ 불러오는 중' : '🔄 새로고침' }}
          </button>
        </div>
      </div>

      <p v-if="loadError" class="error-message">⚠️ {{ loadError }}</p>

      <WeatherCard
        v-for="item in filteredWeatherList"
        :key="item.id"
        :city-item="item"
        removable
        @select-card="(msg) => (selectedCityInfo = msg)"
        @click-detail="showDetail"
        @remove-card="removeCity"
      />

      <p v-if="filteredWeatherList.length === 0" class="no-match-message">
        😭 검색 결과와 일치하는 도시가 없습니다.
      </p>
    </BaseDashboardCard>

    <div class="selection-banner">
      {{ selectedCityInfo }}
    </div>
  </div>
</template>

<style scoped>
.weather-dashboard {
  width: 600px;
  margin: 40px auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
}

.weather-dashboard h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ex-text-strong);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.refresh-btn {
  padding: 5px 10px;
  background: var(--ex-panel-1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--ex-border);
  border-radius: 999px;
  color: var(--ex-accent-strong);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.refresh-btn:hover:not(:disabled) {
  background: var(--ex-input-bg-focus);
}

.refresh-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.error-message {
  margin: 0 0 12px 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(254, 226, 226, 0.5);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #b91c1c;
  font-size: 13px;
}

.no-match-message {
  text-align: center;
  color: var(--ex-text-muted);
  padding: 24px 0;
  font-size: 14px;
}

.selection-banner {
  margin-top: 4px;
  padding: 14px 18px;
  border-radius: 16px;
  background: var(--ex-panel-1);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid var(--ex-border);
  color: var(--ex-text-strong);
  font-weight: 500;
  font-size: 14px;
  text-align: center;
  box-shadow:
    0 2px 10px rgba(var(--ex-shadow-rgb), 0.06),
    inset 0 1px 0 var(--ex-highlight);
}
</style>
