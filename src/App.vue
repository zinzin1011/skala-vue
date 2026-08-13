<script setup>
import { ref, watch } from 'vue'
import PracticeApp from './PracticeApp.vue'
import ExerciseApp from './ExerciseApp.vue'
import ThemeToggler from './components/exercise/ThemeToggler.vue'
import { useConfigStore } from './stores/configStore'
import { readStorage, writeStorage } from './utils/storage'

const MODE_STORAGE_KEY = 'skala-vue:mode'

// 코드를 고쳐서 화면을 바꾸던 걸 버튼으로 전환하도록 변경.
// 'exercise' = 과제, 'practice' = 실습
// 자유롭게 꾸미는 UI 쇼케이스("Final")는 이 저장소(과제 제출용) 안이 아니라 상위 폴더의
// 별도 프로젝트(../final)로 분리했다 — 채점 대상 구조를 조금도 건드리지 않기 위함.
// 새로고침하면 무조건 'exercise'(과제) 첫 화면으로 돌아가던 걸 고치기 위해 localStorage에
// 마지막으로 보던 모드를 저장해뒀다가 시작할 때 복원한다.
const mode = ref(readStorage(MODE_STORAGE_KEY, 'exercise'))
watch(mode, (value) => writeStorage(MODE_STORAGE_KEY, value))

// 다크모드는 과제5(스토어 적용) 화면 안에서만 켤 수 있었는데, 그 화면을 보고 있을 때만
// 다크모드를 켤 수 있는 건 이상해서 과제/실습 전환 버튼과 같은 위치(항상 보이는 위치)로 옮겼다.
// 상태는 여전히 configStore(Pinia)가 들고 있고, 실제 <html class="dark"> 반영도 여기서 전역으로 한다.
const configStore = useConfigStore()
watch(
  () => configStore.isDarkMode,
  (isDark) => {
    document.documentElement.classList.toggle('dark', isDark)
  },
  { immediate: true },
)
</script>

<template>
  <div class="mode-switcher">
    <button class="mode-btn" :class="{ active: mode === 'exercise' }" @click="mode = 'exercise'">
      📘 과제
    </button>
    <button class="mode-btn" :class="{ active: mode === 'practice' }" @click="mode = 'practice'">
      🧪 실습
    </button>
    <span class="mode-switcher-divider"></span>
    <ThemeToggler />
  </div>

  <PracticeApp v-if="mode === 'practice'" />
  <ExerciseApp v-else />
</template>

<style scoped>
.mode-switcher {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 1000;
  display: flex;
  gap: 4px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 999px;
  box-shadow: 0 4px 16px rgba(14, 165, 233, 0.12);
}

/* 과제/실습 버튼에만 걸리도록 전용 클래스를 쓴다. 여기서 만약 element selector로
   "button"을 그대로 썼다면, ThemeToggler의 루트 <button>에도(Vue가 부모 scope 속성을
   자식 컴포넌트의 단일 루트 엘리먼트에 그대로 붙이기 때문에) 이 규칙이 적용되어
   자기 자신의 스타일(.theme-toggle-btn)보다 우선순위가 높아지는 문제가 생긴다. */
.mode-switcher .mode-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.mode-switcher .mode-btn:hover:not(.active) {
  background: rgba(14, 165, 233, 0.12);
  color: #0369a1;
}

.mode-switcher .mode-btn.active {
  background: #0ea5e9;
  color: #fff;
}

.mode-switcher-divider {
  width: 1px;
  align-self: stretch;
  margin: 4px 2px;
  background: rgba(100, 116, 139, 0.25);
}
</style>
