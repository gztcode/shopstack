<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import { listRefundReasons } from '@/api/order'
import type { RefundReason } from '@/types'

/**
 * 退款原因
 * 数据来源 GET /api/v1/refund-reasons，可按售后类型筛选。
 */
const TYPES = [
  { value: 0, label: '全部类型' },
  { value: 1, label: '仅退款' },
  { value: 2, label: '退货退款' },
  { value: 3, label: '换货' },
]

/** 各类型下的说明文案 */
const TYPE_DESC: Record<number, string> = {
  1: '不寄回商品，审核通过后款项直接原路退回。',
  2: '需要把商品寄回商家，验收通过后完成退款。',
  3: '需要把商品寄回商家，换发同款其它规格。',
}

const reasons = ref<RefundReason[]>([])
const activeType = ref<number | null>(null)
const loading = ref(false)

/** 按类型分组展示 */
const grouped = computed(() => {
  const list = activeType.value ? reasons.value.filter((item) => item.type === activeType.value) : reasons.value
  const groups = new Map<number, RefundReason[]>()
  list.forEach((item) => {
    const bucket = groups.get(item.type) ?? []
    bucket.push(item)
    groups.set(item.type, bucket)
  })
  return Array.from(groups.entries()).map(([type, items]) => ({
    type,
    items,
    desc: TYPE_DESC[type] ?? '',
  }))
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listRefundReasons(activeType.value ?? undefined)
    reasons.value = result.reasons
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

watch(activeType, load)
onMounted(load)
</script>

<template>
  <div class="refund-reason ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">退款原因</h1>
        <p class="ss-page-sub">选择合适的售后类型与原因，有助于更快完成审核</p>
      </div>
      <RouterLink class="ss-btn ss-btn-primary ss-btn-sm" to="/after-sales/apply">申请售后</RouterLink>
    </div>

    <div class="refund-reason__tabs ss-card">
      <button
        v-for="item in TYPES"
        :key="item.value"
        type="button"
        class="refund-reason__tab"
        :class="{ 'refund-reason__tab--active': activeType === item.value }"
        @click="activeType = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <EmptyState
      v-if="!reasons.length && !loading"
      icon="🗒️"
      title="暂无退款原因"
      description="请稍后再试，或联系在线客服帮你处理"
      action-text="联系客服"
      @action="$router.push('/help-center')"
    />

    <section v-for="group in grouped" :key="group.type" class="ss-section">
      <div class="ss-section-title">
        <h2>{{ TYPES.find((item) => item.value === group.type)?.label ?? '其它' }}</h2>
        <span class="ss-muted-block">{{ group.desc }}</span>
      </div>
      <div class="refund-reason__list ss-card">
        <div v-for="item in group.items" :key="item.id" class="refund-reason__item">
          <span class="refund-reason__name">{{ item.name }}</span>
          <span class="ss-grow" />
          <span class="ss-tag ss-tag-neutral">排序 {{ item.sort }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.refund-reason__tabs {
  display: flex;
  gap: var(--ss-space-1);
  padding: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
  overflow-x: auto;
}

.refund-reason__tab {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.refund-reason__tab--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-medium);
}

.refund-reason__list {
  overflow: hidden;
}

.refund-reason__item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.refund-reason__item:last-child {
  border-bottom: 0;
}

.refund-reason__name {
  font-size: var(--ss-font-size-md);
}
</style>
