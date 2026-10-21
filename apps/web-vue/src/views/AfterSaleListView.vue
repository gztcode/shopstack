<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { listAfterSales } from '@/api/order'
import type { AfterSale, PageMeta } from '@/types'
import { formatDateTime, formatYuan } from '@/utils/format'

/**
 * 售后列表
 * 数据来源 GET /api/v1/after-sales，可按处理状态与售后类型筛选。
 */
const STATUS_TABS = [
  { value: null, label: '全部' },
  { value: 0, label: '待审核' },
  { value: 1, label: '审核通过' },
  { value: 2, label: '审核驳回' },
  { value: 3, label: '已退款' },
  { value: 4, label: '已完成' },
]

/** 售后类型文案 */
const TYPE_TEXT: Record<number, string> = {
  1: '仅退款',
  2: '退货退款',
  3: '换货',
}

/** 售后状态文案与色板 */
const STATUS_TEXT: Record<number, string> = {
  0: '待审核',
  1: '审核通过',
  2: '审核驳回',
  3: '已退款',
  4: '已完成',
}

const STATUS_TONE: Record<number, string> = {
  0: 'warning',
  1: 'accent',
  2: 'danger',
  3: 'success',
  4: 'success',
}

const afterSales = ref<AfterSale[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 10, total: 0, total_pages: 1 })
const activeStatus = ref<number | null>(null)
const activeType = ref<number | null>(null)
const loading = ref(false)

const PAGE_SIZE = 10

/** 已处理（已退款 / 已完成）的售后单数 */
const doneCount = computed(() => afterSales.value.filter((item) => item.status >= 3).length)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listAfterSales({
      page: meta.value.page,
      page_size: PAGE_SIZE,
      status: activeStatus.value ?? undefined,
      type: activeType.value ?? undefined,
    })
    afterSales.value = result.after_sales
    meta.value = result.meta
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function changeStatus(value: number | null): void {
  activeStatus.value = value
  meta.value = { ...meta.value, page: 1 }
  load()
}

function changeType(value: number | null): void {
  activeType.value = value
  meta.value = { ...meta.value, page: 1 }
  load()
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(load)
</script>

<template>
  <div class="after-sale-list ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">售后列表</h1>
        <p class="ss-page-sub">查看退款、退货与换货工单的处理进度</p>
      </div>
      <RouterLink class="ss-btn ss-btn-primary ss-btn-sm" to="/after-sales/apply">申请售后</RouterLink>
    </div>

    <div class="after-sale-list__bar ss-card">
      <div class="after-sale-list__tabs">
        <button
          v-for="tab in STATUS_TABS"
          :key="tab.label"
          type="button"
          class="after-sale-list__tab"
          :class="{ 'after-sale-list__tab--active': activeStatus === tab.value }"
          @click="changeStatus(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
      <div class="after-sale-list__types">
        <button
          type="button"
          class="after-sale-list__type"
          :class="{ 'after-sale-list__type--active': activeType === null }"
          @click="changeType(null)"
        >
          全部类型
        </button>
        <button
          v-for="(label, type) in TYPE_TEXT"
          :key="type"
          type="button"
          class="after-sale-list__type"
          :class="{ 'after-sale-list__type--active': activeType === Number(type) }"
          @click="changeType(Number(type))"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <EmptyState
      v-if="!afterSales.length && !loading"
      icon="↩️"
      title="暂无售后工单"
      description="订单需要处理时，可在这里提交退款、退货或换货申请"
      action-text="申请售后"
      @action="$router.push('/after-sales/apply')"
    />

    <section v-for="item in afterSales" :key="item.id" class="after-sale-list__card ss-card">
      <header class="after-sale-list__head">
        <span class="ss-muted-block">工单号 {{ item.after_sale_no }}</span>
        <span class="ss-grow" />
        <span class="ss-tag ss-tag-neutral">{{ TYPE_TEXT[item.type] ?? '售后' }}</span>
        <span class="ss-tag" :class="`ss-tag-${STATUS_TONE[item.status] ?? 'neutral'}`">
          {{ STATUS_TEXT[item.status] ?? '处理中' }}
        </span>
      </header>

      <div class="after-sale-list__body">
        <div class="ss-col">
          <strong>订单 {{ item.order_no }}</strong>
          <span class="ss-muted-block">原因：{{ item.reason || '未填写' }}</span>
          <span v-if="item.description" class="ss-muted-block">说明：{{ item.description }}</span>
          <span class="ss-muted-block">申请时间：{{ formatDateTime(item.created_at) }}</span>
        </div>
        <div class="after-sale-list__amount">
          <span class="ss-muted-block">退款金额</span>
          <strong class="ss-num">{{ formatYuan(item.amount_cents) }}</strong>
        </div>
      </div>

      <footer v-if="item.admin_remark" class="after-sale-list__remark">
        商家备注：{{ item.admin_remark }}
      </footer>

      <footer class="after-sale-list__foot">
        <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" :to="`/after-sales/${item.id}`">
          查看详情
        </RouterLink>
        <span class="ss-grow" />
        <RouterLink class="ss-btn ss-btn-ghost ss-btn-sm" :to="`/order/${item.order_id}`">
          查看订单
        </RouterLink>
      </footer>
    </section>

    <Pagination
      :page="meta.page"
      :page-size="meta.page_size"
      :total="meta.total"
      @change="changePage"
    />

    <p class="after-sale-list__hint ss-muted-block">本页已完成 {{ doneCount }} 单</p>
  </div>
</template>

<style scoped>
.after-sale-list__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-2) var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.after-sale-list__tabs,
.after-sale-list__types {
  display: flex;
  gap: var(--ss-space-1);
  flex-wrap: wrap;
}

.after-sale-list__tab,
.after-sale-list__type {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  font-size: var(--ss-font-size-sm);
}

.after-sale-list__tab:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.after-sale-list__tab--active,
.after-sale-list__type--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-medium);
}

.after-sale-list__card {
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-3);
}

.after-sale-list__head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding-bottom: var(--ss-space-2);
  border-bottom: 1px solid var(--ss-color-border-subtle);
  flex-wrap: wrap;
}

.after-sale-list__body {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-3) 0;
}

.after-sale-list__amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex: none;
}

.after-sale-list__amount strong {
  font-size: var(--ss-font-size-xl);
  color: var(--ss-color-danger-600);
}

.after-sale-list__remark {
  padding: var(--ss-space-2) var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  color: var(--ss-color-text-secondary);
  font-size: var(--ss-font-size-sm);
}

.after-sale-list__foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  margin-top: var(--ss-space-3);
  padding-top: var(--ss-space-3);
  border-top: 1px solid var(--ss-color-border-subtle);
}

.after-sale-list__hint {
  text-align: center;
  margin-top: var(--ss-space-2);
}
</style>
