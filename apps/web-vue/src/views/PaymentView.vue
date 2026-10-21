<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LoadingState from '@/components/LoadingState.vue'
import { createPayment, notifyPayment, PAYMENT_CHANNELS, queryPayment } from '@/api/payment'
import { getOrder } from '@/api/order'
import { useAppStore } from '@/stores/app'
import type { OrderDetail, Payment } from '@/types'
import { formatYuan } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const app = useAppStore()

const orderId = computed(() => Number(route.params.orderId))
const order = ref<OrderDetail | null>(null)
const payment = ref<Payment | null>(null)
const channel = ref(1)
const creating = ref(false)
const paying = ref(false)
const polling = ref(false)
const paid = ref(false)
const errorMessage = ref('')
let timer: number | null = null

const amount = computed(() => order.value?.order.payable_cents ?? 0)
const payParams = computed(() => Object.entries(payment.value?.pay_params ?? {}))

async function loadOrder(): Promise<void> {
  try {
    order.value = await getOrder(orderId.value)
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '订单加载失败'
  }
}

async function create(): Promise<void> {
  creating.value = true
  try {
    payment.value = await createPayment({ order_id: orderId.value, channel: channel.value })
    app.success('支付单已创建')
  } catch {
    // 错误提示已由接口层处理
  } finally {
    creating.value = false
  }
}

async function poll(): Promise<void> {
  if (!payment.value) return
  polling.value = true
  try {
    const result = await queryPayment({
      payment_id: payment.value.id,
      order_id: orderId.value,
    })
    payment.value = result
    if (result.status === 'PAYMENT_STATUS_SUCCESS') {
      paid.value = true
      stopPoll()
    } else if (result.status === 'PAYMENT_STATUS_FAILED' || result.status === 'PAYMENT_STATUS_CLOSED') {
      stopPoll()
      app.error(result.fail_reason || '支付失败，请重试')
    }
  } catch {
    stopPoll()
  }
}

/** 演示环境：模拟第三方支付完成回调 */
async function simulatePay(): Promise<void> {
  if (!payment.value) return
  paying.value = true
  try {
    await notifyPayment({
      payment_no: payment.value.payment_no,
      transaction_id: `demo${Date.now()}`,
      signature: 'demo-signature',
      raw_body: '',
      status: 2,
    })
    await poll()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    paying.value = false
  }
}

function startPoll(): void {
  stopPoll()
  polling.value = true
  timer = window.setInterval(poll, 1500)
}

function stopPoll(): void {
  if (timer !== null) {
    window.clearInterval(timer)
    timer = null
  }
  polling.value = false
}

onMounted(loadOrder)
onBeforeUnmount(stopPoll)
</script>

<template>
  <div class="payment ss-container ss-page">
    <section v-if="errorMessage" class="ss-card ss-card-pad">
      <EmptyState
        icon="🧾"
        title="订单加载失败"
        :description="errorMessage"
        action-text="返回订单列表"
        @action="router.push('/order')"
      />
    </section>

    <div v-else class="ss-page-head">
      <div>
        <h1 class="ss-page-title">收银台</h1>
        <p class="ss-page-sub">订单号 {{ order?.order.order_no ?? orderId }}</p>
      </div>
    </div>

    <div class="payment__layout">
      <section class="ss-card ss-card-pad">
        <div class="payment__amount">
          <span class="ss-muted-block">应付金额</span>
          <strong class="ss-num">{{ formatYuan(amount) }}</strong>
        </div>

        <div class="payment__channels">
          <button
            v-for="item in PAYMENT_CHANNELS"
            :key="item.value"
            type="button"
            class="payment__channel"
            :class="{ 'payment__channel--active': channel === item.value }"
            @click="channel = item.value"
          >
            <span class="payment__channel-icon">{{ item.icon }}</span>
            <span class="ss-col">
              <strong>{{ item.label }}</strong>
              <small class="ss-muted-block">{{ item.desc }}</small>
            </span>
          </button>
        </div>

        <div v-if="payment && !paid" class="payment__params">
          <div class="ss-row-between">
            <h3>支付参数</h3>
            <span class="ss-tag ss-tag-warning">待支付</span>
          </div>
          <table class="payment__table">
            <tbody>
              <tr>
                <th>支付单号</th>
                <td>{{ payment.payment_no }}</td>
              </tr>
              <tr>
                <th>预支付标识</th>
                <td>{{ payment.prepay_id || '—' }}</td>
              </tr>
              <tr v-for="[key, value] in payParams" :key="key">
                <th>{{ key }}</th>
                <td>{{ value }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="payment__actions">
          <button
            type="button"
            class="ss-btn ss-btn-outline"
            :disabled="creating"
            @click="create"
          >
            {{ payment ? '重新生成支付单' : '创建支付单' }}
          </button>
          <button
            type="button"
            class="ss-btn ss-btn-primary ss-btn-lg"
            :disabled="!payment || paying || paid"
            @click="simulatePay"
          >
            {{ paying ? '支付处理中…' : '模拟支付' }}
          </button>
          <button
            v-if="payment && !paid"
            type="button"
            class="ss-btn ss-btn-ghost"
            @click="startPoll"
          >
            手动刷新支付状态
          </button>
        </div>

        <p class="ss-muted-block payment__tip">
          演示环境不接入真实支付渠道，点击「模拟支付」会向
          <code>/api/v1/payments/notify</code> 发送回调并轮询支付结果。
        </p>
      </section>

      <aside class="ss-card ss-card-pad payment__order">
        <h3>订单信息</h3>
        <LoadingState v-if="!order" text="加载订单中…" inline />
        <template v-else>
          <div class="ss-row-between"><span class="ss-muted-block">订单号</span><span>{{ order.order.order_no }}</span></div>
          <div class="ss-row-between"><span class="ss-muted-block">商品件数</span><span>{{ order.order.total_quantity }} 件</span></div>
          <div class="ss-row-between"><span class="ss-muted-block">商品总额</span><span class="ss-num">{{ formatYuan(order.order.total_amount_cents) }}</span></div>
          <div class="ss-row-between"><span class="ss-muted-block">优惠</span><span class="ss-num ss-text-danger">-{{ formatYuan(order.order.discount_cents) }}</span></div>
          <div class="ss-row-between"><span class="ss-muted-block">运费</span><span class="ss-num">{{ formatYuan(order.order.freight_cents) }}</span></div>
          <hr class="ss-divider" />
          <div v-for="item in order.items" :key="item.id" class="payment__goods">
            <span class="ss-ellipsis">{{ item.product_title }} × {{ item.quantity }}</span>
            <span class="ss-num">{{ formatYuan(item.subtotal_cents) }}</span>
          </div>
        </template>
      </aside>
    </div>

    <!-- 支付结果 -->
    <div v-if="paid" class="payment__result ss-card">
      <div class="payment__result-icon">✅</div>
      <h2>支付成功</h2>
      <p class="ss-muted-block">订单 {{ order?.order.order_no }} 已完成支付，商家将尽快为你发货。</p>
      <div class="ss-row">
        <button type="button" class="ss-btn ss-btn-primary" @click="router.push(`/order/${orderId}`)">
          查看订单
        </button>
        <button
          type="button"
          class="ss-btn ss-btn-outline"
          @click="router.push(`/pay-result?order_id=${orderId}`)"
        >
          支付结果
        </button>
        <button type="button" class="ss-btn ss-btn-ghost" @click="router.push('/')">
          返回首页
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.payment__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: var(--ss-space-5);
  align-items: start;
}

.payment__amount {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
  padding-bottom: var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.payment__amount strong {
  font-size: var(--ss-font-size-4xl);
  color: var(--ss-color-danger-600);
}

.payment__channels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--ss-space-3);
  margin: var(--ss-space-4) 0;
}

.payment__channel {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-card);
  cursor: pointer;
  text-align: left;
}

.payment__channel--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
}

.payment__channel-icon {
  font-size: 24px;
}

.payment__params {
  padding: var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  margin-bottom: var(--ss-space-4);
}

.payment__params h3 {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-3);
}

.payment__table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--ss-font-size-sm);
}

.payment__table th,
.payment__table td {
  text-align: left;
  padding: var(--ss-space-2) 0;
  border-bottom: 1px dashed var(--ss-color-border-subtle);
  word-break: break-all;
}

.payment__table th {
  width: 120px;
  color: var(--ss-color-text-tertiary);
  font-weight: var(--ss-font-weight-regular);
}

.payment__actions {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  flex-wrap: wrap;
}

.payment__tip {
  margin-top: var(--ss-space-4);
  line-height: var(--ss-font-line-height-relaxed);
}

.payment__order h3 {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-3);
}

.payment__order .ss-row-between {
  padding: var(--ss-space-2) 0;
  font-size: var(--ss-font-size-md);
}

.payment__goods {
  display: flex;
  justify-content: space-between;
  gap: var(--ss-space-3);
  padding: var(--ss-space-1) 0;
  font-size: var(--ss-font-size-sm);
}

.payment__result {
  margin-top: var(--ss-space-5);
  padding: var(--ss-space-8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ss-space-3);
  text-align: center;
}

.payment__result-icon {
  font-size: 56px;
}

@media (max-width: 1023px) {
  .payment__layout {
    grid-template-columns: 1fr;
  }

  .payment__channels {
    grid-template-columns: 1fr;
  }
}
</style>
