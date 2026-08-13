// 한글 이름 뒤에 붙는 주격 조사(이/가)를 받침 유무에 맞춰 골라준다.
// 받침이 있으면 '이'(예: 대전 -> 대전이), 받침이 없으면 '가'(예: 대구 -> 대구가).
export function pickIGa(word) {
  if (!word) return '가'

  const lastChar = word[word.length - 1]
  const code = lastChar.charCodeAt(0) - 0xac00

  // 완성형 한글 음절(가~힣) 범위 밖이면(영문 도시명 등) 받침을 판단할 수 없으니 '가'로 둔다.
  if (code < 0 || code > 11171) return '가'

  const hasBatchim = code % 28 !== 0
  return hasBatchim ? '이' : '가'
}

// "{이름}이 선택되었습니다" 처럼 이름 뒤에 이/가를 붙인 문자열을 바로 만들어준다.
export function withIGa(word) {
  return `${word}${pickIGa(word)}`
}
