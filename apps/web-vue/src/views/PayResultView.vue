<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import { queryPayment } from '@/api/payment'
import { useAppStore } from '@/stores/app'
import type { Payment } from '@/types'
import { paymentChannelText, paymentStatusText } from '@/utils/enums'
import { formatDateTime, formatYuan } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const app = useAppStore()

const orderInput = ref(String(route.query.order_id ?? ''))
const payment = ref<Payment | null>(null)
const loading = ref(false)
const searched = ref(false)

const isSuccess = computed(() => payment.value?.status === 'PAYMENT_STATUS_SUCCESS')
const isFailed = computed(
  () =>
    payment.value?.status === 'PAYMENT_STATUS_FAILED' ||
    payment.value?.status === 'PAYMENT_STATUS_CLOSED',
)

async function query(): Promise<void> {
  const value = Number(orderInput.value)
  if (!Number.isFinite(value) || value <= 0) {
    app.warning('请输入正确的订单 ID')
    return
  }
  loading.value = true
  searched.value = true
  try {
    payment.value = await queryPayment({ order_id: value })
  } catch {
    app.error('支付结果查询失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

function goPay(): void {
  const orderId = payment.value?.order_id ?? Number(orderInput.value)
  router.push({ name: 'payment', params: { orderId: String(orderId) } })
}

onMounted(() => {
  if (orderInput.value) {
    query()
  }
})
</script>

<template>
  <div class="pay-result ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">支付结果</h1>
        <p class="ss-page-sub">查询订单的支付状态与到账信息</p>
      </div>
    </div>

    <section class="ss-card ss-card-pad pay-result__search">
      <div class="pay-result__search-row">
        <input
          v-model="orderInput"
          class="ss-input"
          type="text"
          placeholder="请输入订单 ID"
          @keyup.enter="query"
        />
        <button type="button" class="ss-btn ss-btn-primary" :disabled="loading" @click="query">
          {{ loading ? '查询中…' : '查询支付结果' }}
        </button>
      </div>
    </section>

    <LoadingState v-if="loading" text="正在查询支付结果…" />

    <template v-else-if="searched && payment">
      <section class="pay-result__card ss-card ss-card-pad">
        <div class="pay-result__icon" :class="isSuccess ? 'pay-result__icon--ok' : 'pay-result__icon--fail'">
          {{ isSuccess ? '✅' : isFailed ? '❌' : '⏳' }}
        </div>
        <h2 class="pay-result__status">{{ paymentStatusText(payment.status) }}</h2>
        <p class="ss-muted-block">
          {{
            isSuccess
              ? '支付已到账，商家将尽快为你发货'
              : isFailed
                ? payment.fail_reason || '支付未完成，可重新发起支付'
                : '支付处理中，稍后刷新查看结果'
          }}
        </p>

        <div class="pay-result__meta">
          <div class="ss-row-between"><span class="ss-muted-block">支付单号</span><span>{{ payment.payment_no }}</span></div>
          <div class="ss-row-between"><span class="ss-muted-block">订单号</span><span>{{ payment.order_no }}</span></div>
          <div class="ss-row-between"><span class="ss-muted-block">支付金额</span><span class="ss-num">{{ formatYuan(payment.amount_cents) }}</span></div>
          <div class="ss-row-between"><span class="ss-muted-block">支付方式</span><span>{{ paymentChannelText(payment.channel) }}</span></div>
          <div class="ss-row-between"><span class="ss-muted-block">支付时间</span><span>{{ formatDateTime(payment.paid_at) }}</span></div>
        </div>

        <div class="pay-result__actions">
          <button
            v-if="isSuccess"
            type="button"
            class="ss-btn ss-btn-primary"
            @click="router.push(`/order/${payment.order_id}`)"
          >
            查看订单
          </button>
          <button
            v-else
            type="button"
            class="ss-btn ss-btn-primary"
            @click="goPay"
          >
            {{ isFailed ? '重新支付' : '前往支付' }}
          </button>
          <button type="button" class="ss-btn ss-btn-ghost" @click="router.push('/order')">
            我的订单
          </button>
          <button type="button" class="ss-btn ss-btn-ghost" @click="router.push('/')">
            返回首页
          </button>
        </div>
      </section>
    </template>

    <section v-else-if="searched" class="ss-card ss-card-pad">
      <EmptyState
        icon="🧾"
        title="未找到支付记录"
        description="请确认订单 ID 是否正确，或前往收银台发起支付"
        action-text="前往收银台"
        @action="goPay"
      />
    </section>

    <section v-else class="ss-card ss-card-pad">
      <EmptyState
        icon="🔎"
        title="输入订单 ID 查询"
        description="支付完成后可在这里核对支付状态"
      />
    </section>
  </div>
</template>

<style scoped>
.pay-result__search {
  margin-bottom: var(--ss-space-4);
}

.pay-result__search-row {
  display: flex;
  gap: var(--ss-space-2);
  max-width: 520px;
}

.pay-result__card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ss-space-3);
  text-align: center;
}

.pay-result__icon {
  font-size: 56px;
}

.pay-result__status {
  font-size: var(--ss-font-size-2xl);
}

.pay-result__meta {
  width: min(480px, 100%);
  margin: var(--ss-space-3) 0;
  padding: var(--ss-space-3) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  font-size: var(--ss-font-size-md);
}

.pay-result__meta .ss-row-between {
  padding: var(--ss-space-1) 0;
}

.pay-result__actions {
  display: flex;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
  justify-content: center;
}
</style>
