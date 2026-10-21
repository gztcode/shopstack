<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { applyRefund, listOrders, listRefundReasons } from '@/api/order'
import { useAppStore } from '@/stores/app'
import type { Order, RefundReason } from '@/types'
import { formatDateTime, formatYuan } from '@/utils/format'

/**
 * 申请售后
 * 分步向导：选择订单 → 选择售后类型 → 选择原因 → 填写说明并提交。
 * 订单来源 GET /api/v1/orders，原因来源 GET /api/v1/refund-reasons，
 * 提交走 POST /api/v1/orders/{order_id}/refund。
 */

/** 售后类型：1 仅退款 2 退货退款 3 换货 */
const TYPES = [
  { value: 1, label: '仅退款', desc: '无需寄回商品，审核通过后直接退款' },
  { value: 2, label: '退货退款', desc: '寄回商品后由商家验收并退款' },
  { value: 3, label: '换货', desc: '寄回商品后换发同款其它规格' },
]

const router = useRouter()
const app = useAppStore()

const step = ref(1)
const orders = ref<Order[]>([])
const reasons = ref<RefundReason[]>([])
const selectedOrderId = ref(0)
const submitting = ref(false)
const loading = ref(false)

const form = reactive({
  type: 1,
  reason: '',
  description: '',
  amount_yuan: 0,
})

/** 可申请售后的订单：已付款 / 待收货 / 已完成 */
const refundableOrders = computed(() =>
  orders.value.filter(
    (order) =>
      order.status === 'ORDER_STATUS_PAID' ||
      order.status === 'ORDER_STATUS_SHIPPED' ||
      order.status === 'ORDER_STATUS_COMPLETED',
  ),
)

const selectedOrder = computed(
  () => refundableOrders.value.find((order) => order.id === selectedOrderId.value) ?? null,
)

/** 按售后类型过滤可用原因 */
const availableReasons = computed(() => reasons.value.filter((item) => item.type === form.type))

/** 退款金额（元） */
const amountYuan = computed(() => form.amount_yuan)

async function load(): Promise<void> {
  loading.value = true
  try {
    const [orderRes, reasonRes] = await Promise.all([
      listOrders({ page: 1, page_size: 30 }),
      listRefundReasons(),
    ])
    orders.value = orderRes.orders
    reasons.value = reasonRes.reasons
    if (!selectedOrderId.value && refundableOrders.value.length) {
      selectOrder(refundableOrders.value[0])
    }
    syncReason()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function selectOrder(order: Order): void {
  selectedOrderId.value = order.id
  form.amount_yuan = Number((order.payable_cents / 100).toFixed(2))
  step.value = 2
}

/** 切换售后类型时同步默认原因 */
function changeType(value: number): void {
  form.type = value
  syncReason()
}

function syncReason(): void {
  const first = reasons.value.find((item) => item.type === form.type)
  form.reason = first?.name ?? ''
}

function nextStep(): void {
  if (step.value === 1 && !selectedOrder.value) {
    app.warning('请先选择要申请售后的订单')
    return
  }
  if (step.value === 3 && !form.reason) {
    app.warning('请选择售后原因')
    return
  }
  step.value = Math.min(4, step.value + 1)
}

function prevStep(): void {
  step.value = Math.max(1, step.value - 1)
}

async function submit(): Promise<void> {
  const order = selectedOrder.value
  if (!order) {
    app.warning('请先选择要申请售后的订单')
    return
  }
  if (!form.reason) {
    app.warning('请选择售后原因')
    return
  }
  submitting.value = true
  try {
    await applyRefund({
      order_id: order.id,
      amount_cents: Math.round(amountYuan.value * 100),
      reason: form.reason,
      description: form.description,
    })
    app.success('售后申请已提交，请等待平台审核')
    router.push('/after-sales')
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="after-sale-apply ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">申请售后</h1>
        <p class="ss-page-sub">按步骤提交退款、退货或换货申请</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/after-sales">售后列表</RouterLink>
    </div>

    <ol class="after-sale-apply__steps ss-card">
      <li
        v-for="(label, index) in ['选择订单', '选择类型', '填写原因', '确认提交']"
        :key="label"
        class="after-sale-apply__step"
        :class="{ 'after-sale-apply__step--active': step === index + 1 }"
      >
        <span class="after-sale-apply__step-index">{{ index + 1 }}</span>
        <span>{{ label }}</span>
      </li>
    </ol>

    <EmptyState
      v-if="!refundableOrders.length && !loading"
      icon="📦"
      title="暂无可申请售后的订单"
      description="只有已付款、待收货或已完成的订单才能申请售后"
      action-text="去看订单"
      @action="router.push('/order/all')"
    />

    <section v-else class="after-sale-apply__panel ss-card">
      <!-- 第 1 步：选择订单 -->
      <div v-if="step === 1" class="after-sale-apply__group">
        <h2 class="after-sale-apply__title">选择需要售后的订单</h2>
        <button
          v-for="order in refundableOrders"
          :key="order.id"
          type="button"
          class="after-sale-apply__order"
          :class="{ 'after-sale-apply__order--active': selectedOrderId === order.id }"
          @click="selectOrder(order)"
        >
          <div class="ss-col">
            <strong>{{ order.order_no }}</strong>
            <span class="ss-muted-block">{{ formatDateTime(order.created_at) }}</span>
            <span class="ss-muted-block">共 {{ order.total_quantity }} 件商品</span>
          </div>
          <span class="after-sale-apply__order-amount ss-num">
            {{ formatYuan(order.payable_cents) }}
          </span>
        </button>
      </div>

      <!-- 第 2 步：选择售后类型 -->
      <div v-else-if="step === 2" class="after-sale-apply__group">
        <h2 class="after-sale-apply__title">选择售后类型</h2>
        <button
          v-for="item in TYPES"
          :key="item.value"
          type="button"
          class="after-sale-apply__type"
          :class="{ 'after-sale-apply__type--active': form.type === item.value }"
          @click="changeType(item.value)"
        >
          <strong>{{ item.label }}</strong>
          <span class="ss-muted-block">{{ item.desc }}</span>
        </button>
      </div>

      <!-- 第 3 步：填写原因与说明 -->
      <div v-else-if="step === 3" class="after-sale-apply__group">
        <h2 class="after-sale-apply__title">选择售后原因</h2>
        <div class="after-sale-apply__reasons">
          <button
            v-for="reason in availableReasons"
            :key="reason.id"
            type="button"
            class="after-sale-apply__reason"
            :class="{ 'after-sale-apply__reason--active': form.reason === reason.name }"
            @click="form.reason = reason.name"
          >
            {{ reason.name }}
          </button>
        </div>

        <label class="ss-field">
          <span class="ss-label">退款金额（元）</span>
          <input v-model.number="form.amount_yuan" class="ss-input" type="number" min="0" step="0.01" />
        </label>

        <label class="ss-field">
          <span class="ss-label">问题说明</span>
          <textarea
            v-model="form.description"
            class="ss-textarea"
            rows="4"
            placeholder="请描述遇到的问题，便于平台快速审核"
          />
        </label>
      </div>

      <!-- 第 4 步：确认提交 -->
      <div v-else class="after-sale-apply__group">
        <h2 class="after-sale-apply__title">确认申请信息</h2>
        <div class="after-sale-apply__confirm">
          <div class="after-sale-apply__row">
            <span class="ss-muted-block">订单号</span>
            <span>{{ selectedOrder?.order_no ?? '—' }}</span>
          </div>
          <div class="after-sale-apply__row">
            <span class="ss-muted-block">售后类型</span>
            <span>{{ TYPES.find((item) => item.value === form.type)?.label }}</span>
          </div>
          <div class="after-sale-apply__row">
            <span class="ss-muted-block">售后原因</span>
            <span>{{ form.reason }}</span>
          </div>
          <div class="after-sale-apply__row">
            <span class="ss-muted-block">退款金额</span>
            <strong class="ss-num ss-text-danger">{{ formatYuan(Math.round(amountYuan * 100)) }}</strong>
          </div>
          <div class="after-sale-apply__row">
            <span class="ss-muted-block">问题说明</span>
            <span>{{ form.description || '未填写' }}</span>
          </div>
        </div>
      </div>

      <footer class="after-sale-apply__foot">
        <button
          type="button"
          class="ss-btn ss-btn-outline"
          :disabled="step === 1"
          @click="prevStep"
        >
          上一步
        </button>
        <span class="ss-grow" />
        <button
          v-if="step < 4"
          type="button"
          class="ss-btn ss-btn-primary"
          @click="nextStep"
        >
          下一步
        </button>
        <button
          v-else
          type="button"
          class="ss-btn ss-btn-primary"
          :disabled="submitting"
          @click="submit"
        >
          {{ submitting ? '提交中…' : '提交申请' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.after-sale-apply__steps {
  display: flex;
  gap: var(--ss-space-5);
  padding: var(--ss-space-3) var(--ss-space-5);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.after-sale-apply__step {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
}

.after-sale-apply__step-index {
  width: 24px;
  height: 24px;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-neutral-200);
  color: var(--ss-color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--ss-font-size-xs);
}

.after-sale-apply__step--active {
  color: var(--ss-color-brand-600);
  font-weight: var(--ss-font-weight-medium);
}

.after-sale-apply__step--active .after-sale-apply__step-index {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.after-sale-apply__panel {
  padding: var(--ss-space-5);
}

.after-sale-apply__group {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
}

.after-sale-apply__title {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-1);
}

.after-sale-apply__order {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-3) var(--ss-space-4);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-card);
  cursor: pointer;
  text-align: left;
}

.after-sale-apply__order--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
}

.after-sale-apply__order-amount {
  font-size: var(--ss-font-size-lg);
  color: var(--ss-color-danger-600);
}

.after-sale-apply__type {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
  padding: var(--ss-space-3) var(--ss-space-4);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-card);
  cursor: pointer;
  text-align: left;
}

.after-sale-apply__type--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
}

.after-sale-apply__reasons {
  display: flex;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
}

.after-sale-apply__reason {
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-bg-card);
  padding: var(--ss-space-2) var(--ss-space-4);
  cursor: pointer;
  font-size: var(--ss-font-size-sm);
}

.after-sale-apply__reason--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.after-sale-apply__confirm {
  display: flex;
  flex-direction: column;
}

.after-sale-apply__row {
  display: flex;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-2) 0;
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.after-sale-apply__row:last-child {
  border-bottom: 0;
}

.after-sale-apply__foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  margin-top: var(--ss-space-5);
  padding-top: var(--ss-space-4);
  border-top: 1px solid var(--ss-color-border-subtle);
}
</style>
