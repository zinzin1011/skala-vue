<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const handleGoHome = () => {
  router.push('/')
}
</script>

<template>
  <div>
    <h3>ℹ️ 서비스 소개</h3>
    <hr />

    <div class="description-box">
      <p>
        본 앱은 <strong>Vue 3</strong> 및 <strong>Vue Router 4</strong> 기반 제작된 실습용 기상 관측
        대시보드 시스템입니다.
      </p>
      <ul>
        <li><code>components/exercise/</code> 폴더 내부의 독립 부품 연동</li>
        <li>클라이언트 사이드 라우팅을 통한 새로고침 없는 화면 전환</li>
        <li>URL 쿼리 스트링 매핑을 활용한 실시간 검색 상태 동기화</li>
      </ul>
    </div>

    <button @click="handleGoHome" class="home-btn">대시보드 홈으로 이동</button>
  </div>
</template>

<style scoped>
.description-box {
  background: var(--ex-panel-soft);
  padding: 12px;
  border-radius: 12px;
  line-height: 1.5;
  font-size: 14px;
  color: var(--ex-text-body);
}

ul {
  padding-left: 20px;
  margin: 8px 0 0 0;
}

li {
  margin-bottom: 6px;
  color: var(--ex-text-body);
}

code {
  background: rgba(14, 165, 233, 0.15);
  padding: 2px 4px;
  border-radius: 4px;
  color: var(--ex-accent-strong);
}

.home-btn {
  width: 100%;
  margin-top: 15px;
  padding: 10px;
  background: var(--ex-accent);
  color: white;
  border: none;
  border-radius: 999px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.18s ease;
}

.home-btn:hover {
  background: var(--ex-accent-strong);
}
</style>
