<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LoadingState from '@/components/LoadingState.vue'
import RefundDialog from '@/components/RefundDialog.vue'
import StarRating from '@/components/StarRating.vue'
import { cancelOrder, confirmReceipt, getOrder, listOrderLogs } from '@/api/order'
import { getShipment } from '@/api/logistics'
import { createReview } from '@/api/product'
import { useAppStore } from '@/stores/app'
import type { OrderDetail, OrderStatusLog, Shipment, ShipmentTrack } from '@/types'
import { orderStatusText, orderStatusTone, shipmentStatusText } from '@/utils/enums'
import { formatAddress, formatDateTime, formatYuan } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const route = useRoute()
const router = useRouter()
const app = useAppStore()

const orderId = computed(() => Number(route.params.id))
const detail = ref<OrderDetail | null>(null)
const logs = ref<OrderStatusLog[]>([])
const shipment = ref<Shipment | null>(null)
const tracks = ref<ShipmentTrack[]>([])
const loading = ref(true)
const errorMessage = ref('')
const refundVisible = ref(false)
const reviewVisible = ref(false)
const reviewTarget = ref<{ product_id: number; sku_id: number; product_title: string } | null>(null)
const reviewRating = ref(5)
const reviewContent = ref('')

const order = computed(() => detail.value?.order ?? null)

async function load(): Promise<void> {
  loading.value = true
  try {
    detail.value = await getOrder(orderId.value)
    const logRes = await listOrderLogs(orderId.value)
    logs.value = logRes.logs.length ? logRes.logs : (detail.value?.logs ?? [])
    const shipmentRes = await getShipment(orderId.value)
    shipment.value = shipmentRes.shipment
    tracks.value = shipmentRes.tracks
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '订单加载失败'
  } finally {
    loading.value = false
  }
}

async function onCancel(): Promise<void> {
  try {
    await cancelOrder(orderId.value, '用户主动取消')
    app.success('订单已取消')
    load()
  } catch {
    // 错误提示已由接口层处理
  }
}

async function onConfirm(): Promise<void> {
  try {
    await confirmReceipt(orderId.value)
    app.success('已确认收货')
    load()
  } catch {
    // 错误提示已由接口层处理
  }
}

async function submitRefund(payload: { reason: string; description: string }): Promise<void> {
  const { applyRefund } = await import('@/api/order')
  try {
    await applyRefund({
      order_id: orderId.value,
      amount_cents: order.value?.payable_cents ?? 0,
      reason: payload.reason,
      description: payload.description,
    })
    app.success('退款申请已提交')
    load()
  } catch {
    // 错误提示已由接口层处理
  }
}

function openReview(item: { product_id: number; sku_id: number; product_title: string }): void {
  reviewTarget.value = item
  reviewRating.value = 5
  reviewContent.value = ''
  reviewVisible.value = true
}

async function submitReview(): Promise<void> {
  if (!reviewTarget.value) return
  if (!reviewContent.value.trim()) {
    app.warning('请填写评价内容')
    return
  }
  try {
    await createReview({
      product_id: reviewTarget.value.product_id,
      sku_id: reviewTarget.value.sku_id,
      rating: reviewRating.value,
      content: reviewContent.value.trim(),
    })
    app.success('评价提交成功')
    reviewVisible.value = false
    load()
  } catch {
    // 错误提示已由接口层处理
  }
}

function goPay(): void {
  router.push({ name: 'payment', params: { orderId: String(orderId.value) } })
}

onMounted(load)
</script>

<template>
  <div class="order-detail ss-container ss-page">
    <LoadingState v-if="loading && !detail" text="加载订单中…" />

    <section v-else-if="errorMessage" class="ss-card ss-card-pad">
      <EmptyState
        icon="📦"
        title="订单加载失败"
        :description="errorMessage"
        action-text="返回订单列表"
        @action="router.push('/order')"
      />
    </section>

    <template v-else-if="detail && order">
      <div class="ss-page-head">
        <div>
          <h1 class="ss-page-title">订单详情</h1>
          <p class="ss-page-sub">订单号 {{ order.order_no }}</p>
        </div>
        <span class="ss-tag" :class="`ss-tag-${orderStatusTone(order.status)}`">
          {{ orderStatusText(order.status) }}
        </span>
      </div>

      <!-- 状态时间线 -->
      <section class="ss-card ss-card-pad order-detail__timeline">
        <h2 class="order-detail__title">订单进度</h2>
        <ol class="timeline">
          <li v-for="log in logs" :key="log.id" class="timeline__item">
            <span class="timeline__dot" />
            <div class="ss-col">
              <strong>{{ log.remark || log.action }}</strong>
              <span class="ss-muted-block">{{ formatDateTime(log.created_at) }}</span>
              <span v-if="log.operator" class="ss-muted-block">操作人：{{ log.operator }}</span>
            </div>
          </li>
          <li v-if="!logs.length" class="ss-muted-block">暂无状态流转记录</li>
        </ol>
      </section>

      <div class="order-detail__grid">
        <div class="ss-col">
          <!-- 收货地址 -->
          <section class="ss-card ss-card-pad">
            <h2 class="order-detail__title">收货信息</h2>
            <p class="order-detail__receiver">
              {{ order.address.receiver }} {{ order.address.phone }}
              <span v-if="order.address.tag" class="ss-tag ss-tag-neutral">{{ order.address.tag }}</span>
            </p>
            <p class="ss-muted-block">{{ formatAddress(order.address) }}</p>
          </section>

          <!-- 商品 -->
          <section class="ss-card ss-card-pad">
            <h2 class="order-detail__title">商品信息</h2>
            <div v-for="item in detail.items" :key="item.id" class="order-detail__item">
              <RouterLink :to="`/product/${item.product_id}`">
                <img :src="item.image" :alt="item.product_title" @error="handleImageError" />
              </RouterLink>
              <div class="ss-grow ss-col">
                <RouterLink :to="`/product/${item.product_id}`" class="order-detail__item-title">
                  {{ item.product_title }}
                </RouterLink>
                <span class="ss-muted-block">{{ item.spec_text }}</span>
                <span class="ss-num ss-muted-block">{{ formatYuan(item.price_cents) }} × {{ item.quantity }}</span>
              </div>
              <span class="ss-num">{{ formatYuan(item.subtotal_cents) }}</span>
            </div>
            <hr class="ss-divider" />
            <div class="order-detail__row">
              <span class="ss-muted-block">商品总额</span>
              <span class="ss-num">{{ formatYuan(order.total_amount_cents) }}</span>
            </div>
            <div class="order-detail__row">
              <span class="ss-muted-block">优惠金额</span>
              <span class="ss-num ss-text-danger">-{{ formatYuan(order.discount_cents) }}</span>
            </div>
            <div class="order-detail__row">
              <span class="ss-muted-block">运费</span>
              <span class="ss-num">{{ formatYuan(order.freight_cents) }}</span>
            </div>
            <div class="order-detail__row order-detail__row--total">
              <span>实付金额</span>
              <strong class="ss-num">{{ formatYuan(order.payable_cents) }}</strong>
            </div>
          </section>

          <!-- 物流 -->
          <section class="ss-card ss-card-pad">
            <h2 class="order-detail__title">物流信息</h2>
            <template v-if="shipment && shipment.tracking_no">
              <div class="order-detail__row">
                <span class="ss-muted-block">快递公司</span>
                <span>{{ shipment.company }}</span>
              </div>
              <div class="order-detail__row">
                <span class="ss-muted-block">运单号</span>
                <span>{{ shipment.tracking_no }}</span>
              </div>
              <div class="order-detail__row">
                <span class="ss-muted-block">物流状态</span>
                <span class="ss-tag ss-tag-accent">{{ shipmentStatusText(shipment.status) }}</span>
              </div>
              <ul class="order-detail__tracks">
                <li v-for="track in tracks" :key="track.id" class="order-detail__track">
                  <strong>{{ track.description }}</strong>
                  <span class="ss-muted-block">{{ formatDateTime(track.occurred_at) }} · {{ track.location }}</span>
                </li>
                <li v-if="!tracks.length" class="ss-muted-block">暂无物流轨迹</li>
              </ul>
            </template>
            <p v-else class="ss-muted-block">订单发货后可在此查看物流轨迹</p>
          </section>
        </div>

        <!-- 操作卡片 -->
        <aside class="ss-card ss-card-pad order-detail__side">
          <h2 class="order-detail__title">订单操作</h2>
          <div class="order-detail__actions">
            <button
              v-if="detail.can_cancel"
              type="button"
              class="ss-btn ss-btn-outline ss-btn-block"
              @click="onCancel"
            >
              取消订单
            </button>
            <button
              v-if="detail.can_pay"
              type="button"
              class="ss-btn ss-btn-primary ss-btn-block"
              @click="goPay"
            >
              去支付
            </button>
            <button
              v-if="detail.can_confirm"
              type="button"
              class="ss-btn ss-btn-primary ss-btn-block"
              @click="onConfirm"
            >
              确认收货
            </button>
            <button
              v-if="detail.can_refund"
              type="button"
              class="ss-btn ss-btn-outline ss-btn-block"
              @click="refundVisible = true"
            >
              申请退款
            </button>
            <button
              v-if="!detail.can_review && !detail.can_cancel && !detail.can_pay && !detail.can_confirm && !detail.can_refund"
              type="button"
              class="ss-btn ss-btn-ghost ss-btn-block"
              disabled
            >
              当前订单暂无可执行操作
            </button>
          </div>

          <hr class="ss-divider" />
          <h3 class="order-detail__sub">评价商品</h3>
          <div class="order-detail__review-list">
            <button
              v-for="item in detail.items"
              :key="item.id"
              type="button"
              class="ss-btn ss-btn-outline ss-btn-sm ss-btn-block"
              :disabled="item.reviewed"
              @click="openReview(item)"
            >
              {{ item.reviewed ? '已评价' : `评价：${item.product_title}` }}
            </button>
            <p v-if="!detail.items.length" class="ss-muted-block">暂无商品</p>
          </div>
        </aside>
      </div>
    </template>

    <RefundDialog
      v-model="refundVisible"
      :order-no="order?.order_no ?? ''"
      :amount-cents="order?.payable_cents ?? 0"
      :item-count="order?.total_quantity ?? 0"
      @submit="submitRefund"
    />

    <!-- 评价弹窗 -->
    <Teleport to="body">
      <div v-if="reviewVisible" class="review-dialog" @click.self="reviewVisible = false">
        <div class="review-dialog__panel ss-card">
          <div class="ss-row-between">
            <h3>发表评价</h3>
            <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="reviewVisible = false">
              关闭
            </button>
          </div>
          <p class="ss-muted-block">{{ reviewTarget?.product_title }}</p>

          <div class="ss-field">
            <span class="ss-label">评分</span>
            <div class="review-dialog__stars">
              <button
                v-for="value in 5"
                :key="value"
                type="button"
                class="review-dialog__star"
                :class="{ 'review-dialog__star--on': value <= reviewRating }"
                @click="reviewRating = value"
              >
                ★
              </button>
              <StarRating :rating="reviewRating" size="sm" />
            </div>
          </div>

          <label class="ss-field">
            <span class="ss-label">评价内容</span>
            <textarea
              v-model="reviewContent"
              class="ss-textarea"
              placeholder="说说商品的使用感受吧"
            />
          </label>

          <div class="ss-row-between">
            <span />
            <button type="button" class="ss-btn ss-btn-primary" @click="submitReview">
              提交评价
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.order-detail__title {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-3);
}

.order-detail__sub {
  font-size: var(--ss-font-size-md);
  margin-bottom: var(--ss-space-2);
}

.order-detail__timeline {
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

.order-detail__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: var(--ss-space-4);
  align-items: start;
}

.order-detail__receiver {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  font-weight: var(--ss-font-weight-medium);
  margin: 0 0 4px;
}

.order-detail__item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) 0;
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.order-detail__item img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.order-detail__item-title {
  font-weight: var(--ss-font-weight-medium);
}

.order-detail__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--ss-space-2) 0;
  font-size: var(--ss-font-size-md);
}

.order-detail__row--total {
  font-size: var(--ss-font-size-lg);
}

.order-detail__row--total strong {
  font-size: var(--ss-font-size-2xl);
  color: var(--ss-color-danger-600);
}

.order-detail__tracks {
  list-style: none;
  margin: var(--ss-space-3) 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
}

.order-detail__track {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: var(--ss-space-3);
  border-left: 2px solid var(--ss-color-brand-200);
}

.order-detail__side {
  position: sticky;
  top: calc(var(--ss-size-header-desktop) + var(--ss-space-4));
}

.order-detail__actions {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
}

.order-detail__review-list {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
}

.review-dialog {
  position: fixed;
  inset: 0;
  z-index: var(--ss-z-index-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ss-space-4);
  background: var(--ss-color-bg-overlay);
}

.review-dialog__panel {
  width: min(480px, 100%);
  padding: var(--ss-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-4);
  box-shadow: var(--ss-shadow-xl);
}

.review-dialog__stars {
  display: flex;
  align-items: center;
  gap: var(--ss-space-1);
}

.review-dialog__star {
  border: 0;
  background: transparent;
  font-size: 24px;
  color: var(--ss-color-neutral-300);
  cursor: pointer;
  line-height: 1;
}

.review-dialog__star--on {
  color: var(--ss-color-warning-500);
}

@media (max-width: 1023px) {
  .order-detail__grid {
    grid-template-columns: 1fr;
  }

  .order-detail__side {
    position: static;
  }
}
</style>
