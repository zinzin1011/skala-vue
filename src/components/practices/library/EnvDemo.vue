<script setup>
// Code Challenge - env (10. Vite Build & Deployment)
// Vite는 VITE_ 로 시작하는 환경변수만 클라이언트 번들에 노출한다. 빌드 시 --mode 값에 따라
// .env.staging 또는 .env.production이 로드되고, 이 값이 그대로 아래 두 상수에 주입된다.
const currentApiUrl = import.meta.env.VITE_API_URL
const currentMode = import.meta.env.VITE_APP_MODE

console.log('현재 주입된 API 서버 주소:', currentApiUrl)
console.log('현재 빌드 모드:', currentMode)
</script>

<template>
  <div class="practice-section">
    <h2>🏗️ Vite 환경 변수 (Build Mode)</h2>
    <p class="subtitle">
      <code>npm run dev</code>(기본 .env)와 <code>npm run build:staging</code> /
      <code>npm run build:production</code>을 각각 실행해 아래 값이 어떻게 바뀌는지 확인하세요.
    </p>
    <div class="result-card">
      <p>
        🏷️ 현재 빌드 모드:
        <strong>{{
          currentMode ?? '(설정 안 됨 — 기본 .env에는 VITE_APP_MODE가 없습니다)'
        }}</strong>
      </p>
      <p>
        🌐 연동 API 엔드포인트: <strong>{{ currentApiUrl ?? '(설정 안 됨)' }}</strong>
      </p>
    </div>
  </div>
</template>

<style scoped>
.subtitle {
  color: #909399;
  margin-bottom: 20px;
  font-size: 13px;
  line-height: 1.6;
}
.result-card {
  background: #f8fafc;
  padding: 15px;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  line-height: 1.8;
}
.result-card strong {
  color: #0284c7;
}
</style>
