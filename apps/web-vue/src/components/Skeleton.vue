<script setup lang="ts">
/** 骨架屏 */
withDefaults(
  defineProps<{
    variant?: 'text' | 'block' | 'circle'
    rows?: number
    width?: string
    height?: string
  }>(),
  {
    variant: 'text',
    rows: 1,
    width: '100%',
    height: '16px',
  },
)
</script>

<template>
  <div class="skeleton-group">
    <div
      v-for="row in rows"
      :key="row"
      class="ss-skeleton"
      :class="`ss-skeleton--${variant}`"
      :style="{ width, height }"
    />
  </div>
</template>

<style scoped>
.skeleton-group {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  width: 100%;
}

.ss-skeleton--block {
  border-radius: var(--ss-radius-lg);
}

.ss-skeleton--circle {
  border-radius: var(--ss-radius-circle);
}
</style>
