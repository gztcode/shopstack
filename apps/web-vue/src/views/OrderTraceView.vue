<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import { listOrderLogs } from '@/api/order'
import { listOrders } from '@/api/order'
import { useAppStore } from '@/stores/app'
import type { Order, OrderStatusLog } from '@/types'
import { formatDateTime } from '@/utils/format'

const route = useRoute()
const app = useAppStore()

const orderInput = ref(String(route.query.order_id ?? ''))
const logs = ref<OrderStatusLog[]>([])
const loading = ref(false)
const searched = ref(false)
const orders = ref<Order[]>([])

/** 状态流转动作的中文说明 */
const actionText: Record<string, string> = {
  create: '创建订单',
  pay: '支付成功',
  ship: '商家发货',
  confirm: '确认收货',
  cancel: '取消订单',
  refund: '申请退款',
  close: '订单关闭',
  review: '发表评价',
}

const hasLogs = computed(() => logs.value.length > 0)

async function query(): Promise<void> {
  const value = Number(orderInput.value)
  if (!Number.isFinite(value) || value <= 0) {
    app.warning('请输入正确的订单 ID')
    return
  }
  loading.value = true
  searched.value = true
  try {
    const result = await listOrderLogs(value)
    logs.value = result.logs ?? []
    if (!logs.value.length) {
      app.info('该订单暂无状态流转记录')
    }
  } catch {
    app.error('订单轨迹查询失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function loadOrders(): Promise<void> {
  try {
    const result = await listOrders({ page: 1, page_size: 20 })
    orders.value = result.orders
  } catch {
    // 订单列表失败时保留手动输入查询
  }
}

function pickOrder(order: Order): void {
  orderInput.value = String(order.id)
  query()
}

onMounted(async () => {
  await loadOrders()
  if (orderInput.value) {
    query()
  }
})
</script>

<template>
  <div class="order-trace ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">订单轨迹</h1>
        <p class="ss-page-sub">查看订单从创建到完成的全流程状态记录</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline" to="/order">我的订单</RouterLink>
    </div>

    <section class="ss-card ss-card-pad order-trace__search">
      <div class="order-trace__search-row">
        <input
          v-model="orderInput"
          class="ss-input"
          type="text"
          placeholder="请输入订单 ID"
          @keyup.enter="query"
        />
        <button type="button" class="ss-btn ss-btn-primary" :disabled="loading" @click="query">
          {{ loading ? '查询中…' : '查询轨迹' }}
        </button>
      </div>

      <div v-if="orders.length" class="order-trace__recent">
        <span class="ss-muted-block">最近订单：</span>
        <button
          v-for="order in orders.slice(0, 6)"
          :key="order.id"
          type="button"
          class="ss-btn ss-btn-outline ss-btn-sm"
          @click="pickOrder(order)"
        >
          {{ order.order_no }}
        </button>
      </div>
    </section>

    <LoadingState v-if="loading" text="正在查询订单轨迹…" />

    <section v-else-if="searched" class="ss-card ss-card-pad">
      <h2 class="order-trace__title">状态流转</h2>
      <ol v-if="hasLogs" class="timeline">
        <li v-for="log in logs" :key="log.id" class="timeline__item">
          <span class="timeline__dot" />
          <div class="ss-col">
            <div class="ss-row">
              <strong>{{ log.remark || actionText[log.action] || log.action }}</strong>
              <span class="ss-tag ss-tag-neutral">{{ actionText[log.action] || log.action }}</span>
            </div>
            <span class="ss-muted-block">{{ formatDateTime(log.created_at) }}</span>
            <span v-if="log.operator" class="ss-muted-block">操作人：{{ log.operator }}</span>
          </div>
        </li>
      </ol>
      <EmptyState
        v-else
        icon="🧭"
        title="暂无状态流转记录"
        description="订单创建后会在这里记录每一步变化"
        action-text="重新查询"
        @action="query"
      />
    </section>

    <section v-else class="ss-card ss-card-pad">
      <EmptyState icon="🔎" title="输入订单 ID 开始查询" description="支持从最近订单中快速选择" />
    </section>
  </div>
</template>

<style scoped>
.order-trace__search {
  margin-bottom: var(--ss-space-4);
}

.order-trace__search-row {
  display: flex;
  gap: var(--ss-space-2);
  max-width: 520px;
}

.order-trace__recent {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  margin-top: var(--ss-space-3);
  flex-wrap: wrap;
}

.order-trace__title {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-4);
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0 0 0 var(--ss-space-4);
  border-left: 2px solid var(--ss-color-border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-4);
}

.timeline__item {
  position: relative;
}

.timeline__dot {
  position: absolute;
  left: calc(-1 * var(--ss-space-4) - 5px);
  top: 6px;
  width: 8px;
  height: 8px;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-brand-600);
}
</style>
