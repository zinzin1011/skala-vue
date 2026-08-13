<script setup>
import { computed, onMounted, onUnmounted } from 'vue'

// 과제5의 '상세 날씨' 버튼이 라우터로 다른 페이지에 이동하는 대신 이 모달을 띄운다.
// (라우팅 자체는 nav의 RouterLink/RouterView로 여전히 시연되므로, /weather/:cityId 라우트와
// WeatherDetailView.vue 파일은 그대로 남겨뒀다. 이 카드에서만 연결을 안 할 뿐이다.)
const props = defineProps({
  cityItem: {
    type: Object,
    default: null,
  },
  visible: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close'])

const uvLevel = computed(() => {
  const uv = props.cityItem?.uvIndex
  if (uv === null || uv === undefined) return { label: '-', className: '' }
  if (uv >= 8) return { label: '매우 나쁨', className: 'modal-uv-danger' }
  if (uv >= 6) return { label: '높음', className: 'modal-uv-high' }
  if (uv >= 3) return { label: '보통', className: 'modal-uv-mid' }
  return { label: '낮음', className: 'modal-uv-low' }
})

// 카드처럼 이모지 하나로 상태를 요약해서 헤더에 다시 보여준다 (모달만 따로 봐도 맥락이 잡히도록).
const statusIcon = computed(() => {
  const icons = { 맑음: '☀️', 비: '🌧️', 구름: '☁️', 눈: '❄️' }
  return icons[props.cityItem?.status] ?? '🌤️'
})

// 각 행을 { icon, label, value, className } 형태로 미리 만들어서 템플릿에서는 v-for로만 찍는다.
// (일출/일몰을 한 줄에 욱여넣으니 아이콘 두 개가 겹쳐 보여서 가독성이 떨어졌던 걸 각각 한 줄씩으로 분리)
const detailRows = computed(() => {
  const item = props.cityItem ?? {}
  return [
    {
      icon: '🔆',
      label: '자외선지수',
      value: item.uvIndex ?? '–',
      // eqeqeq(always) 규칙 도입 이후 느슨한 비교(!=) 대신 null/undefined를 각각 엄격 비교한다.
      suffix:
        item.uvIndex !== null && item.uvIndex !== undefined ? ` (${uvLevel.value.label})` : '',
      className: uvLevel.value.className,
    },
    { icon: '💨', label: '풍속', value: item.windSpeed ?? '–', suffix: ' m/s' },
    { icon: '💧', label: '습도', value: item.humidity ?? '–', suffix: '%' },
    { icon: '🌡️', label: '기압', value: item.pressure ?? '–', suffix: ' hPa' },
    { icon: '🌅', label: '일출', value: item.sunrise ?? '–', suffix: '' },
    { icon: '🌇', label: '일몰', value: item.sunset ?? '–', suffix: '' },
  ]
})

const closeModal = () => emit('close')

// Esc 키로도 닫을 수 있게 한다. 모달이 열려 있을 때만 리스너를 붙이는 게 아니라
// 컴포넌트가 살아있는 동안 항상 붙여두고, 핸들러 안에서 visible을 확인한다.
const handleKeydown = (event) => {
  if (event.key === 'Escape' && props.visible) closeModal()
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
</script>

<template>
  <Teleport to="body">
    <div v-if="visible && cityItem" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-panel" role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-header-title">
            <span class="modal-status-icon">{{ statusIcon }}</span>
            <div>
              <h3>{{ cityItem.name }}</h3>
              <p class="modal-subtitle">상세 날씨 · {{ cityItem.status || '–' }}</p>
            </div>
          </div>
          <button class="modal-close-btn" title="닫기" @click="closeModal">✕</button>
        </div>

        <ul class="modal-detail-list">
          <li v-for="row in detailRows" :key="row.label" class="modal-detail-row">
            <span class="modal-detail-icon">{{ row.icon }}</span>
            <span class="modal-detail-label">{{ row.label }}</span>
            <span class="modal-detail-value" :class="row.className"
              >{{ row.value }}{{ row.suffix }}</span
            >
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

.modal-panel {
  width: 100%;
  max-width: 360px;
  /* 카드에 쓰는 --ex-panel-1보다 훨씬 불투명한 --ex-modal-bg를 쓴다. 모달은 페이지 콘텐츠
     바로 위에 겹쳐 뜨기 때문에, 카드와 같은 정도의 투명도를 쓰면 뒷배경 글자가 비쳐 보인다. */
  background: var(--ex-modal-bg);
  backdrop-filter: blur(30px) saturate(160%);
  -webkit-backdrop-filter: blur(30px) saturate(160%);
  border: 1px solid var(--ex-border);
  border-radius: 22px;
  padding: 20px 22px;
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.35),
    inset 0 1px 0 var(--ex-highlight);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.modal-header-title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.modal-status-icon {
  font-size: 26px;
  line-height: 1;
}

.modal-header h3 {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  color: var(--ex-text-strong);
}

.modal-subtitle {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: var(--ex-text-muted);
}

.modal-close-btn {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: var(--ex-border-soft);
  color: var(--ex-text-muted);
  border-radius: 50%;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.18s ease;
}

.modal-close-btn:hover {
  background: rgba(220, 38, 38, 0.2);
  color: #f87171;
}

.modal-detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.modal-detail-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 12px;
  border-radius: 14px;
  /* 각 행에 카드 안의 작은 카드 느낌으로 배경을 줘서, 유리 질감은 유지하면서도
     글자와 배경의 명암 대비를 확보한다. */
  background: var(--ex-modal-row-bg);
  font-size: 14px;
}

.modal-detail-icon {
  font-size: 15px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}

.modal-detail-label {
  flex: 1;
  color: var(--ex-text-muted);
  font-weight: 500;
}

.modal-detail-value {
  font-weight: 700;
  color: var(--ex-text-strong);
  white-space: nowrap;
}

.modal-uv-low {
  color: #16a34a;
}
.modal-uv-mid {
  color: #ca8a04;
}
.modal-uv-high {
  color: #ea580c;
}
.modal-uv-danger {
  color: #dc2626;
}
</style>
