import axios from 'axios'
import { getChosung, isChosungOnly } from '../utils/chosung.js'

// Open-Meteo: API Key 없이 바로 호출 가능한 무료 실시간 날씨 API
// https://open-meteo.com/en/docs
const BASE_URL = 'https://api.open-meteo.com/v1/forecast'
// OpenStreetMap Nominatim: 도시 이름 검색 -> 위경도 후보 목록 (API Key 불필요)
// 원래는 Open-Meteo Geocoding(GeoNames 기반)을 사용했으나, "울산"을 검색하면 실제로는 광역시인데도
// 옛 행정구역인 "경상북도"로 표기되는 등 상위 행정구역 정보가 부정확한 사례가 발견되어
// 행정구역 데이터가 더 활발히 관리되는 OpenStreetMap 커뮤니티 데이터(Nominatim)로 교체했다.
const GEOCODING_URL = 'https://nominatim.openstreetmap.org/search'

// 대한민국의 8개 특별시·광역시·특별자치시는 그 자체가 최상위 행정구역이라 '도'가 존재하지 않는다.
// 지오코딩 공급자가 오래되었거나 부정확한 상위 행정구역을 내려주는 경우(예: 울산 -> 경상북도)를
// 대비해, 이 목록에 해당하는 도시명은 지오코딩 결과와 무관하게 정식 명칭으로 고정해 표기한다.
const KOREA_METRO_CITY_LABELS = {
  서울: '서울특별시',
  부산: '부산광역시',
  대구: '대구광역시',
  인천: '인천광역시',
  광주: '광주광역시',
  대전: '대전광역시',
  울산: '울산광역시',
  세종: '세종특별자치시',
}

const KOREA_COUNTRY_NAMES = ['대한민국', 'South Korea', '한국', 'Republic of Korea']

// 긴 접미사부터 검사해야 "특별자치시"가 "시"보다 먼저 제거된다.
// ⚠️ '도'·'주'는 여기 넣지 않는다. 완도·진도·거제도처럼 '도'로 끝나는 실제 지명,
// 광주·전주·청주·진주·나주·상주·충주·파주·여주·경주·원주처럼 '주'로 끝나는 실제 도시명이
// 대한민국에 아주 많아서, 이 두 글자를 일반 접미사로 취급해 무조건 잘라내면 그 도시들의
// 이름을 망가뜨린다(예: '광주' -> '광'). 그래서 도(道) 단위는 아래 KOREA_PROVINCE_SHORT_NAMES
// 화이트리스트로만 축약하고, 이름 전체가 정확히 일치할 때만 짧게 바꾼다.
const KOREA_ADMIN_SUFFIXES = ['특별자치시', '특별시', '광역시', '특별자치도', '시', '군', '구']

// 8개 도(道) + 제주는 접미사를 뗀 형태가 아니라 관용적인 축약형을 쓴다.
// (충청남도 -> 충남이지 "충청남"이 아니다.) 그래서 접미사 제거가 아니라 통째로 매핑한다.
// 강원/전북은 2023·2024년 특별자치도 개편 이후 명칭도 함께 둔다.
const KOREA_PROVINCE_SHORT_NAMES = {
  경기도: '경기',
  강원도: '강원',
  강원특별자치도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전라북도: '전북',
  전북특별자치도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주도: '제주',
  제주특별자치도: '제주',
}

// 대한민국의 최상위 행정구역은 8개 특별시·광역시(+세종) + 9개 도, 정확히 이만큼만 존재한다.
// Nominatim이 address.state에 "전남광주통합특별시"처럼 실제로는 확정된 적 없는 초안·제안 단계
// 명칭을 내려주는 사례가 발견됐다 — 이건 울산/경상북도처럼 '오래된 정식 명칭'이 아니라 애초에
// 존재한 적 없는 이름이라, 8개 광역시처럼 정답으로 치환할 화이트리스트를 만들 수 없다.
// 대신 이 20개(별칭 포함) 목록에 없는 값이 오면 신뢰할 수 없다고 보고 아예 표시하지 않는다.
// 틀린 정보를 보여주는 것보다, 상위 행정구역 없이 도시 이름 + 국가만 보여주는 쪽이 안전하다.
const KOREA_OFFICIAL_REGIONS = new Set([
  ...Object.values(KOREA_METRO_CITY_LABELS),
  ...Object.keys(KOREA_PROVINCE_SHORT_NAMES),
])

// regionName이 실제 존재하는 대한민국 광역 행정구역 이름인지 확인한다. searchCities에서
// 신뢰할 수 없는 값(예: "전남광주통합특별시")을 표시 전에 걸러내는 데 쓴다.
export function isTrustedKoreaRegionName(regionName) {
  return KOREA_OFFICIAL_REGIONS.has(regionName)
}

export function isKoreanCountryName(countryName) {
  return KOREA_COUNTRY_NAMES.includes(countryName)
}

const JAPAN_COUNTRY_NAMES = ['일본', 'Japan']

// 일본의 도도부현(都道府県) 중 '도(都/道)'는 도쿄(都)만 관용적으로 줄여 부르고 홋카이도(道)는
// 절대 줄여 부르지 않는데, 이 둘은 한글로 똑같이 '도'라고 적혀서 구분이 안 된다.
// '부(府)'도 오사카·교토 단 두 곳뿐이라 함께 화이트리스트로 명시한다. (전부 접미사 제거가 아니라
// 통째로 매핑 — 위 KOREA_PROVINCE_SHORT_NAMES와 같은 이유)
const JAPAN_REGION_SHORT_NAMES = {
  도쿄도: '도쿄',
  오사카부: '오사카',
  교토부: '교토',
}

// '현(県)'은 도도부현 중 나머지 43곳에만 붙는 접미사이고, '현'으로 끝나는 다른 일반 지명이
// 따로 없어(도/주와 달리 충돌 사례를 찾지 못했다) 안전하게 일반 접미사로 제거할 수 있다.
// (가나가와현 -> 가나가와, 오키나와현 -> 오키나와)
const JAPAN_ADMIN_SUFFIXES = ['현']

// 기본 목록(서울/수원/부산)은 행정구역 접미사 없이 짧은 이름으로 표기되어 있다.
// Nominatim은 "울산광역시", "수원시", "경기도"처럼 정식 행정구역명을 그대로 내려주므로, 검색으로
// 추가한 도시도 같은 규칙(짧은 이름)으로 맞춰서 카드에 서로 다른 표기가 섞이지 않도록 한다.
//
// 대한민국과 일본만 지원한다. 다른 나라까지 일반화하려면 그 나라 행정구역 명칭과 실제 지명이
// 겹치는 사례(광주/전주처럼)를 나라별로 하나하나 확인해야 하는데, 그걸 확신 없이 넓히면 엉뚱한
// 도시 이름을 잘라내는 오류가 생길 수 있어 최대한 검증 가능한 두 나라까지만 범위를 잡았다.
export function normalizeKoreanCityName(rawName, countryName) {
  if (!rawName) return rawName

  if (KOREA_COUNTRY_NAMES.includes(countryName)) {
    if (KOREA_PROVINCE_SHORT_NAMES[rawName]) {
      return KOREA_PROVINCE_SHORT_NAMES[rawName]
    }
    for (const suffix of KOREA_ADMIN_SUFFIXES) {
      if (rawName.length > suffix.length && rawName.endsWith(suffix)) {
        return rawName.slice(0, -suffix.length)
      }
    }
    return rawName
  }

  if (JAPAN_COUNTRY_NAMES.includes(countryName)) {
    if (JAPAN_REGION_SHORT_NAMES[rawName]) {
      return JAPAN_REGION_SHORT_NAMES[rawName]
    }
    for (const suffix of JAPAN_ADMIN_SUFFIXES) {
      if (rawName.length > suffix.length && rawName.endsWith(suffix)) {
        return rawName.slice(0, -suffix.length)
      }
    }
    return rawName
  }

  return rawName
}

// exercise 화면 전체(WeatherParent/WeatherHomeView/WeatherDetailView)가 공유하는 도시 목록.
// id는 router의 /weather/:cityId 및 카드 v-for의 key와 그대로 맞춘다.
export const CITY_LIST = [
  { id: 'city_01', name: '서울' },
  { id: 'city_02', name: '수원' },
  { id: 'city_03', name: '부산' },
]

export const CITY_COORDS = {
  서울: { lat: 37.5665, lon: 126.978 },
  수원: { lat: 37.2636, lon: 127.0286 },
  부산: { lat: 35.1796, lon: 129.0756 },
}

// 현재 날씨 캐시 유효 시간. 이 시간 안에 같은 좌표를 다시 조회하면 네트워크 요청 없이 캐시를 돌려준다.
// (참고 README의 "cache가 없는 새 검색만 실제 요청, 유효 cache 안에서는 0건" 전략을 반영)
export const CURRENT_WEATHER_TTL_MS = 10 * 60 * 1000 // 10분

// WMO Weather Code -> 카드가 이미 알고 있는 상태 라벨(맑음/비/구름/눈)로 축약 매핑
export function mapWeatherCodeToStatus(code) {
  if (code === 0) return '맑음'
  if ([1, 2, 3, 45, 48].includes(code)) return '구름'
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '눈'
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)) return '비'
  return '구름'
}

// hourly 배열(예: uv_index, precipitation_probability)에서 current.time과 같은 시각의 값을 찾아온다.
// current 블록에는 없고 hourly 배열로만 내려오는 값들을 꺼내 쓰기 위한 공용 헬퍼다.
export function pickHourlyValueAt(hourly, currentTime, key) {
  const times = hourly?.time ?? []
  const values = hourly?.[key] ?? []
  if (!times.length || !values.length) return null

  let index = times.indexOf(currentTime)
  if (index === -1) {
    const hourKey = currentTime?.slice(0, 13) // 'YYYY-MM-DDTHH' 단위까지만 비교
    index = times.findIndex((time) => time.startsWith(hourKey))
  }
  return index === -1 ? null : values[index]
}

// 기존 코드/테스트가 그대로 동작하도록 uv_index 전용 함수는 남겨두고 내부적으로 위 공용 헬퍼에 위임한다.
export function pickHourlyUvIndex(hourly, currentTime) {
  return pickHourlyValueAt(hourly, currentTime, 'uv_index')
}

// 'YYYY-MM-DDTHH:mm' 형식의 일출/일몰 시각 문자열에서 'HH:mm'만 뽑아낸다.
export function formatTimeOfDay(isoTimeString) {
  if (!isoTimeString || isoTimeString.length < 16) return null
  return isoTimeString.slice(11, 16)
}

// 대한민국 환경부 통합대기환경지수 기준 PM10(미세먼지) 등급.
export function mapPm10ToGrade(pm10) {
  if (pm10 === null || pm10 === undefined) return null
  if (pm10 <= 30) return '좋음'
  if (pm10 <= 80) return '보통'
  if (pm10 <= 150) return '나쁨'
  return '매우 나쁨'
}

// 캐시/중복요청 통합 키. 소수점 2자리(약 1km 오차)로 반올림해 살짝 다른 좌표도 같은 항목으로 묶는다.
export function coordsCacheKey(lat, lon) {
  return `${Number(lat).toFixed(2)},${Number(lon).toFixed(2)}`
}

// key -> { data, expiresAt } / key -> Promise
const currentWeatherCache = new Map()
const pendingCurrentWeatherRequests = new Map()

/**
 * 위경도 좌표로 실시간 기온(섭씨)·풍속·강수량·강우량·강수확률·자외선지수·습도·기압과
 * 오늘의 최고/최저 기온, 일출/일몰 시각을 조회한다. 검색으로 추가한 임의의 도시도 이 함수
 * 하나로 처리한다.
 *
 * 신뢰성/효율을 위해 두 가지를 적용한다.
 * 1) TTL 캐시: 같은 좌표를 10분 안에 다시 조회하면 네트워크 요청 없이 캐시된 값을 반환한다.
 * 2) 진행 중 요청 통합: 같은 좌표에 대한 요청이 이미 날아간 상태라면 새로 쏘지 않고 그 Promise를 공유한다.
 *    (여러 화면에서 같은 도시를 동시에 그릴 때 중복 호출을 막는다)
 *
 * Open-Meteo는 current/hourly/daily를 한 번의 요청으로 함께 내려주므로, 항목이 늘어나도
 * 요청 횟수는 그대로 1건이다.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {{ forceRefresh?: boolean }} [options] forceRefresh: true면 캐시를 무시하고 새로 요청한다 (새로고침 버튼용)
 */
export async function fetchCurrentWeatherByCoords(lat, lon, { forceRefresh = false } = {}) {
  const key = coordsCacheKey(lat, lon)
  const now = Date.now()

  if (!forceRefresh) {
    const cached = currentWeatherCache.get(key)
    if (cached && cached.expiresAt > now) {
      return cached.data
    }
    const pending = pendingCurrentWeatherRequests.get(key)
    if (pending) {
      return pending
    }
  }

  const requestPromise = (async () => {
    const { data } = await axios.get(BASE_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        current:
          'temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,rain,weather_code,surface_pressure',
        hourly: 'uv_index,precipitation_probability',
        daily: 'temperature_2m_max,temperature_2m_min,sunrise,sunset',
        timezone: 'auto',
      },
      timeout: 8000,
    })

    const current = data.current ?? {}
    const daily = data.daily ?? {}
    const uvIndex = pickHourlyValueAt(data.hourly, current.time, 'uv_index')
    const precipitationProbability = pickHourlyValueAt(
      data.hourly,
      current.time,
      'precipitation_probability',
    )

    const result = {
      tempC: Math.round(current.temperature_2m),
      status: mapWeatherCodeToStatus(current.weather_code),
      windSpeed: current.wind_speed_10m ?? 0,
      precipitation: current.precipitation ?? 0,
      rainfall: current.rain ?? 0,
      uvIndex: uvIndex ?? 0,
      humidity: current.relative_humidity_2m ?? null,
      pressure: current.surface_pressure ?? null,
      precipitationProbability: precipitationProbability ?? 0,
      dailyHighC:
        daily.temperature_2m_max?.[0] !== undefined
          ? Math.round(daily.temperature_2m_max[0])
          : null,
      dailyLowC:
        daily.temperature_2m_min?.[0] !== undefined
          ? Math.round(daily.temperature_2m_min[0])
          : null,
      sunrise: formatTimeOfDay(daily.sunrise?.[0]),
      sunset: formatTimeOfDay(daily.sunset?.[0]),
    }

    currentWeatherCache.set(key, { data: result, expiresAt: Date.now() + CURRENT_WEATHER_TTL_MS })
    return result
  })()

  pendingCurrentWeatherRequests.set(key, requestPromise)
  try {
    return await requestPromise
  } finally {
    // 성공하든 실패하든 진행 중 목록에서는 반드시 지운다. 실패 결과는 캐시에 남기지 않아
    // 다음 시도 때 다시 살아있는 값을 가져올 기회를 준다.
    pendingCurrentWeatherRequests.delete(key)
  }
}

/**
 * 기본 3개 도시(서울/수원/부산) 전용 단축 함수. CITY_COORDS에 등록된 이름만 받는다.
 * @param {'서울' | '수원' | '부산'} cityName
 * @param {{ forceRefresh?: boolean }} [options]
 */
export async function fetchCurrentWeatherByCity(cityName, options) {
  const coords = CITY_COORDS[cityName]
  if (!coords) {
    throw new Error(`등록되지 않은 도시입니다: ${cityName}`)
  }
  return fetchCurrentWeatherByCoords(coords.lat, coords.lon, options)
}

// OpenWeatherMap 무료 요금제엔 자외선지수가 없다(One Call 3.0부터는 제공하지만 별도 구독·카드
// 등록이 필요해 학습용으로는 부담). 이미 이 파일에서 검색 추가 도시용으로 자외선지수를 쓰고
// 있으니, 과제5 기본 3개 도시(openWeatherApi.js)도 이 가벼운 전용 함수로 보완한다.
// fetchCurrentWeatherByCoords 전체를 다시 부르면 안 쓰는 필드(강수량·기압 등)까지 함께 요청하게
// 되니, hourly=uv_index만 요청하는 별도 캐시/함수로 분리했다.
const uvIndexCache = new Map()
const pendingUvIndexRequests = new Map()

/**
 * 위경도 좌표의 현재 자외선지수만 조회한다 (OpenWeatherMap 조합 결과 보완용).
 * @param {number} lat
 * @param {number} lon
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {Promise<number|null>}
 */
export async function fetchUvIndexByCoords(lat, lon, { forceRefresh = false } = {}) {
  const key = coordsCacheKey(lat, lon)
  const now = Date.now()

  if (!forceRefresh) {
    const cached = uvIndexCache.get(key)
    if (cached && cached.expiresAt > now) return cached.data
    const pending = pendingUvIndexRequests.get(key)
    if (pending) return pending
  }

  const requestPromise = (async () => {
    const { data } = await axios.get(BASE_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        // pickHourlyValueAt은 "지금 몇 시인지"(current.time)를 기준으로 hourly 배열에서 값을
        // 찾는다. current 블록을 아예 안 넣으면 그 기준 시각이 없어 매칭이 항상 실패하니,
        // 변수 하나(temperature_2m)만 최소로 요청해서 current.time만 얻어온다.
        current: 'temperature_2m',
        hourly: 'uv_index',
        timezone: 'auto',
      },
      timeout: 8000,
    })

    const uvIndex = pickHourlyValueAt(data.hourly, data.current?.time, 'uv_index') ?? null
    uvIndexCache.set(key, { data: uvIndex, expiresAt: Date.now() + CURRENT_WEATHER_TTL_MS })
    return uvIndex
  })()

  pendingUvIndexRequests.set(key, requestPromise)
  try {
    return await requestPromise
  } finally {
    pendingUvIndexRequests.delete(key)
  }
}

// Open-Meteo Air Quality: 미세먼지(PM10/PM2.5) 등 대기질 정보. 날씨 API와는 별도 도메인/요청이라서,
// 과제5 카드에서 국내(대한민국) 지역에만 조건부로 호출해 불필요한 요청을 만들지 않는다.
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
export const AIR_QUALITY_TTL_MS = 10 * 60 * 1000 // 10분 (현재 날씨와 동일한 주기)

const airQualityCache = new Map()
const pendingAirQualityRequests = new Map()

/**
 * 위경도 좌표로 미세먼지(PM10)·초미세먼지(PM2.5)를 조회하고 PM10 기준 등급을 함께 반환한다.
 * fetchCurrentWeatherByCoords와 동일하게 TTL 캐시 + 진행 중 요청 통합을 적용한다.
 * @param {number} lat
 * @param {number} lon
 * @param {{ forceRefresh?: boolean }} [options]
 */
export async function fetchAirQualityByCoords(lat, lon, { forceRefresh = false } = {}) {
  const key = coordsCacheKey(lat, lon)
  const now = Date.now()

  if (!forceRefresh) {
    const cached = airQualityCache.get(key)
    if (cached && cached.expiresAt > now) {
      return cached.data
    }
    const pending = pendingAirQualityRequests.get(key)
    if (pending) {
      return pending
    }
  }

  const requestPromise = (async () => {
    const { data } = await axios.get(AIR_QUALITY_URL, {
      params: {
        latitude: lat,
        longitude: lon,
        current: 'pm10,pm2_5',
        timezone: 'auto',
      },
      timeout: 8000,
    })

    const current = data.current ?? {}
    const pm10 = current.pm10 ?? null
    const result = {
      pm10,
      pm25: current.pm2_5 ?? null,
      grade: mapPm10ToGrade(pm10),
    }

    airQualityCache.set(key, { data: result, expiresAt: Date.now() + AIR_QUALITY_TTL_MS })
    return result
  })()

  pendingAirQualityRequests.set(key, requestPromise)
  try {
    return await requestPromise
  } finally {
    pendingAirQualityRequests.delete(key)
  }
}

// 검색어 -> 검색 결과 캐시. 같은 검색어를 반복 입력해도 API를 다시 부르지 않는다.
const cityGeocodingCache = new Map()

// 완성형 한글 음절(가-힣)뿐 아니라 초성 검색에 쓰는 자모(ㄱ-ㅣ, 예: "ㄱㅈ")도 한글로 인식해야
// 초성 검색어가 "비한글"로 오분류되어 필터를 건너뛰는 일이 없다.
const HANGUL_PATTERN = /[가-힣ㄱ-ㅣ]/

/**
 * Nominatim이 내려준 후보가 실제로 검색어와 관련 있는 지명인지 확인한다.
 * "경주"를 검색했는데 지리적으로 전혀 무관한 "천안"이 함께 뜨는 것처럼, importance 점수만으로는
 * 걸러지지 않는 관련성 낮은 결과가 섞여 들어오는 경우가 있어 텍스트 기준으로 한 번 더 검증한다.
 *
 * 로마자 검색(예: "Tokyo")은 Nominatim이 accept-language=ko로 한글 지명("도쿄")을 돌려주기 때문에
 * 문자열이 서로 겹치지 않아도 정상 결과일 수 있다. 그래서 이 필터는 검색어가 한글일 때만 적용한다.
 */
export const isRelevantToKeyword = (keyword, cityName, regionName) => {
  if (!HANGUL_PATTERN.test(keyword)) return true // 로마자 등 비한글 검색어는 걸러내지 않는다

  if (isChosungOnly(keyword)) {
    return getChosung(cityName).includes(keyword)
  }

  // 처음엔 Nominatim이 내려주는 전체 주소 문자열(place.display_name)까지 비교 대상에 넣었었는데,
  // 그 값은 동/리/도로명까지 다 이어붙여 놓은 것이라 그 안 어딘가에 우연히 검색어와 같은 글자가
  // 섞여 있으면("천안시" 관할의 어느 동·도로 이름 등) 무관한 결과까지 통과시켜 버렸다
  // (실제로 "경주" 검색 시 "천안"이 함께 뜨는 원인이었다). 그래서 사용자에게 실제로 보여주는
  // 이름(cityName·regionName)만 비교 대상으로 좁혔다.
  const haystack = [cityName, regionName].filter(Boolean).join(' ')
  return haystack.includes(keyword) || keyword.includes(cityName)
}

/**
 * 도시 이름으로 위경도 후보를 검색한다 (지역 추가 검색용).
 *
 * OpenStreetMap Nominatim은 실제 매핑 커뮤니티가 지속적으로 검수하는 행정구역 데이터를 쓰기 때문에
 * "울산이 경상북도로 나온다"처럼 상위 행정구역이 틀리는 문제가 GeoNames보다 훨씬 적다. 관련도 점수
 * (importance)도 함께 내려주므로 별도의 인구 정렬 없이 그 값 기준으로 정렬한다.
 * 그래도 데이터 드리프트에 대비해 대한민국 8개 특별시·광역시는 KOREA_METRO_CITY_LABELS로 한 번 더
 * 고정 보정한다.
 * @param {string} query
 * @returns {Promise<Array<{id: string, name: string, admin1: string, country: string, lat: number, lon: number, label: string}>>}
 */
export async function searchCities(query) {
  const keyword = query.trim()
  if (!keyword) return []

  const cacheKey = keyword.toLowerCase()
  const cached = cityGeocodingCache.get(cacheKey)
  if (cached) return cached

  const { data } = await axios.get(GEOCODING_URL, {
    params: {
      q: keyword,
      format: 'jsonv2',
      addressdetails: 1,
      'accept-language': 'ko',
      limit: 8,
    },
    timeout: 8000,
    headers: {
      Accept: 'application/json',
    },
  })

  const results = Array.isArray(data) ? data : []

  // 실제 지명(도시/마을/행정구역)만 남기고, 상점·음식점 같은 일반 POI 검색 결과는 걸러낸다.
  // 필터링 결과가 0개면(공급자 응답 형태가 예상과 다를 수 있으므로) 전체 결과로 안전하게 폴백한다.
  const placeLike = results.filter(
    (place) =>
      place.class === 'place' || (place.class === 'boundary' && place.type === 'administrative'),
  )
  const pool = placeLike.length > 0 ? placeLike : results

  const sorted = [...pool].sort((a, b) => (Number(b.importance) || 0) - (Number(a.importance) || 0))

  const candidates = []
  const seen = new Set()
  for (const place of sorted) {
    const address = place.address ?? {}
    const rawCityName =
      address.city || address.town || address.village || address.county || place.name || keyword
    const countryName = address.country || ''
    // Nominatim은 "울산광역시", "수원시"처럼 정식 행정구역명을 그대로 내려준다.
    // 기본 목록(서울/수원/부산)은 접미사 없는 짧은 이름이므로, 카드 표기를 통일하기 위해
    // 짧은 이름으로 먼저 정규화한 뒤 이 이름을 기준으로 상위 행정구역을 매긴다.
    const cityName = normalizeKoreanCityName(rawCityName, countryName)
    let regionName = address.state || address.province || ''

    // 대한민국 특별시·광역시·특별자치시는 상위 '도'가 없다. 지오코딩 공급자가 옛 도 이름을
    // 내려주더라도(예: 울산 -> 경상북도) 정식 명칭으로 덮어써 신뢰도 낮은 표기를 방지한다.
    const metroLabel = KOREA_METRO_CITY_LABELS[cityName]
    if (KOREA_COUNTRY_NAMES.includes(countryName) && metroLabel) {
      regionName = metroLabel
    }

    // 위 보정을 거치고도 대한민국의 실제 17개 광역 행정구역 중 어디에도 속하지 않는 이름이면
    // (예: "전남광주통합특별시"처럼 확정된 적 없는 명칭) 신뢰할 수 없다고 보고 아예 감춘다.
    if (
      KOREA_COUNTRY_NAMES.includes(countryName) &&
      regionName &&
      !isTrustedKoreaRegionName(regionName)
    ) {
      regionName = ''
    }

    // 검색어와 무관한 결과(예: "경주" 검색 시 함께 뜨는 "천안")를 걸러낸다.
    if (!isRelevantToKeyword(keyword, cityName, regionName)) continue

    const dedupeKey = `${cityName}|${regionName}|${countryName}`
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)

    const region = [regionName, countryName].filter(Boolean).join(', ')
    candidates.push({
      id: `osm_${place.place_id}`,
      name: cityName,
      admin1: regionName,
      country: countryName,
      lat: Number(place.lat),
      lon: Number(place.lon),
      label: region ? `${cityName} (${region})` : cityName,
    })
    if (candidates.length >= 6) break
  }

  cityGeocodingCache.set(cacheKey, candidates)
  return candidates
}
