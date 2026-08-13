<script setup>
import { ref, watch } from 'vue'
import WeatherMockup from './components/exercise/WeatherMockup.vue'
import WeatherComposition from './components/exercise/WeatherComposition.vue'
import WeatherParent from './components/exercise/WeatherParent.vue'
import UnitToggler from './components/exercise/UnitToggler.vue'
import { readStorage, writeStorage } from './utils/storage'

const TASK_STORAGE_KEY = 'skala-vue:selectedTask'

// 다크모드 토글(ThemeToggler)과 실제 <html class="dark"> 반영 로직은 App.vue로 옮겼다.
// 과제5 화면에서만 켜지는 게 아니라 과제/실습 전환 버튼 옆에서 언제나 켤 수 있어야 하기 때문.

// 과제 1~5를 아코디언으로 여러 개 펼쳐두는 대신, 드롭다운으로 하나만 골라서 그 화면만 보이게 한다.
// 가이드 1.1절 "과제3-1과의 관계": 과제5는 새 블록을 만들지 않고, 과제3-1(=과제4, 라우터 적용)
// 블록을 그대로 고쳐서 만든다. 그래서 과제4는 별도 항목으로 남기지 않고, 그 블록 자체가
// 아래에서 "과제 5: 스토어 적용" 타이틀로 UnitToggler까지 얹은 상태로 존재한다.
const TASKS = [
  { id: 'task1', label: '과제 1: 날씨 (Mockup)' },
  { id: 'task2', label: '과제 2: 날씨 (컴포지션)' },
  { id: 'task3', label: '과제 3: 날씨 (컴포넌트)' },
  { id: 'task5', label: '과제 5: 스토어 적용 (라우터 + 스토어)' },
]
// 과제6(Axios × OpenWeatherMap 별도 화면)은 한때 여기 있었지만, 종합실습가이드 Day3-3
// "같은 라우터 블록을 계속 고칩니다. 새 블록을 만들지 않습니다" 지침에 따라 과제5(위 블록)에
// OpenWeatherMap을 직접 병합하면서 요구사항을 이미 충족해 제거했다. 실습 모드의 AxiosWeather.vue와도
// 중복이었다.
// 새로고침하면 무조건 과제1(Mockup)로 돌아가던 걸 고치기 위해 마지막으로 보던 과제를
// localStorage에 저장해뒀다가 복원한다. 저장된 값이 더 이상 존재하지 않는 과제(예전 'task4' 등)면
// 안전하게 기본값(task1)으로 되돌아간다.
const savedTask = readStorage(TASK_STORAGE_KEY, 'task1')
const selectedTask = ref(TASKS.some((task) => task.id === savedTask) ? savedTask : 'task1')
watch(selectedTask, (value) => writeStorage(TASK_STORAGE_KEY, value))

// v-if 대신 v-show를 쓴다. v-if는 선택이 바뀔 때마다 컴포넌트를 언마운트/재마운트해서
// WeatherParent(과제3) 같은 화면이 다른 과제를 보다가 돌아올 때마다 실시간 API를 다시 호출하고
// 검색으로 추가해둔 지역도 사라진다. v-show는 화면에서만 숨기고(display:none) 마운트는 유지한다.
</script>

<template>
  <div class="task-picker-bar">
    <label for="task-picker" class="task-picker-label">📂 과제 선택</label>
    <select id="task-picker" v-model="selectedTask" class="task-picker">
      <option v-for="task in TASKS" :key="task.id" :value="task.id">{{ task.label }}</option>
    </select>
  </div>

  <div class="app-container" v-show="selectedTask === 'task1'">
    <h1>⛅ 과제 1: 날씨 (Mockup)</h1>
    <hr />
    <WeatherMockup />
  </div>
  <div class="app-container" v-show="selectedTask === 'task2'">
    <h1>⛅ 과제 2: 날씨 (컴포지션)</h1>
    <hr />
    <WeatherComposition />
  </div>
  <div class="app-container" v-show="selectedTask === 'task3'">
    <h1>⛅ 과제 3: 날씨 (컴포넌트)</h1>
    <hr />
    <WeatherParent />
  </div>
  <div class="app-container" v-show="selectedTask === 'task5'">
    <h1>⛅ 과제 5: 스토어 적용</h1>
    <!-- 이 블록 하나에 실습 ④~⑨가 누적돼 있다는 걸 화면에서도 알 수 있게 적어둔다.
         제목만 보면 스토어만 적용한 것처럼 보이지만, 실제로는 라우터와 실시간 API 연동까지
         같은 블록을 계속 고쳐서 만든 결과물이다. -->
    <p class="task-note">
      <strong>라우터(④)</strong> · <strong>스토어(⑤)</strong> ·
      <strong>Axios 실시간 API(⑥~⑨)</strong>를 한 블록에 누적했습니다.
      <span class="task-note-sub">종합실습가이드 지침에 따라 새 블록을 만들지 않고 같은 화면을 계속 확장했습니다.</span>
    </p>
    <hr />
    <div class="dashboard-wrapper">
      <nav class="navigation-bar">
        <RouterLink to="/" class="nav-item">🌦️ 날씨 대시보드</RouterLink>
        <span class="divider">|</span>
        <RouterLink to="/about" class="nav-item">ℹ️ 서비스 소개</RouterLink>
        <UnitToggler />
      </nav>
      <main>
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style>
/* ⚠️ 외부 스타일 파일(예: 버튼 디자인 뭉치)을 이 방 안으로 쏙 가리켜 가져옵니다 */
@import '@/assets/exercise.css';
</style>
