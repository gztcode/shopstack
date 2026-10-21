<script setup lang="ts">
import { computed } from 'vue'

/** 星级评分 */
const props = withDefaults(
  defineProps<{
    rating?: number
    size?: 'sm' | 'md'
  }>(),
  {
    rating: 0,
    size: 'md',
  },
)

const stars = computed(() => {
  const value = Math.max(0, Math.min(5, Number(props.rating ?? 0)))
  return [1, 2, 3, 4, 5].map((index) => (value >= index - 0.25 ? 'full' : value >= index - 0.75 ? 'half' : 'empty'))
})
</script>

<template>
  <span class="star-rating" :class="`star-rating--${props.size}`">
    <span
      v-for="(state, index) in stars"
      :key="index"
      class="star-rating__star"
      :class="`star-rating__star--${state}`"
      >★</span
    >
    <span class="star-rating__value">{{ Number(props.rating ?? 0).toFixed(1) }}</span>
  </span>
</template>

<style scoped>
.star-rating {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  color: var(--ss-color-warning-500);
}

.star-rating--sm {
  font-size: var(--ss-font-size-xs);
}

.star-rating--md {
  font-size: var(--ss-font-size-base);
}

.star-rating__star--empty {
  color: var(--ss-color-neutral-300);
}

.star-rating__star--half {
  opacity: 0.6;
}

.star-rating__value {
  margin-left: var(--ss-space-1);
  color: var(--ss-color-text-tertiary);
  font-family: var(--ss-font-family-numeric);
  font-size: var(--ss-font-size-sm);
}
</style>
