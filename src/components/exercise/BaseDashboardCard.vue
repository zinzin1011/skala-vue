<template>
  <div class="base-dashboard-card">
    <slot></slot>
  </div>
</template>

<style scoped>
.base-dashboard-card {
  background: var(--ex-panel-1);
  backdrop-filter: blur(26px) saturate(160%);
  -webkit-backdrop-filter: blur(26px) saturate(160%);
  padding: 22px;
  border-radius: 22px;
  margin-bottom: 16px;
  border: 1px solid var(--ex-border);
  box-shadow:
    0 4px 20px rgba(var(--ex-shadow-rgb), 0.06),
    inset 0 1px 0 var(--ex-highlight);
  transition:
    background 0.25s ease,
    border-color 0.25s ease;
}
</style>
