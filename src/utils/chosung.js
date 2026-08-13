// 과제2(WeatherComposition.vue)에 있던 초성 검색 헬퍼를 과제5에서도 쓰기 위해 뽑아냈다.
// 과제2 쪽 코드는 그대로 두고(진행 단계 보존), 새로 쓰는 곳(WeatherHomeView.vue)만 여기서 가져다 쓴다.
const CHO = [
  'ㄱ',
  'ㄲ',
  'ㄴ',
  'ㄷ',
  'ㄸ',
  'ㄹ',
  'ㅁ',
  'ㅂ',
  'ㅃ',
  'ㅅ',
  'ㅆ',
  'ㅇ',
  'ㅈ',
  'ㅉ',
  'ㅊ',
  'ㅋ',
  'ㅌ',
  'ㅍ',
  'ㅎ',
]

export function getChosung(str) {
  let result = ''
  for (const ch of str) {
    const code = ch.charCodeAt(0) - 0xac00
    result += code >= 0 && code <= 11171 ? CHO[Math.floor(code / 588)] : ch
  }
  return result
}

export function isChosungOnly(str) {
  return [...str].every((ch) => CHO.includes(ch))
}
