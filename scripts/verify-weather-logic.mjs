// 외부 테스트 프레임워크(Vitest 등) 없이도 핵심 로직을 검증할 수 있도록 만든 스크립트.
// axios 등 네트워크 호출이 필요한 부분은 건드리지 않고, 순수 함수만 골라 검사한다.
// 실행: node scripts/verify-weather-logic.mjs
import assert from 'node:assert/strict'
import {
  mapWeatherCodeToStatus,
  pickHourlyUvIndex,
  pickHourlyValueAt,
  coordsCacheKey,
  normalizeKoreanCityName,
  isTrustedKoreaRegionName,
  isRelevantToKeyword,
  formatTimeOfDay,
  mapPm10ToGrade,
  CITY_COORDS,
  CITY_LIST,
} from '../src/services/weatherApi.js'
import { getChosung, isChosungOnly } from '../src/utils/chosung.js'
import { pickIGa, withIGa } from '../src/utils/josa.js'
import { unixToLocalTimeOfDay } from '../src/services/openWeatherApi.js'

let passed = 0
const test = (name, fn) => {
  fn()
  passed += 1
  console.log(`  ✔ ${name}`)
}

console.log('▶ mapWeatherCodeToStatus')
test('맑음(0) 코드는 맑음으로 매핑된다', () => {
  assert.equal(mapWeatherCodeToStatus(0), '맑음')
})
test('구름 계열 코드(1~3, 45, 48)는 구름으로 매핑된다', () => {
  ;[1, 2, 3, 45, 48].forEach((code) => assert.equal(mapWeatherCodeToStatus(code), '구름'))
})
test('강수 계열 코드(51~99 대부분)는 비로 매핑된다', () => {
  ;[51, 61, 80, 95].forEach((code) => assert.equal(mapWeatherCodeToStatus(code), '비'))
})
test('눈 계열 코드(71~86)는 눈으로 매핑된다', () => {
  ;[71, 73, 85].forEach((code) => assert.equal(mapWeatherCodeToStatus(code), '눈'))
})
test('알 수 없는 코드는 구름으로 안전하게 폴백한다', () => {
  assert.equal(mapWeatherCodeToStatus(9999), '구름')
})

console.log('▶ pickHourlyUvIndex')
test('current.time과 정확히 같은 시각의 UV 지수를 찾는다', () => {
  const hourly = { time: ['2026-08-12T09:00', '2026-08-12T10:00'], uv_index: [3.1, 5.4] }
  assert.equal(pickHourlyUvIndex(hourly, '2026-08-12T10:00'), 5.4)
})
test('분 단위가 달라도 같은 시(hour)면 근사치로 찾는다', () => {
  const hourly = { time: ['2026-08-12T09:00', '2026-08-12T10:00'], uv_index: [3.1, 5.4] }
  assert.equal(pickHourlyUvIndex(hourly, '2026-08-12T10:27'), 5.4)
})
test('hourly 데이터가 없으면 null을 반환한다', () => {
  assert.equal(pickHourlyUvIndex(undefined, '2026-08-12T10:00'), null)
  assert.equal(pickHourlyUvIndex({ time: [], uv_index: [] }, '2026-08-12T10:00'), null)
})
test('일치하는 시각이 전혀 없으면 null을 반환한다', () => {
  const hourly = { time: ['2026-08-12T09:00'], uv_index: [3.1] }
  assert.equal(pickHourlyUvIndex(hourly, '2026-08-13T05:00'), null)
})

console.log('▶ pickHourlyValueAt (강수확률 등 다른 hourly 값에도 재사용하는 공용 헬퍼)')
test('key로 지정한 hourly 배열에서 값을 찾는다', () => {
  const hourly = { time: ['2026-08-12T09:00', '2026-08-12T10:00'], precipitation_probability: [10, 40] }
  assert.equal(pickHourlyValueAt(hourly, '2026-08-12T10:00', 'precipitation_probability'), 40)
})
test('pickHourlyUvIndex는 이 헬퍼에 위임해도 기존과 동일하게 동작한다', () => {
  const hourly = { time: ['2026-08-12T10:00'], uv_index: [5.4] }
  assert.equal(pickHourlyUvIndex(hourly, '2026-08-12T10:00'), pickHourlyValueAt(hourly, '2026-08-12T10:00', 'uv_index'))
})

console.log('▶ formatTimeOfDay (일출/일몰 문자열에서 시:분만 추출)')
test('ISO 시각 문자열에서 HH:mm만 잘라낸다', () => {
  assert.equal(formatTimeOfDay('2026-08-12T05:32'), '05:32')
})
test('값이 없거나 형식이 이상하면 null을 반환한다', () => {
  assert.equal(formatTimeOfDay(null), null)
  assert.equal(formatTimeOfDay(''), null)
})

console.log('▶ mapPm10ToGrade (미세먼지 등급)')
test('환경부 기준 구간대로 등급을 매긴다', () => {
  assert.equal(mapPm10ToGrade(20), '좋음')
  assert.equal(mapPm10ToGrade(80), '보통')
  assert.equal(mapPm10ToGrade(150), '나쁨')
  assert.equal(mapPm10ToGrade(200), '매우 나쁨')
})
test('값이 없으면 null을 반환한다', () => {
  assert.equal(mapPm10ToGrade(null), null)
  assert.equal(mapPm10ToGrade(undefined), null)
})

console.log('▶ coordsCacheKey (캐시 키 = 중복요청 통합의 기준)')
test('소수점 2자리로 반올림해 살짝 다른 좌표도 같은 키로 묶는다', () => {
  assert.equal(coordsCacheKey(37.56651234, 126.9779999), coordsCacheKey(37.5665, 126.978))
})
test('명확히 다른 도시는 다른 키를 갖는다', () => {
  assert.notEqual(coordsCacheKey(CITY_COORDS.서울.lat, CITY_COORDS.서울.lon), coordsCacheKey(CITY_COORDS.부산.lat, CITY_COORDS.부산.lon))
})

console.log('▶ 기본 도시 목록 무결성')
test('CITY_LIST의 모든 도시는 CITY_COORDS에 좌표가 등록돼 있다', () => {
  CITY_LIST.forEach((city) => {
    assert.ok(CITY_COORDS[city.name], `${city.name}의 좌표가 없습니다`)
  })
})
test('CITY_LIST의 id는 서로 중복되지 않는다', () => {
  const ids = CITY_LIST.map((city) => city.id)
  assert.equal(new Set(ids).size, ids.length)
})

console.log('▶ normalizeKoreanCityName (기본 목록과 검색 추가 도시 표기 통일)')
test('광역시/특별시 접미사를 제거해 기본 목록과 같은 축약 이름으로 맞춘다', () => {
  assert.equal(normalizeKoreanCityName('울산광역시', '대한민국'), '울산')
  assert.equal(normalizeKoreanCityName('부산광역시', '대한민국'), '부산')
  assert.equal(normalizeKoreanCityName('서울특별시', '대한민국'), '서울')
  assert.equal(normalizeKoreanCityName('세종특별자치시', '대한민국'), '세종')
})
test('일반 시/군/구 접미사도 제거한다', () => {
  assert.equal(normalizeKoreanCityName('수원시', '대한민국'), '수원')
  assert.equal(normalizeKoreanCityName('제주시', '대한민국'), '제주')
})
test('도(道) 단위는 접미사 제거가 아니라 관용 축약형으로 바꾼다', () => {
  assert.equal(normalizeKoreanCityName('경기도', '대한민국'), '경기')
  assert.equal(normalizeKoreanCityName('충청남도', '대한민국'), '충남') // "충청남"이 아니다
  assert.equal(normalizeKoreanCityName('전라북도', '대한민국'), '전북')
  assert.equal(normalizeKoreanCityName('강원특별자치도', '대한민국'), '강원')
})
test('"주"로 끝나는 실제 도시명은 절대 잘라내지 않는다', () => {
  // 광주/전주/청주/경주처럼 '주'가 지명 일부인 도시가 많아 일반 접미사로 취급하면 안 된다.
  assert.equal(normalizeKoreanCityName('광주', '대한민국'), '광주')
  assert.equal(normalizeKoreanCityName('전주시', '대한민국'), '전주') // '시'만 제거되고 '주'는 남는다
  assert.equal(normalizeKoreanCityName('경주시', '대한민국'), '경주')
})
test('"도"로 끝나는 실제 지명(섬 등)도 잘라내지 않는다', () => {
  assert.equal(normalizeKoreanCityName('완도', '대한민국'), '완도')
  assert.equal(normalizeKoreanCityName('거제도', '대한민국'), '거제도')
})
test('한국이 아닌 국가의 지명은 그대로 둔다', () => {
  assert.equal(normalizeKoreanCityName('Tokyo', 'Japan'), 'Tokyo')
})
test('빈 값이 들어와도 그대로 반환한다', () => {
  assert.equal(normalizeKoreanCityName('', '대한민국'), '')
  assert.equal(normalizeKoreanCityName(null, '대한민국'), null)
})

console.log('▶ isTrustedKoreaRegionName (확정된 적 없는 행정구역명 걸러내기)')
test('실제 존재하는 광역시/도는 신뢰한다', () => {
  assert.equal(isTrustedKoreaRegionName('전라남도'), true)
  assert.equal(isTrustedKoreaRegionName('서울특별시'), true)
  assert.equal(isTrustedKoreaRegionName('강원특별자치도'), true)
})
test('존재하지 않는(제안·초안 단계) 명칭은 신뢰하지 않는다', () => {
  // 여수 검색 시 Nominatim이 내려준 적 있는 비공식 명칭 — 실제로 확정된 적 없다.
  assert.equal(isTrustedKoreaRegionName('전남광주통합특별시'), false)
})
test('빈 값도 신뢰 목록에 없으므로 false다', () => {
  assert.equal(isTrustedKoreaRegionName(''), false)
})

console.log('▶ normalizeKoreanCityName — 일본까지 확장 (도쿄도 -> 도쿄)')
test('도쿄도·오사카부·교토부는 화이트리스트로 축약한다', () => {
  assert.equal(normalizeKoreanCityName('도쿄도', '일본'), '도쿄')
  assert.equal(normalizeKoreanCityName('오사카부', 'Japan'), '오사카')
  assert.equal(normalizeKoreanCityName('교토부', '일본'), '교토')
})
test('현(県) 접미사는 일반적으로 제거해도 안전하다', () => {
  assert.equal(normalizeKoreanCityName('가나가와현', '일본'), '가나가와')
  assert.equal(normalizeKoreanCityName('오키나와현', '일본'), '오키나와')
})
test('홋카이도는 절대 줄이지 않는다 (도쿄도와 같은 "도"라서 화이트리스트 밖은 건드리면 안 된다)', () => {
  assert.equal(normalizeKoreanCityName('홋카이도', '일본'), '홋카이도')
})

console.log('▶ chosung (과제5로 가져온 과제2의 초성 검색)')
test('한글 이름의 초성을 뽑아낸다', () => {
  assert.equal(getChosung('서울'), 'ㅅㅇ')
  assert.equal(getChosung('부산'), 'ㅂㅅ')
})
test('한글이 아닌 문자는 그대로 둔다', () => {
  assert.equal(getChosung('Tokyo'), 'Tokyo')
})
test('입력이 전부 초성일 때만 true를 반환한다', () => {
  assert.equal(isChosungOnly('ㅅㅇ'), true)
  assert.equal(isChosungOnly('서울'), false)
  assert.equal(isChosungOnly('Seoul'), false)
})

console.log('▶ josa (받침 유무에 맞는 이/가 선택 — "대구이" 오탈자 수정)')
test('받침 없는 이름은 "가"를 붙인다', () => {
  assert.equal(pickIGa('대구'), '가')
  assert.equal(pickIGa('제주'), '가')
  assert.equal(withIGa('대구'), '대구가')
})
test('받침 있는 이름은 "이"를 붙인다', () => {
  assert.equal(pickIGa('서울'), '이')
  assert.equal(pickIGa('부산'), '이')
  assert.equal(withIGa('서울'), '서울이')
})
test('한글이 아닌 이름은 "가"로 안전하게 폴백한다', () => {
  assert.equal(pickIGa('Tokyo'), '가')
})
test('빈 문자열도 에러 없이 처리한다', () => {
  assert.equal(pickIGa(''), '가')
})

console.log('▶ isRelevantToKeyword (검색 결과 관련성 필터 — "경주" 검색 시 "천안" 안 뜨게)')
test('검색어가 도시 이름에 포함되면 관련 있다고 본다', () => {
  assert.equal(isRelevantToKeyword('경주', '경주', '경상북도'), true)
})
test('검색어와 무관한 도시 이름은 걸러낸다', () => {
  assert.equal(isRelevantToKeyword('경주', '천안', '충청남도'), false)
})
test('검색어가 상위 행정구역명(예: 도 이름)에 포함되면 관련 있다고 본다', () => {
  assert.equal(isRelevantToKeyword('경기', '수원', '경기도'), true)
})
test('초성만 입력했으면 초성이 일치할 때만 관련 있다고 본다', () => {
  assert.equal(isRelevantToKeyword('ㄱㅈ', '경주', ''), true)
  assert.equal(isRelevantToKeyword('ㄱㅈ', '천안', ''), false)
})
test('로마자 등 비한글 검색어는 걸러내지 않는다 (Nominatim이 한글 지명으로 응답해도 통과)', () => {
  assert.equal(isRelevantToKeyword('Tokyo', '도쿄', ''), true)
})

console.log('▶ unixToLocalTimeOfDay (OpenWeatherMap 일출/일몰 — 유닉스 초 + 시간대 오프셋 → HH:mm)')
test('UTC 자정 + 9시간 오프셋(KST)이면 09:00이 된다', () => {
  assert.equal(unixToLocalTimeOfDay(0, 9 * 3600), '09:00')
})
test('오프셋이 0(UTC)이면 그대로 시:분만 뽑는다', () => {
  // 2024-01-01T05:17:00Z
  assert.equal(unixToLocalTimeOfDay(1704086220, 0), '05:17')
})
test('값이 없으면 null을 반환한다', () => {
  assert.equal(unixToLocalTimeOfDay(null, 0), null)
  assert.equal(unixToLocalTimeOfDay(undefined, 0), null)
})

console.log(`\n✅ ${passed}개 검증 통과`)
