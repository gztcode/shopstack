<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import PriceText from '@/components/PriceText.vue'
import { applyRefund, listOrders } from '@/api/order'
import { useAppStore } from '@/stores/app'
import type { Order, Refund } from '@/types'
import { orderStatusText, orderStatusTone, refundStatusText } from '@/utils/enums'
import { formatDateTime, formatYuan } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const router = useRouter()
const app = useAppStore()

const reasons = ['商品与描述不符', '质量问题', '发错货 / 少件', '不想要了', '其它原因']

const orders = ref<Order[]>([])
const loading = ref(false)
const submitting = ref(false)
const selectedId = ref(0)
const appliedRefunds = ref<Refund[]>([])

const form = reactive({
  reason: reasons[0],
  amount_yuan: 0,
  description: '',
})

/** 可申请退款的订单：已付款 / 待收货 / 已完成 */
const refundableOrders = computed(() =>
  orders.value.filter(
    (order) =>
      order.status === 'ORDER_STATUS_PAID' ||
      order.status === 'ORDER_STATUS_SHIPPED' ||
      order.status === 'ORDER_STATUS_COMPLETED',
  ),
)

const selectedOrder = computed(
  () => refundableOrders.value.find((order) => order.id === selectedId.value) ?? null,
)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listOrders({ page: 1, page_size: 30 })
    orders.value = result.orders
    if (!selectedId.value && refundableOrders.value.length) {
      selectOrder(refundableOrders.value[0])
    }
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function selectOrder(order: Order): void {
  selectedId.value = order.id
  form.amount_yuan = order.payable_cents / 100
  form.reason = reasons[0]
  form.description = ''
}

async function submit(): Promise<void> {
  const order = selectedOrder.value
  if (!order) {
    app.warning('请先选择要申请退款的订单')
    return
  }
  if (!form.amount_yuan || form.amount_yuan <= 0) {
    app.warning('请填写退款金额')
    return
  }
  if (form.amount_yuan * 100 > order.payable_cents) {
    app.warning('退款金额不能超过订单实付金额')
    return
  }
  submitting.value = true
  try {
    const refund = await applyRefund({
      order_id: order.id,
      amount_cents: Math.round(form.amount_yuan * 100),
      reason: form.reason,
      description: form.description.trim(),
    })
    appliedRefunds.value = [refund, ...appliedRefunds.value]
    app.success('退款申请已提交，请等待客服审核')
    load()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="refund ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">售后申请</h1>
        <p class="ss-page-sub">选择订单并提交退款申请，审核通过后原路退回</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline" to="/order">查看全部订单</RouterLink>
    </div>

    <!-- 可退款订单 -->
    <section class="ss-section">
      <div class="ss-section-title"><h2>可申请退款的订单</h2></div>
      <EmptyState
        v-if="!refundableOrders.length && !loading"
        icon="🛒"
        title="暂无可申请售后的订单"
        description="订单付款后即可申请退款"
        action-text="去逛逛"
        @action="router.push('/category')"
      />
      <div v-else class="refund__orders">
        <button
          v-for="order in refundableOrders"
          :key="order.id"
          type="button"
          class="refund__order ss-card"
          :class="{ 'refund__order--active': selectedId === order.id }"
          @click="selectOrder(order)"
        >
          <div class="ss-row-between">
            <span class="ss-muted-block">{{ order.order_no }}</span>
            <span class="ss-tag" :class="`ss-tag-${orderStatusTone(order.status)}`">
              {{ orderStatusText(order.status) }}
            </span>
          </div>
          <div class="ss-row-between">
            <span class="ss-muted-block">{{ formatDateTime(order.created_at) }}</span>
            <PriceText :cents="order.payable_cents" size="sm" tone="default" />
          </div>
        </button>
      </div>
    </section>

    <!-- 退款表单 -->
    <section v-if="selectedOrder" class="ss-card ss-card-pad refund__form">
      <h2 class="refund__title">退款信息</h2>

      <div class="refund__goods">
        <img
          v-if="selectedOrder.address"
          src="https://placehold.co/120x120/2A4AD9/FFFFFF?text=Order"
          alt="订单商品"
          @error="handleImageError"
        />
        <div class="ss-grow ss-col">
          <strong>{{ selectedOrder.order_no }}</strong>
          <span class="ss-muted-block">
            实付 {{ formatYuan(selectedOrder.payable_cents) }} ·
            {{ selectedOrder.total_quantity }} 件商品
          </span>
          <span class="ss-muted-block">
            收货人：{{ selectedOrder.address?.receiver }} {{ selectedOrder.address?.phone }}
          </span>
        </div>
      </div>

      <label class="ss-field">
        <span class="ss-label">退款原因</span>
        <select v-model="form.reason" class="ss-select">
          <option v-for="reason in reasons" :key="reason" :value="reason">{{ reason }}</option>
        </select>
      </label>

      <label class="ss-field">
        <span class="ss-label">退款金额（元）</span>
        <input
          v-model.number="form.amount_yuan"
          class="ss-input"
          type="number"
          min="0"
          :max="selectedOrder.payable_cents / 100"
          step="0.01"
        />
        <span class="ss-muted-block">最多可退 {{ formatYuan(selectedOrder.payable_cents) }}</span>
      </label>

      <label class="ss-field">
        <span class="ss-label">补充说明（选填）</span>
        <textarea
          v-model="form.description"
          class="ss-textarea"
          placeholder="描述具体问题，便于客服快速处理"
        />
      </label>

      <button type="button" class="ss-btn ss-btn-primary" :disabled="submitting" @click="submit">
        {{ submitting ? '提交中…' : '提交退款申请' }}
      </button>
    </section>

    <!-- 本次提交的申请 -->
    <section v-if="appliedRefunds.length" class="ss-section">
      <div class="ss-section-title"><h2>本次提交的申请</h2></div>
      <div class="refund__list">
        <div v-for="refund in appliedRefunds" :key="refund.id" class="ss-card ss-card-pad refund__record">
          <div class="ss-row-between">
            <strong>{{ refund.reason }}</strong>
            <span class="ss-tag ss-tag-warning">{{ refundStatusText(refund.status) }}</span>
          </div>
          <span class="ss-muted-block">订单 {{ refund.order_no }} · {{ formatYuan(refund.amount_cents) }}</span>
          <span v-if="refund.description" class="ss-muted-block">说明：{{ refund.description }}</span>
          <span class="ss-muted-block">提交时间：{{ formatDateTime(refund.created_at) }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.refund__orders {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ss-space-3);
}

.refund__order {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
  cursor: pointer;
  text-align: left;
  border-color: var(--ss-color-border-subtle);
}

.refund__order--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
}

.refund__form {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-4);
  margin-bottom: var(--ss-space-6);
}

.refund__title {
  font-size: var(--ss-font-size-xl);
}

.refund__goods {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.refund__goods img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
}

.refund__list {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
}

.refund__record {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
}

@media (max-width: 767px) {
  .refund__orders {
    grid-template-columns: 1fr;
  }
}
</style>
