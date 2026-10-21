<script setup lang="ts">
import { computed } from 'vue'

/** 分页器 */
const props = withDefaults(
  defineProps<{
    page: number
    pageSize?: number
    total: number
  }>(),
  {
    pageSize: 20,
    total: 0,
  },
)

const emit = defineEmits<{
  change: [page: number]
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

/** 页码窗口：当前页前后各 2 页 */
const pages = computed<(number | '...')[]>(() => {
  const last = totalPages.value
  const current = props.page
  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }
  const result: (number | '...')[] = [1]
  const start = Math.max(2, current - 2)
  const end = Math.min(last - 1, current + 2)
  if (start > 2) result.push('...')
  for (let i = start; i <= end; i += 1) result.push(i)
  if (end < last - 1) result.push('...')
  result.push(last)
  return result
})

function go(page: number): void {
  if (page < 1 || page > totalPages.value || page === props.page) return
  emit('change', page)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination">
    <button
      type="button"
      class="pagination__btn"
      :disabled="props.page <= 1"
      @click="go(props.page - 1)"
    >
      上一页
    </button>
    <button
      v-for="(item, index) in pages"
      :key="`${item}-${index}`"
      type="button"
      class="pagination__btn"
      :class="{ 'pagination__btn--active': item === props.page }"
      :disabled="item === '...'"
      @click="typeof item === 'number' && go(item)"
    >
      {{ item }}
    </button>
    <button
      type="button"
      class="pagination__btn"
      :disabled="props.page >= totalPages"
      @click="go(props.page + 1)"
    >
      下一页
    </button>
    <span class="pagination__total">共 {{ props.total }} 条 / {{ totalPages }} 页</span>
  </nav>
</template>

<style scoped>
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: var(--ss-space-2);
  padding: var(--ss-space-5) 0;
}

.pagination__btn {
  min-width: 34px;
  height: 34px;
  padding: 0 var(--ss-space-2);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-sm);
  background: var(--ss-color-bg-card);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  font-size: var(--ss-font-size-sm);
}

.pagination__btn:hover:not(:disabled) {
  border-color: var(--ss-color-brand-600);
  color: var(--ss-color-brand-600);
}

.pagination__btn--active {
  background: var(--ss-color-brand-600);
  border-color: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.pagination__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination__total {
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
}
</style>
