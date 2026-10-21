<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import RefundDialog from '@/components/RefundDialog.vue'
import { applyRefund, cancelOrder, confirmReceipt, getOrder, listOrders } from '@/api/order'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'
import type { Order, OrderItem, PageMeta } from '@/types'
import { orderStatusText, orderStatusTone } from '@/utils/enums'
import { formatDateTime, formatYuan } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const cart = useCartStore()

const tabs = [
  { value: 0, label: '全部' },
  { value: 1, label: '待付款' },
  { value: 2, label: '待发货' },
  { value: 3, label: '待收货' },
  { value: 6, label: '退款' },
]

const activeTab = ref(Number(route.query.status ?? 0))
const orders = ref<Order[]>([])
/** 订单号 → 商品条目，用于展示缩略图 */
const orderItems = ref<Record<number, OrderItem[]>>({})
const meta = ref<PageMeta>({ page: 1, page_size: 10, total: 0, total_pages: 1 })
const loading = ref(false)
const refundVisible = ref(false)
const refundOrder = ref<Order | null>(null)

const PAGE_SIZE = 10

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listOrders({
      page: meta.value.page,
      page_size: PAGE_SIZE,
      status: activeTab.value || undefined,
    })
    orders.value = result.orders
    meta.value = result.meta
    await loadItems(result.orders)
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

/** 列表接口只返回订单概要，这里补齐商品条目用于缩略图展示 */
async function loadItems(list: Order[]): Promise<void> {
  const entries = await Promise.all(
    list.map(async (order) => {
      try {
        const detail = await getOrder(order.id)
        return [order.id, detail.items] as const
      } catch {
        return [order.id, [] as OrderItem[]] as const
      }
    }),
  )
  orderItems.value = Object.fromEntries(entries)
}

function changeTab(value: number): void {
  activeTab.value = value
  meta.value = { ...meta.value, page: 1 }
  load()
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function onCancel(order: Order): Promise<void> {
  try {
    await cancelOrder(order.id, '用户主动取消')
    app.success('订单已取消')
    load()
  } catch {
    // 错误提示已由接口层处理
  }
}

async function onConfirm(order: Order): Promise<void> {
  try {
    await confirmReceipt(order.id)
    app.success('已确认收货')
    load()
  } catch {
    // 错误提示已由接口层处理
  }
}

function openRefund(order: Order): void {
  refundOrder.value = order
  refundVisible.value = true
}

async function submitRefund(payload: { reason: string; description: string }): Promise<void> {
  if (!refundOrder.value) return
  try {
    await applyRefund({
      order_id: refundOrder.value.id,
      amount_cents: refundOrder.value.payable_cents,
      reason: payload.reason,
      description: payload.description,
    })
    app.success('退款申请已提交')
    load()
  } catch {
    // 错误提示已由接口层处理
  }
}

/** 再来一单：把订单商品重新加入购物车 */
async function reorder(order: Order): Promise<void> {
  const items = orderItems.value[order.id] ?? []
  if (!items.length) {
    app.warning('该订单没有可再次购买的商品')
    return
  }
  try {
    for (const item of items) {
      await cart.addToCart({
        product_id: item.product_id,
        sku_id: item.sku_id,
        quantity: item.quantity,
      })
    }
    app.success('已加入购物车')
    router.push('/cart')
  } catch {
    // 错误提示已由接口层处理
  }
}

function goPay(order: Order): void {
  router.push({ name: 'payment', params: { orderId: String(order.id) } })
}

// 个人中心的订单状态入口通过 ?status= 直达对应 Tab
watch(
  () => route.query.status,
  (value) => {
    const next = Number(value ?? 0)
    if (next !== activeTab.value && tabs.some((tab) => tab.value === next)) {
      activeTab.value = next
      meta.value = { ...meta.value, page: 1 }
      load()
    }
  },
)

onMounted(load)
</script>

<template>
  <div class="order-list ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">我的订单</h1>
        <p class="ss-page-sub">查看订单状态、物流进度与售后操作</p>
      </div>
      <div class="ss-row">
        <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/order-trace">订单轨迹</RouterLink>
        <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/logistics">物流跟踪</RouterLink>
      </div>
    </div>

    <div class="order-list__tabs ss-card">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="order-list__tab"
        :class="{ 'order-list__tab--active': activeTab === tab.value }"
        @click="changeTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <EmptyState
      v-if="!orders.length && !loading"
      icon="📦"
      title="暂无相关订单"
      description="换个状态筛选，或去商城挑选商品吧"
      action-text="去逛逛"
      @action="router.push('/category')"
    />

    <section v-for="order in orders" :key="order.id" class="order-card ss-card">
      <header class="order-card__head">
        <span class="ss-muted-block">订单号 {{ order.order_no }}</span>
        <span class="ss-grow" />
        <span class="ss-muted-block">{{ formatDateTime(order.created_at) }}</span>
        <span class="ss-tag" :class="`ss-tag-${orderStatusTone(order.status)}`">
          {{ orderStatusText(order.status) }}
        </span>
      </header>

      <div class="order-card__body">
        <div class="order-card__goods">
          <div class="order-card__thumbs">
            <RouterLink
              v-for="item in (orderItems[order.id] ?? []).slice(0, 4)"
              :key="item.id"
              :to="`/product/${item.product_id}`"
              class="order-card__thumb"
            >
              <img :src="item.image" :alt="item.product_title" @error="handleImageError" />
            </RouterLink>
          </div>
          <div class="ss-grow ss-col">
            <span class="ss-muted-block">共 {{ order.total_quantity }} 件商品</span>
            <span v-if="order.remark" class="ss-muted-block">备注：{{ order.remark }}</span>
          </div>
          <div class="order-card__amount">
            <span class="ss-muted-block">实付</span>
            <strong class="ss-num">{{ formatYuan(order.payable_cents) }}</strong>
          </div>
        </div>
      </div>

      <footer class="order-card__foot">
        <RouterLink class="ss-btn ss-btn-ghost ss-btn-sm" :to="`/order/${order.id}`">订单详情</RouterLink>
        <span class="ss-grow" />
        <button
          v-if="order.status === 'ORDER_STATUS_PENDING_PAYMENT'"
          type="button"
          class="ss-btn ss-btn-outline ss-btn-sm"
          @click="onCancel(order)"
        >
          取消订单
        </button>
        <button
          v-if="order.status === 'ORDER_STATUS_PENDING_PAYMENT'"
          type="button"
          class="ss-btn ss-btn-primary ss-btn-sm"
          @click="goPay(order)"
        >
          去支付
        </button>
        <button
          v-if="order.status === 'ORDER_STATUS_SHIPPED'"
          type="button"
          class="ss-btn ss-btn-outline ss-btn-sm"
          @click="onConfirm(order)"
        >
          确认收货
        </button>
        <button
          v-if="order.status === 'ORDER_STATUS_PAID' || order.status === 'ORDER_STATUS_SHIPPED'"
          type="button"
          class="ss-btn ss-btn-outline ss-btn-sm"
          @click="openRefund(order)"
        >
          申请退款
        </button>
        <button
          v-if="
            order.status === 'ORDER_STATUS_COMPLETED' ||
            order.status === 'ORDER_STATUS_CANCELLED' ||
            order.status === 'ORDER_STATUS_REFUNDED'
          "
          type="button"
          class="ss-btn ss-btn-outline ss-btn-sm"
          @click="reorder(order)"
        >
          再来一单
        </button>
      </footer>
    </section>

    <Pagination
      :page="meta.page"
      :page-size="meta.page_size"
      :total="meta.total"
      @change="changePage"
    />

    <RefundDialog
      v-model="refundVisible"
      :order-no="refundOrder?.order_no ?? ''"
      :amount-cents="refundOrder?.payable_cents ?? 0"
      :item-count="refundOrder?.total_quantity ?? 0"
      @submit="submitRefund"
    />
  </div>
</template>

<style scoped>
.order-list__tabs {
  display: flex;
  gap: var(--ss-space-1);
  padding: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
  overflow-x: auto;
}

.order-list__tab {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.order-list__tab--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-medium);
}

.order-card {
  margin-bottom: var(--ss-space-4);
  overflow: hidden;
}

.order-card__head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) var(--ss-space-4);
  background: var(--ss-color-bg-subtle);
  border-bottom: 1px solid var(--ss-color-border-subtle);
  flex-wrap: wrap;
}

.order-card__body {
  padding: var(--ss-space-4);
}

.order-card__goods {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
}

.order-card__thumbs {
  display: flex;
  gap: var(--ss-space-2);
}

.order-card__thumb img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.order-card__amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.order-card__amount strong {
  font-size: var(--ss-font-size-xl);
  color: var(--ss-color-danger-600);
}

.order-card__foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-3) var(--ss-space-4);
  border-top: 1px solid var(--ss-color-border-subtle);
  flex-wrap: wrap;
}
</style>
