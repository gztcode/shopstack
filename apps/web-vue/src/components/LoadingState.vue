<script setup lang="ts">
/** 加载态 */
withDefaults(
  defineProps<{
    text?: string
    inline?: boolean
  }>(),
  {
    text: '加载中…',
    inline: false,
  },
)
</script>

<template>
  <div class="loading-state" :class="{ 'loading-state--inline': inline }">
    <span class="loading-state__spinner" />
    <span class="loading-state__text">{{ text }}</span>
  </div>
</template>

<style scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-8) 0;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
}

.loading-state--inline {
  padding: var(--ss-space-3) 0;
}

.loading-state__spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--ss-color-neutral-200);
  border-top-color: var(--ss-color-brand-600);
  border-radius: 50%;
  animation: loading-spin 0.7s linear infinite;
}

@keyframes loading-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
