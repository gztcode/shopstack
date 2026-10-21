<script setup lang="ts">
import { useAppStore } from '@/stores/app'

/**
 * 演示数据提示条
 * 后端未启动时接口层会自动降级到内置 Mock 数据，这里给出明确提示。
 */
const app = useAppStore()
</script>

<template>
  <div v-if="app.demoMode" class="demo-banner">
    <span class="demo-banner__icon">🧪</span>
    <span class="demo-banner__text">
      当前为演示数据模式：后端服务未连接，页面展示的是内置示例数据。
    </span>
    <span class="ss-grow" />
    <span v-if="app.demoReason" class="demo-banner__reason">{{ app.demoReason }}</span>
  </div>
</template>

<style scoped>
.demo-banner {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-2) var(--ss-space-5);
  background: var(--ss-color-warning-50);
  border-bottom: 1px solid var(--ss-color-warning-100);
  color: var(--ss-color-warning-700);
  font-size: var(--ss-font-size-sm);
}

.demo-banner__icon {
  font-size: 15px;
}

.demo-banner__reason {
  color: var(--ss-color-warning-700);
  opacity: 0.8;
  font-size: var(--ss-font-size-xs);
}

@media (max-width: 767px) {
  .demo-banner {
    padding: var(--ss-space-2) var(--ss-space-4);
  }

  .demo-banner__reason {
    display: none;
  }
}
</style>
