import { ref } from 'vue'
import {
  searchCities,
  fetchCurrentWeatherByCoords,
  fetchAirQualityByCoords,
} from '@/services/weatherApi'

/**
 * "지역 추가" 검색 기능 (원래 과제3 WeatherParent.vue에만 있었고, 과제5 WeatherHomeView.vue로
 * 옮기면서 두 화면이 완전히 다른 컴포넌트라 코드를 그대로 복붙하는 대신 여기로 뽑아냈다).
 *
 * @param {import('vue').Ref<Array>} weatherList 검색으로 찾은 도시를 추가/중복 확인할 대상 목록.
 *   호출하는 쪽의 weatherList를 그대로 받아서 직접 읽고 쓴다(추가 시 push).
 * @param {{ maxCities?: number }} [options] maxCities: 목록 전체(기본 도시 포함) 개수 상한.
 *   localStorage에 무한정 쌓이는 걸 막기 위한 안전장치 — 초과 시 추가를 막고 안내 메시지를 띄운다.
 */
export function useCityAddition(weatherList, { maxCities = Infinity } = {}) {
  const addQuery = ref('')
  const addResults = ref([])
  const isSearchingCity = ref(false)
  const hasSearched = ref(false)
  const addSearchError = ref('')
  const addingCityId = ref(null)

  // 같은 지역(이름+상위 행정구역)이 이미 목록에 있는지 확인해 중복 추가를 막는다.
  const isCityAdded = (candidate) =>
    weatherList.value.some(
      (item) => item.name === candidate.name && (item.admin1 ?? '') === (candidate.admin1 ?? ''),
    )

  // 검색을 연달아 입력했을 때 먼저 보낸 요청이 나중에 도착해서 최신 검색 결과를 덮어쓰지 않도록
  // 요청마다 증가하는 번호(searchRequestId)를 매기고, 응답이 왔을 때 그게 여전히 최신 요청인지 확인한다.
  let searchRequestId = 0

  const searchForCity = async () => {
    const keyword = addQuery.value.trim()
    if (!keyword) return

    const requestId = ++searchRequestId
    isSearchingCity.value = true
    addSearchError.value = ''
    hasSearched.value = true
    try {
      const results = await searchCities(keyword)
      if (requestId !== searchRequestId) return // 늦게 도착한 이전 검색 결과는 버린다
      addResults.value = results
    } catch (error) {
      if (requestId !== searchRequestId) return
      console.error('도시 검색 실패:', error)
      addSearchError.value = '도시 검색에 실패했습니다. 네트워크 상태를 확인해 주세요.'
      addResults.value = []
    } finally {
      if (requestId === searchRequestId) {
        isSearchingCity.value = false
      }
    }
  }

  // 검색 후보 하나를 실제 날씨 카드로 추가한다.
  const addCityToList = async (candidate) => {
    if (isCityAdded(candidate) || addingCityId.value) return

    if (weatherList.value.length >= maxCities) {
      addSearchError.value = `지역은 최대 ${maxCities}개까지 추가할 수 있습니다. 먼저 카드를 삭제한 뒤 다시 시도해 주세요.`
      return
    }

    addingCityId.value = candidate.id
    try {
      const live = await fetchCurrentWeatherByCoords(candidate.lat, candidate.lon)

      // 국내/해외 구분 없이 모든 지역에서 미세먼지를 함께 조회한다 (카드 4번째 항목을 통일하기 위해).
      // 실패해도 도시 추가 자체는 막지 않는다 (카드에는 '–'로 표시되고, 다음 새로고침 때 다시 시도된다).
      let airQuality = {}
      try {
        const air = await fetchAirQualityByCoords(candidate.lat, candidate.lon)
        airQuality = { pm10: air.pm10, pm25: air.pm25, airGrade: air.grade }
      } catch (airError) {
        console.error(`${candidate.name} 미세먼지 조회 실패:`, airError)
      }

      weatherList.value = [
        ...weatherList.value,
        {
          id: candidate.id,
          name: candidate.name,
          admin1: candidate.admin1,
          country: candidate.country,
          lat: candidate.lat,
          lon: candidate.lon,
          ...live,
          ...airQuality,
        },
      ]
    } catch (error) {
      console.error('지역 추가 실패:', error)
      addSearchError.value = `${candidate.name} 날씨를 불러오지 못했습니다. 다시 시도해 주세요.`
    } finally {
      addingCityId.value = null
    }
  }

  return {
    addQuery,
    addResults,
    isSearchingCity,
    hasSearched,
    addSearchError,
    addingCityId,
    isCityAdded,
    searchForCity,
    addCityToList,
  }
}
