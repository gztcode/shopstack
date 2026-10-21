<script setup lang="ts">
/** 空状态 */
withDefaults(
  defineProps<{
    icon?: string
    title?: string
    description?: string
    actionText?: string
  }>(),
  {
    icon: '🗂️',
    title: '暂无数据',
    description: '',
    actionText: '',
  },
)

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="empty-state">
    <div class="empty-state__icon">{{ icon }}</div>
    <p class="empty-state__title">{{ title }}</p>
    <p v-if="description" class="empty-state__desc">{{ description }}</p>
    <button v-if="actionText" type="button" class="ss-btn ss-btn-primary" @click="emit('action')">
      {{ actionText }}
    </button>
    <slot />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-9) var(--ss-space-4);
  text-align: center;
}

.empty-state__icon {
  font-size: 48px;
  line-height: 1;
  opacity: 0.85;
}

.empty-state__title {
  margin: 0;
  font-size: var(--ss-font-size-lg);
  font-weight: var(--ss-font-weight-semibold);
  color: var(--ss-color-text-secondary);
}

.empty-state__desc {
  margin: 0;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
  max-width: 420px;
}
</style>
