<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { createRecharge, getRechargeConfig } from '@/api/payment'
import { useAppStore } from '@/stores/app'
import type { RechargeConfig } from '@/types'
import { formatYuan } from '@/utils/format'

/**
 * 余额充值
 * 数据来源 GET /api/v1/payments/recharge-config、POST /api/v1/payments/recharge。
 */
const router = useRouter()
const app = useAppStore()

/** 充值渠道（与收银台保持一致的枚举顺序） */
const CHANNELS = [
  { value: 1, label: '微信支付', icon: '💚' },
  { value: 2, label: '支付宝', icon: '💙' },
  { value: 3, label: '余额支付', icon: '🧡', disabled: true },
]

const config = ref<RechargeConfig | null>(null)
const amountYuan = ref(100)
const channel = ref(1)
const submitting = ref(false)
const loading = ref(false)

/** 金额是否在允许区间内 */
const amountValid = computed(() => {
  if (!config.value) return false
  const cents = Math.round(amountYuan.value * 100)
  return cents >= config.value.min_amount_cents && cents <= config.value.max_amount_cents
})

/** 充值到账金额（含赠送） */
const bonusCents = computed(() => {
  if (!config.value) return 0
  const cents = Math.round(amountYuan.value * 100)
  return cents >= 10000 ? config.value.register_bonus_cents : 0
})

/** 实付金额（分） */
const payCents = computed(() => Math.round(amountYuan.value * 100))

async function load(): Promise<void> {
  loading.value = true
  try {
    config.value = await getRechargeConfig()
    if (config.value.preset_amounts.length) {
      amountYuan.value = config.value.preset_amounts[0] / 100
    }
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function pickAmount(cents: number): void {
  amountYuan.value = cents / 100
}

async function submit(): Promise<void> {
  if (!amountValid.value) {
    app.warning('充值金额需在允许区间内')
    return
  }
  submitting.value = true
  try {
    const order = await createRecharge({ amount_cents: payCents.value, channel: channel.value })
    app.success(`充值单已创建：${order.recharge_no}`)
    router.push(`/pay-result?rechargeNo=${order.recharge_no}`)
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="recharge ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">余额充值</h1>
        <p class="ss-page-sub">充值余额后可用于订单支付，充值越多赠送越多</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/member">会员中心</RouterLink>
    </div>

    <section class="recharge__panel ss-card">
      <h2 class="recharge__title">选择充值金额</h2>
      <div v-if="config" class="recharge__presets">
        <button
          v-for="item in config.preset_amounts"
          :key="item"
          type="button"
          class="recharge__preset"
          :class="{ 'recharge__preset--active': Math.round(amountYuan * 100) === item }"
          @click="pickAmount(item)"
        >
          {{ formatYuan(item, false) }} 元
        </button>
      </div>

      <label class="ss-field">
        <span class="ss-label">自定义金额（元）</span>
        <input v-model.number="amountYuan" class="ss-input" type="number" min="0" step="0.01" />
      </label>

      <p v-if="config" class="recharge__range ss-muted-block">
        单笔可充值 {{ formatYuan(config.min_amount_cents, false) }} -
        {{ formatYuan(config.max_amount_cents, false) }} 元
      </p>

      <h2 class="recharge__title">选择支付方式</h2>
      <div class="recharge__channels">
        <button
          v-for="item in CHANNELS"
          :key="item.value"
          type="button"
          class="recharge__channel"
          :class="{ 'recharge__channel--active': channel === item.value }"
          :disabled="item.disabled"
          @click="channel = item.value"
        >
          <span class="recharge__channel-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
          <span v-if="item.disabled" class="ss-muted-block">暂不可用</span>
        </button>
      </div>

      <section class="recharge__summary">
        <div class="recharge__row">
          <span class="ss-muted-block">充值金额</span>
          <span class="ss-num">{{ formatYuan(payCents) }}</span>
        </div>
        <div v-if="bonusCents > 0" class="recharge__row">
          <span class="ss-muted-block">赠送金额</span>
          <span class="ss-num ss-text-success">+{{ formatYuan(bonusCents) }}</span>
        </div>
        <div class="recharge__row">
          <span class="ss-muted-block">到账余额</span>
          <strong class="ss-num ss-text-brand">{{ formatYuan(payCents + bonusCents) }}</strong>
        </div>
      </section>

      <p v-if="config?.first_recharge_bonus_desc" class="recharge__bonus">
        🎁 {{ config.first_recharge_bonus_desc }}
      </p>

      <footer class="recharge__foot">
        <button
          type="button"
          class="ss-btn ss-btn-primary ss-btn-lg"
          :disabled="!amountValid || submitting"
          @click="submit"
        >
          {{ submitting ? '提交中…' : `立即充值 ${formatYuan(payCents)}` }}
        </button>
        <span v-if="!amountValid" class="ss-error-text">充值金额需在允许区间内</span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.recharge__panel {
  padding: var(--ss-space-5);
  max-width: 640px;
}

.recharge__title {
  font-size: var(--ss-font-size-md);
  margin-bottom: var(--ss-space-3);
}

.recharge__presets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
}

.recharge__preset {
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-card);
  padding: var(--ss-space-3);
  cursor: pointer;
  font-weight: var(--ss-font-weight-medium);
}

.recharge__preset--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
  color: var(--ss-color-brand-700);
}

.recharge__range {
  margin: var(--ss-space-1) 0 var(--ss-space-4);
  font-size: var(--ss-font-size-xs);
}

.recharge__channels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
}

.recharge__channel {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-card);
  padding: var(--ss-space-3);
  cursor: pointer;
  font-size: var(--ss-font-size-sm);
}

.recharge__channel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.recharge__channel--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
}

.recharge__channel-icon {
  font-size: 18px;
}

.recharge__summary {
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  margin-bottom: var(--ss-space-3);
}

.recharge__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-3);
  padding: var(--ss-space-1) 0;
}

.recharge__row strong {
  font-size: var(--ss-font-size-xl);
}

.recharge__bonus {
  margin: 0 0 var(--ss-space-3);
  color: var(--ss-color-warning-700);
  font-size: var(--ss-font-size-sm);
}

.recharge__foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  flex-wrap: wrap;
}
</style>
