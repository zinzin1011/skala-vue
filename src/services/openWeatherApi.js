import axios from 'axios'

// Axios 챕터 실습("Hands on - Weather Axios") 요구사항 1(실제 API 데이터)·2(다른 OpenWeatherMap
// API 추가)는 과제5(WeatherHomeView.vue)의 기본 3개 도시가 Current + Forecast + Air Pollution
// 세 API를 조합해 쓰면서 이미 충족한다. 그래서 한때 별도 "과제6" 화면(WeatherAxiosPractice.vue +
// openWeatherStore.js)으로 따로 만들었던 걸 지웠다 — 종합실습가이드 Day3-3의 "같은 라우터 블록을
// 계속 고칩니다. 새 블록을 만들지 않습니다" 지침과도 맞고, 실습 모드의 AxiosWeather.vue와도 중복이었다.
//
// Vite는 `import.meta.env.VITE_*` 로 선언된 변수만 클라이언트 번들에 노출한다.
// API 키를 소스코드에 직접 박아 넣으면 이 프로젝트를 Public GitHub 저장소에 그대로 제출할 때
// 키가 함께 공개돼 버리므로, .env 파일(커밋 제외 대상)에 넣고 여기서는 값만 읽어 쓴다.
// import.meta.env는 Vite가 주입하는 객체라, 이 파일을 순수 Node(예: 검증 스크립트)에서
// import하면 import.meta.env 자체가 undefined다. 옵셔널 체이닝으로 방어해 모듈 로드 자체는
// 항상 성공하게 하고, 실제 키 부재는 API 호출 시점에 assertApiKey()가 잡는다.
const API_KEY = import.meta.env?.VITE_OPENWEATHER_API_KEY
const BASE_URL = 'https://api.openweathermap.org/data/2.5'

function assertApiKey() {
  if (!API_KEY) {
    throw new Error(
      'VITE_OPENWEATHER_API_KEY가 설정되지 않았습니다. 프로젝트 루트에 .env 파일을 만들고 키를 넣어 주세요.',
    )
  }
}

// =====================================================================================
// 과제5(WeatherHomeView.vue / WeatherDetailView.vue) 기본 3개 도시 데이터 소스 교체
//
// 종합실습가이드 Day3-3 "Axios — 가짜 데이터를 실제 API로 교체하기": "같은 라우터 블록을
// 계속 고칩니다. 새 블록을 만들지 않습니다." 지침에 따라, 새 화면을 만드는 대신 이미 있는
// 과제5 라우터 블록의 데이터 출처 자체를 OpenWeatherMap으로 바꾼다.
//
// 다만 가이드가 상정하는 WeatherHomeView.vue는 도시 3건을 손으로 적어둔 아주 단순한 버전이고,
// 우리 프로젝트는 이미 검색으로 도시를 추가하는 기능·초성 검색·미세먼지·최고최저·강수확률 등을
// 갖춘 훨씬 앞선 상태다. 그래서 가이드를 문자 그대로 베끼지 않고, "기본 3개 도시(서울/수원/부산)의
// 실시간 날씨 출처만 Open-Meteo에서 OpenWeatherMap으로 바꾸고, 검색으로 추가한 도시나 나머지
// 기능(검색·삭제·모달 등)은 그대로 둔다"로 범위를 좁혀 적용했다.
// =====================================================================================

// city_01/02/03의 영문명(OpenWeatherMap 조회용)과 좌표(대기질 조회용).
// weatherApi.js의 CITY_COORDS와 같은 좌표값이지만, 이 모듈이 weatherApi.js에 의존하지 않도록
// (순환참조 방지 + 두 API 모듈의 독립성 유지) 여기 별도로 둔다.
const BASE_CITY_OW_IDENTITY = {
  city_01: { english: 'Seoul', lat: 37.5665, lon: 126.978 },
  city_02: { english: 'Suwon', lat: 37.2636, lon: 127.0286 },
  city_03: { english: 'Busan', lat: 35.1796, lon: 129.0756 },
}

// Open-Meteo 경로(weatherApi.js)와 동일하게 10분 TTL 캐시 + 진행 중 요청 통합을 적용해
// OpenWeatherMap 무료 요금제 호출 한도(분당 60건)를 아껴 쓴다.
const OW_COMBO_TTL_MS = 10 * 60 * 1000
const owComboCache = new Map() // cityId -> { data, expiresAt }
const owComboPending = new Map() // cityId -> Promise

// OpenWeatherMap의 sys.sunrise/sunset은 UTC 유닉스 초 단위라, 그 도시의 시간대 오프셋(timezone,
// 초 단위)을 더한 뒤 UTC 기준으로 시:분만 뽑아내면 "그 도시 기준 로컬 시각"이 된다.
export function unixToLocalTimeOfDay(unixSeconds, timezoneOffsetSeconds) {
  if (unixSeconds === null || unixSeconds === undefined) return null
  const localMs = (unixSeconds + (timezoneOffsetSeconds ?? 0)) * 1000
  const date = new Date(localMs)
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

// Current Weather API에서 카드/모달이 바로 쓸 수 있는 필드로 매핑한다.
// precipitation/rainfall은 Open-Meteo처럼 "지금 이 순간"의 강수량(mm) 개념이라 rain['1h']를 쓴다.
async function fetchCurrentWeatherOWRaw(cityName) {
  assertApiKey()
  const { data } = await axios.get(`${BASE_URL}/weather`, {
    params: { q: cityName, appid: API_KEY, units: 'metric', lang: 'kr' },
    timeout: 8000,
  })

  const currentRain = data.rain?.['1h'] ?? 0

  return {
    tempC: data.main?.temp !== undefined ? Math.round(data.main.temp) : null,
    status: data.weather?.[0]?.description ?? '',
    windSpeed: data.wind?.speed ?? null,
    humidity: data.main?.humidity ?? null,
    pressure: data.main?.pressure ?? null,
    precipitation: currentRain,
    rainfall: currentRain, // OpenWeatherMap은 Open-Meteo만큼 강수/강우를 세밀하게 구분해 주지 않아 같은 값을 재사용한다.
    sunrise: unixToLocalTimeOfDay(data.sys?.sunrise, data.timezone),
    sunset: unixToLocalTimeOfDay(data.sys?.sunset, data.timezone),
  }
}

// 무료 요금제엔 진짜 "일별" 예보가 없어서, 지금부터 24시간(3시간 간격 8구간)의 최고/최저 기온과
// 강수확률(pop) 최댓값으로 "오늘" 값을 근사한다. dailyHighC/dailyLowC/precipitationProbability만
// 반환하고, Current 값과 겹치는 필드는 만들지 않는다.
async function fetchTodayForecastSummaryOW(cityName) {
  assertApiKey()
  const { data } = await axios.get(`${BASE_URL}/forecast`, {
    params: { q: cityName, appid: API_KEY, units: 'metric', lang: 'kr' },
    timeout: 8000,
  })

  const upcoming = (data.list ?? []).slice(0, 8)
  if (upcoming.length === 0) {
    return { dailyHighC: null, dailyLowC: null, precipitationProbability: null }
  }

  const temps = upcoming.map((entry) => entry.main?.temp).filter((value) => value !== undefined)
  const pops = upcoming.map((entry) => entry.pop ?? 0) // pop: 0~1 사이 강수확률

  return {
    dailyHighC: temps.length > 0 ? Math.round(Math.max(...temps)) : null,
    dailyLowC: temps.length > 0 ? Math.round(Math.min(...temps)) : null,
    precipitationProbability: Math.round(Math.max(...pops) * 100),
  }
}

// OpenWeatherMap Air Pollution API — 위경도 기준 미세먼지. mapPm10ToGrade는 weatherApi.js와
// 동일한 등급 기준(대한민국 환경부)을 그대로 쓰기 위해 호출부에서 주입받는다.
async function fetchAirPollutionOW(lat, lon, mapPm10ToGrade) {
  assertApiKey()
  const { data } = await axios.get(`${BASE_URL}/air_pollution`, {
    params: { lat, lon, appid: API_KEY },
    timeout: 8000,
  })

  const components = data.list?.[0]?.components ?? {}
  const pm10 = components.pm10 ?? null
  return {
    pm10,
    pm25: components.pm2_5 ?? null,
    airGrade: mapPm10ToGrade(pm10),
  }
}

/**
 * 기본 3개 도시(city_01/02/03) 전용: Current + Forecast + Air Pollution 세 API를 묶어
 * WeatherCardDetailed·WeatherDetailModal·WeatherDetailView가 기대하는 필드 모양으로 반환한다.
 *
 * 자외선지수(uvIndex)는 OpenWeatherMap 무료 요금제에 없어서, 이미 검색 추가 도시에 쓰고 있는
 * Open-Meteo(키 불필요)를 이 필드에만 보완적으로 함께 호출한다. 이 호출도 실패하면 null로 두고
 * (카드/모달은 null을 '–'로 안전하게 표시한다) 나머지 데이터는 그대로 살린다.
 *
 * Current 조회가 실패하면 그대로 예외를 던져 호출부(WeatherHomeView.vue)가 이 카드를 "실패"로
 * 표시하게 한다. Forecast/Air Pollution은 보조 정보라, 실패해도 Current 결과는 살리고 해당
 * 필드만 비워둔다 (Open-Meteo 경로에서 미세먼지 실패를 다루는 방식과 동일한 원칙).
 *
 * @param {'city_01'|'city_02'|'city_03'} cityId
 * @param {{ forceRefresh?: boolean }} [options]
 */
export async function fetchBaseCityWeatherOW(cityId, { forceRefresh = false } = {}) {
  const identity = BASE_CITY_OW_IDENTITY[cityId]
  if (!identity) {
    throw new Error(`OpenWeatherMap 연동 대상이 아닌 도시 ID입니다: ${cityId}`)
  }

  if (!forceRefresh) {
    const cached = owComboCache.get(cityId)
    if (cached && cached.expiresAt > Date.now()) return cached.data
    const pending = owComboPending.get(cityId)
    if (pending) return pending
  }

  const requestPromise = (async () => {
    // mapPm10ToGrade·fetchUvIndexByCoords를 필요한 시점에만 동적 import해서, 이 모듈이
    // weatherApi.js를 정적으로 import하지 않게 한다 (실제 순환참조는 없지만, 두 API 모듈을
    // 서로 독립적으로 유지한다는 원칙을 지키기 위함).
    const { mapPm10ToGrade, fetchUvIndexByCoords } = await import('./weatherApi.js')

    const current = await fetchCurrentWeatherOWRaw(identity.english)

    let forecastFields = { dailyHighC: null, dailyLowC: null, precipitationProbability: null }
    try {
      forecastFields = await fetchTodayForecastSummaryOW(identity.english)
    } catch (error) {
      console.error(`${identity.english} 예보 조회 실패:`, error)
    }

    let airFields = { pm10: null, pm25: null, airGrade: null }
    try {
      airFields = await fetchAirPollutionOW(identity.lat, identity.lon, mapPm10ToGrade)
    } catch (error) {
      console.error(`${identity.english} 대기질 조회 실패:`, error)
    }

    let uvIndex = null
    try {
      uvIndex = await fetchUvIndexByCoords(identity.lat, identity.lon, { forceRefresh })
    } catch (error) {
      console.error(`${identity.english} 자외선지수 조회 실패(Open-Meteo):`, error)
    }

    const result = {
      ...current,
      ...forecastFields,
      ...airFields,
      uvIndex,
    }

    owComboCache.set(cityId, { data: result, expiresAt: Date.now() + OW_COMBO_TTL_MS })
    return result
  })()

  owComboPending.set(cityId, requestPromise)
  try {
    return await requestPromise
  } finally {
    owComboPending.delete(cityId)
  }
}
