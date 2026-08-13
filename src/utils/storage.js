// localStorage 접근을 한 곳에 모아서 try/catch로 감싼다. 시크릿/프라이빗 모드나 브라우저 설정에
// 따라 localStorage 접근 자체가 예외를 던질 수 있어서, 실패해도 앱이 죽지 않고 기본값으로
// 동작하도록 한다.
export function readStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw)
  } catch (error) {
    console.error(`localStorage 읽기 실패 (${key}):`, error)
    return fallback
  }
}

export function writeStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.error(`localStorage 쓰기 실패 (${key}):`, error)
  }
}
