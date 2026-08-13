<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import BaseDashboardCard from '../components/exercise/BaseDashboardCard.vue'
import SearchBar from '../components/exercise/SearchBar.vue'
import WeatherCardDetailed from '../components/exercise/WeatherCardDetailed.vue'
import WeatherDetailModal from '../components/exercise/WeatherDetailModal.vue'
import {
  fetchCurrentWeatherByCoords,
  fetchAirQualityByCoords,
  CITY_LIST,
  CITY_COORDS,
} from '@/services/weatherApi'
import { fetchBaseCityWeatherOW } from '@/services/openWeatherApi'
import { useCityAddition } from '@/composables/useCityAddition'
import { getChosung, isChosungOnly } from '@/utils/chosung'
import { readStorage, writeStorage } from '@/utils/storage'

const router = useRouter()
const route = useRoute()

// 새로고침해도 검색으로 추가해둔 지역이 사라지지 않도록 localStorage에 저장한다.
// 다만 날씨 값(tempC 등)까지 저장하면 시간이 지날수록 낡은 값을 보여주게 되니, 도시의
// '정체성'(이름·좌표 등)만 저장하고 날씨 값은 항상 새로 요청한다 — 어차피 마운트 시 loadWeather를
// 호출하므로 다시 채워진다. 저장량도 무제한으로 늘지 않도록 최대 개수를 둔다.
const ADDED_CITIES_STORAGE_KEY = 'skala-vue:addedCities'
const MAX_ADDED_CITIES = 10 // 기본 3개(서울/수원/부산) + 최대 10개 = 카드 총 13장까지
const MAX_TOTAL_CITIES = CITY_LIST.length + MAX_ADDED_CITIES

const isDefaultCity = (item) => CITY_LIST.some((city) => city.id === item.id)

// 날씨 관련 필드를 전부 null로 초기화한 객체. 기본 도시 목록과 복원된 추가 도시 둘 다
// 이 모양으로 시작해서 WeatherCardDetailed의 "불러오는 중" 판정(tempC !== null)이 똑같이 동작한다.
const createEmptyWeatherFields = () => ({
  tempC: null,
  status: '',
  windSpeed: null,
  precipitation: null,
  rainfall: null,
  precipitationProbability: null,
  uvIndex: null,
  humidity: null,
  pressure: null,
  dailyHighC: null,
  dailyLowC: null,
  sunrise: null,
  sunset: null,
  pm10: null,
  pm25: null,
  airGrade: null,
})

// WeatherParent(과제3)와 동일하게 실시간 API로 채운다.
// 예전엔 { id, name, temp, status } 형태의 정적 mock만 있었는데, WeatherCard가 기대하는
// 필드(tempC, windSpeed, precipitation, rainfall, uvIndex)가 없어 카드가 항상 "불러오는 중" 상태로 멈춰 있었다.
// 지역 검색/추가 기능을 과제3에서 여기로 옮기면서, loadWeather도 이름이 아니라 좌표(lat/lon)로
// 새로고침하도록 바꿨다. 추가된 도시는 CITY_LIST에 없어서 이름 기준으로는 새로고침할 수 없기 때문이다.
const createEmptyWeatherList = () =>
  CITY_LIST.map((city) => ({
    ...city,
    lat: CITY_COORDS[city.name]?.lat ?? null,
    lon: CITY_COORDS[city.name]?.lon ?? null,
    admin1: '',
    country: '대한민국', // 기본 3개 도시(서울/수원/부산)는 항상 국내
    ...createEmptyWeatherFields(),
  }))

// localStorage에 저장해둔 '추가 도시' 목록(정체성 정보만)을 읽어서 카드 목록에 이어붙인다.
const restoreAddedCities = () => {
  const saved = readStorage(ADDED_CITIES_STORAGE_KEY, [])
  if (!Array.isArray(saved)) return []
  return saved
    .slice(0, MAX_ADDED_CITIES)
    .map((item) => ({ ...item, ...createEmptyWeatherFields() }))
}

const weatherList = ref([...createEmptyWeatherList(), ...restoreAddedCities()])
const isLoading = ref(false)
const loadError = ref('')

const searchQuery = ref('')
const selectedCityInfo = ref('카드를 클릭하거나 검색해 보세요.')

// 지역 검색/추가 (원래 과제3 WeatherParent.vue에 있던 기능을 여기로 옮겼다)
const {
  addQuery,
  addResults,
  isSearchingCity,
  hasSearched,
  addSearchError,
  addingCityId,
  isCityAdded,
  searchForCity,
  addCityToList,
} = useCityAddition(weatherList, {
  maxCities: MAX_TOTAL_CITIES,
})

// weatherList가 바뀔 때마다(추가/삭제/새로고침) 추가 도시 목록만 뽑아서 저장한다.
// 새로고침으로 날씨 값만 바뀔 때도 호출되지만, 저장하는 건 가벼운 정체성 필드뿐이라 문제없다.
watch(
  weatherList,
  () => {
    const addedCities = weatherList.value
      .filter((item) => !isDefaultCity(item))
      .map(({ id, name, admin1, country, lat, lon }) => ({ id, name, admin1, country, lat, lon }))
    writeStorage(ADDED_CITIES_STORAGE_KEY, addedCities)
  },
  { deep: false },
)

// "지역 추가" 카드가 항상 펼쳐져 있어 화면을 너무 많이 차지하던 걸, 버튼으로 열고 닫게 바꿨다.
// 기본은 닫힘 상태다.
const isAddCityOpen = ref(false)

// 초기 마운트 시 주소창의 쿼리(?search=) 스트링 읽어서 상태 복원 (KeepAlive를 적용해야만 동작함)
onMounted(() => {
  if (route.query.search) {
    searchQuery.value = route.query.search
  }
})

// 타이핑될 때마다 주소창의 쿼리 스트링 값을 실시간 푸시 개편 (현재 큰 의미없음)
watch(searchQuery, (newQuery) => {
  router.push({
    path: route.path,
    query: { search: newQuery || undefined },
  })
})

// 과제2(WeatherComposition.vue)의 초성 검색을 그대로 가져왔다: 검색어가 초성으로만
// 이루어져 있으면(예: 'ㅅㅇ') 도시 이름의 초성과 비교하고, 아니면 기존처럼 부분 일치로 찾는다.
const filteredWeatherList = computed(() => {
  const query = searchQuery.value.trim()
  if (!query) return weatherList.value

  if (isChosungOnly(query)) {
    return weatherList.value.filter((item) => getChosung(item.name).startsWith(query))
  }
  return weatherList.value.filter((item) => item.name.includes(query))
})

// 종합실습가이드 Day3-3: "같은 라우터 블록을 계속 고칩니다. 새 블록을 만들지 않습니다." 지침에
// 따라, 기본 3개 도시(서울/수원/부산 = city_01~03)의 날씨 출처를 Open-Meteo에서 OpenWeatherMap
// 으로 바꿨다. 검색으로 추가한 도시는 계속 Open-Meteo(+Nominatim 검색)를 쓴다 — 두 API를
// 나란히 쓰는 게 정상 상태다. 자세한 배경은 openWeatherApi.js 상단 주석 참고.
//
// 처음엔 미세먼지를 국내 지역에만 조회했는데, 그러면 카드마다 4번째 항목이 국내/해외로 서로
// 달라져서(미세먼지 vs 습도·풍속) 통일성이 없다는 피드백을 반영해 전체 지역으로 넓혔다.
// Open-Meteo Air Quality API는 CAMS 전지구 모델을 함께 쓰기 때문에 해외 지역도 데이터가
// 있어서, 국내로 제한했던 건 애초에 데이터 가용성 문제가 아니라 불필요한 구분이었다.
const fetchCityWeather = async (city, { forceRefresh = false } = {}) => {
  if (isDefaultCity(city)) {
    return fetchBaseCityWeatherOW(city.id, { forceRefresh })
  }

  const current = await fetchCurrentWeatherByCoords(city.lat, city.lon, { forceRefresh })
  let airFields = {}
  try {
    const air = await fetchAirQualityByCoords(city.lat, city.lon, { forceRefresh })
    airFields = { pm10: air.pm10, pm25: air.pm25, airGrade: air.grade }
  } catch (error) {
    console.error(`${city.name} 미세먼지 조회 실패:`, error)
  }
  return { ...current, ...airFields }
}

// Promise.allSettled로 도시 하나가 실패해도 나머지는 반영하고, 실패한 도시만 직전 값을 유지한다.
// CITY_LIST가 아니라 weatherList.value를 순회해야 검색으로 추가한 도시도 새로고침된다.
const loadWeather = async ({ forceRefresh = false } = {}) => {
  isLoading.value = true
  loadError.value = ''

  const outcomes = await Promise.allSettled(
    weatherList.value.map((city) => fetchCityWeather(city, { forceRefresh })),
  )

  let failedCount = 0
  weatherList.value = weatherList.value.map((city, index) => {
    const outcome = outcomes[index]
    if (outcome.status === 'fulfilled') {
      return { ...city, ...outcome.value }
    }
    failedCount += 1
    console.error(`${city.name} 날씨 조회 실패:`, outcome.reason)
    return city
  })

  if (failedCount > 0) {
    loadError.value = `${failedCount}개 지역의 날씨를 새로 불러오지 못했습니다. 해당 카드는 이전 값을 표시 중입니다.`
  }

  isLoading.value = false
}

onMounted(() => loadWeather())

// '상세 날씨' 클릭 시 더 이상 /weather/:cityId로 이동하지 않고 모달로 보여준다.
// (라우팅 시연 자체는 nav의 RouterLink/RouterView가 여전히 담당하고, 이 라우트/뷰 파일도
// 그대로 남아 있다 — 이 카드에서만 연결을 안 할 뿐이다.)
const selectedDetailCity = ref(null)
const isDetailModalVisible = ref(false)

const openDetailModal = (id) => {
  const city = weatherList.value.find((item) => item.id === id)
  if (!city) return
  selectedDetailCity.value = city
  isDetailModalVisible.value = true
}

const closeDetailModal = () => {
  isDetailModalVisible.value = false
}

// 카드의 ✕ 버튼으로 목록에서 제거한다 (기본 3개 도시도 제거 가능). (과제3 WeatherParent.vue와 동일)
const removeCity = (cityId) => {
  weatherList.value = weatherList.value.filter((item) => item.id !== cityId)
}
</script>

<template>
  <div class="dashboard-wrapper">
    <BaseDashboardCard>
      <div class="search-card-inner">
        <SearchBar :current-query="searchQuery" @update-query="(val) => (searchQuery = val)" />
        <button
          class="add-city-toggle-btn"
          :class="{ active: isAddCityOpen }"
          @click="isAddCityOpen = !isAddCityOpen"
        >
          {{ isAddCityOpen ? '접기 ▲' : '➕ 지역 추가' }}
        </button>
      </div>
    </BaseDashboardCard>

    <BaseDashboardCard v-if="isAddCityOpen">
      <h3>➕ 지역 추가</h3>
      <form class="add-city-form" @submit.prevent="searchForCity">
        <input
          v-model="addQuery"
          type="text"
          placeholder="추가할 도시 이름 검색 (예: 제주, 오사카, Tokyo)"
        />
        <button type="submit" class="search-city-btn" :disabled="isSearchingCity">
          {{ isSearchingCity ? '검색 중…' : '검색' }}
        </button>
      </form>

      <p v-if="addSearchError" class="error-message">⚠️ {{ addSearchError }}</p>
      <p
        v-else-if="hasSearched && !isSearchingCity && addResults.length === 0"
        class="no-match-message"
      >
        검색 결과가 없습니다.
      </p>

      <ul v-if="addResults.length" class="candidate-list">
        <li v-for="candidate in addResults" :key="candidate.id" class="candidate-row">
          <span class="candidate-label">{{ candidate.label }}</span>
          <button
            class="add-btn"
            :disabled="isCityAdded(candidate) || addingCityId === candidate.id"
            @click="addCityToList(candidate)"
          >
            {{
              isCityAdded(candidate)
                ? '추가됨'
                : addingCityId === candidate.id
                  ? '추가 중…'
                  : '+ 추가'
            }}
          </button>
        </li>
      </ul>
    </BaseDashboardCard>

    <BaseDashboardCard>
      <div class="section-header">
        <h3>🏙️ 지역별 날씨 현황</h3>
        <button
          class="refresh-btn"
          :disabled="isLoading"
          @click="loadWeather({ forceRefresh: true })"
        >
          {{ isLoading ? '⏳ 불러오는 중' : '🔄 새로고침' }}
        </button>
      </div>

      <p v-if="loadError" class="error-message">⚠️ {{ loadError }}</p>

      <WeatherCardDetailed
        v-for="item in filteredWeatherList"
        :key="item.id"
        :city-item="item"
        removable
        @select-card="(msg) => (selectedCityInfo = msg)"
        @click-detail="openDetailModal(item.id)"
        @remove-card="removeCity"
      />
    </BaseDashboardCard>
    <div class="selection-banner">{{ selectedCityInfo }}</div>

    <WeatherDetailModal
      :city-item="selectedDetailCity"
      :visible="isDetailModalVisible"
      @close="closeDetailModal"
    />
  </div>
</template>

<style scoped>
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.section-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ex-text-strong);
}

.search-card-inner {
  position: relative;
}

.add-city-toggle-btn {
  position: absolute;
  top: 0;
  right: 0;
  padding: 6px 14px;
  background: var(--ex-panel-1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid var(--ex-border);
  border-radius: 999px;
  color: var(--ex-accent-strong);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.add-city-toggle-btn:hover {
  background: var(--ex-input-bg-focus);
}

.add-city-toggle-btn.active {
  background: var(--ex-accent);
  border-color: var(--ex-accent);
  color: #fff;
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

.add-city-form {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
}

.add-city-form input {
  flex: 1;
  box-sizing: border-box;
  padding: 10px 16px;
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

.add-city-form input:focus {
  background: var(--ex-input-bg-focus);
  border-color: var(--ex-accent);
}

.search-city-btn {
  padding: 8px 16px;
  border: none;
  border-radius: 999px;
  background: var(--ex-accent);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease;
  white-space: nowrap;
}

.search-city-btn:hover:not(:disabled) {
  background: var(--ex-accent-strong);
}

.search-city-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.candidate-list {
  list-style: none;
  margin: 12px 0 0 0;
  padding: 0;
}

.candidate-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 4px;
  border-top: 1px solid var(--ex-border-soft);
  font-size: 13px;
}

.candidate-row:first-child {
  border-top: none;
}

.candidate-label {
  color: var(--ex-text-body);
}

.add-btn {
  padding: 4px 12px;
  border: 1px solid rgba(14, 165, 233, 0.4);
  border-radius: 999px;
  background: var(--ex-panel-1);
  color: var(--ex-accent-strong);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.18s ease;
}

.add-btn:hover:not(:disabled) {
  background: var(--ex-accent);
  color: #fff;
}

.add-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
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
