import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', () => {
  // 1. state: 단위를 저장하는 변수 (초기값은 'celsius')
  // 값은 오직 'celsius' 또는 'fahrenheit' 두 가지만 가집니다.
  const unit = ref('celsius')

  // 2. getters: 현재 단위 상태에 맞춰 화면에 뿌릴 기호(℃ / ℉)를 실시간 리턴
  const unitSymbol = computed(() => {
    return unit.value === 'celsius' ? '℃' : '℉'
  })

  // 3. actions: 버튼 클릭 시 'celsius'와 'fahrenheit'를 토글(스위칭)하는 함수
  function toggleUnit() {
    unit.value = unit.value === 'celsius' ? 'fahrenheit' : 'celsius'
  }

  // 4. state: 다크모드 여부 (초기값은 라이트 모드)
  const isDarkMode = ref(false)

  // 5. actions: 다크모드 on/off 토글. 실제 화면 반영은 document.documentElement에
  // 'dark' 클래스를 붙이는 쪽(ExerciseApp.vue)에서 이 상태를 watch 한다.
  function toggleDarkMode() {
    isDarkMode.value = !isDarkMode.value
  }

  return {
    unit,
    unitSymbol,
    toggleUnit,
    isDarkMode,
    toggleDarkMode,
  }
})
