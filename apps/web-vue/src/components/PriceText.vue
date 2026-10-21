<script setup lang="ts">
import { computed } from 'vue'

import { formatYuan } from '@/utils/format'

/** 金额展示：现价 + 划线原价 */
const props = withDefaults(
  defineProps<{
    cents?: number | null
    originalCents?: number | null
    size?: 'sm' | 'md' | 'lg' | 'xl'
    tone?: 'brand' | 'danger' | 'default'
  }>(),
  {
    cents: 0,
    originalCents: 0,
    size: 'md',
    tone: 'danger',
  },
)

const hasOriginal = computed(() => (props.originalCents ?? 0) > (props.cents ?? 0))
</script>

<template>
  <span class="price-text">
    <span class="price-text__now" :class="`price-text__now--${props.size}`">
      {{ formatYuan(props.cents) }}
    </span>
    <del v-if="hasOriginal" class="price-text__origin">
      {{ formatYuan(props.originalCents) }}
    </del>
  </span>
</template>

<style scoped>
.price-text {
  display: inline-flex;
  align-items: baseline;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
}

.price-text__now {
  font-family: var(--ss-font-family-numeric);
  font-weight: var(--ss-font-weight-bold);
  letter-spacing: var(--ss-font-letter-spacing-tight);
}

.price-text__now--sm {
  font-size: var(--ss-font-size-base);
}

.price-text__now--md {
  font-size: var(--ss-font-size-xl);
}

.price-text__now--lg {
  font-size: var(--ss-font-size-3xl);
}

.price-text__now--xl {
  font-size: var(--ss-font-size-4xl);
}

.price-text__now--danger {
  color: var(--ss-color-danger-600);
}

.price-text__now--brand {
  color: var(--ss-color-brand-600);
}

.price-text__now--default {
  color: var(--ss-color-text-primary);
}

.price-text__origin {
  color: var(--ss-color-text-quaternary);
  font-size: var(--ss-font-size-sm);
  font-family: var(--ss-font-family-numeric);
}
</style>
