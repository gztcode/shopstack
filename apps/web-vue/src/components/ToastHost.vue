<script setup lang="ts">
import { useAppStore } from '@/stores/app'

/** 全局轻提示 */
const app = useAppStore()

const icons: Record<string, string> = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  error: '⛔',
}
</script>

<template>
  <div class="toast-host">
    <TransitionGroup name="toast">
      <div
        v-for="item in app.toasts"
        :key="item.id"
        class="toast"
        :class="`toast--${item.type}`"
        @click="app.dismiss(item.id)"
      >
        <span>{{ icons[item.type] }}</span>
        <span class="toast__text">{{ item.message }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  top: 84px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--ss-z-index-toast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ss-space-2);
  pointer-events: none;
  width: min(92vw, 480px);
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  max-width: 100%;
  padding: var(--ss-space-3) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-inverse);
  color: var(--ss-color-text-inverse);
  font-size: var(--ss-font-size-sm);
  box-shadow: var(--ss-shadow-lg);
  cursor: pointer;
}

.toast--success {
  background: var(--ss-color-success-600);
}

.toast--warning {
  background: var(--ss-color-warning-600);
}

.toast--error {
  background: var(--ss-color-danger-600);
}

.toast__text {
  flex: 1;
}

.toast-enter-active,
.toast-leave-active {
  transition: all var(--ss-duration-base) var(--ss-easing-standard);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
