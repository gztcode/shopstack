<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import PriceText from '@/components/PriceText.vue'
import { calculateFreight } from '@/api/logistics'
import { listRegions } from '@/api/user'
import { useAppStore } from '@/stores/app'
import type { FreightQuote, Region } from '@/types'
import { formatYuan } from '@/utils/format'

/**
 * 运费试算
 * 数据来源 POST /api/v1/logistics/freight，地区选项来自 GET /api/v1/regions。
 */
const app = useAppStore()

const regions = ref<Region[]>([])
const amountYuan = ref(199)
const quantity = ref(1)
const region = ref('')
const quote = ref<FreightQuote | null>(null)
const loading = ref(false)

/** 距免运费还差多少（分） */
const gapCents = computed(() => {
  if (!quote.value || quote.value.free) return 0
  return Math.max(0, quote.value.free_freight_amount_cents - Math.round(amountYuan.value * 100))
})

async function loadRegions(): Promise<void> {
  try {
    const result = await listRegions()
    regions.value = result.regions
  } catch {
    // 错误提示已由接口层处理
  }
}

async function calc(): Promise<void> {
  if (!Number.isFinite(amountYuan.value) || amountYuan.value < 0) {
    app.warning('请输入正确的商品金额')
    return
  }
  loading.value = true
  try {
    quote.value = await calculateFreight({
      amount_cents: Math.round(amountYuan.value * 100),
      region: region.value || undefined,
      quantity: quantity.value,
    })
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadRegions()
  await calc()
})
</script>

<template>
  <div class="freight-calc ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">运费试算</h1>
        <p class="ss-page-sub">按金额、件数与收货地区估算配送费用</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/logistics-traces">物流轨迹</RouterLink>
    </div>

    <section class="freight-calc__form ss-card">
      <label class="ss-field">
        <span class="ss-label">商品金额（元）</span>
        <input v-model.number="amountYuan" class="ss-input" type="number" min="0" step="0.01" />
      </label>

      <label class="ss-field">
        <span class="ss-label">商品件数</span>
        <input v-model.number="quantity" class="ss-input" type="number" min="1" max="99" />
      </label>

      <label class="ss-field">
        <span class="ss-label">收货地区</span>
        <select v-model="region" class="ss-select">
          <option value="">不指定地区</option>
          <option v-for="item in regions" :key="item.id" :value="item.name">
            {{ item.name }}
          </option>
        </select>
      </label>

      <button type="button" class="ss-btn ss-btn-primary" :disabled="loading" @click="calc">
        {{ loading ? '试算中…' : '开始试算' }}
      </button>
    </section>

    <section v-if="quote" class="freight-calc__result ss-card">
      <div class="freight-calc__amount">
        <span class="ss-muted-block">预估运费</span>
        <PriceText
          :cents="quote.freight_cents"
          size="xl"
          :tone="quote.free ? 'brand' : 'danger'"
        />
      </div>
      <div class="freight-calc__detail">
        <div class="freight-calc__row">
          <span class="ss-muted-block">配送模板</span>
          <span>{{ quote.template_name }}</span>
        </div>
        <div class="freight-calc__row">
          <span class="ss-muted-block">包邮门槛</span>
          <span class="ss-num">{{ formatYuan(quote.free_freight_amount_cents) }}</span>
        </div>
        <div class="freight-calc__row">
          <span class="ss-muted-block">是否包邮</span>
          <span :class="quote.free ? 'ss-text-success' : 'ss-text-danger'">
            {{ quote.free ? '已包邮' : '需支付运费' }}
          </span>
        </div>
        <p v-if="quote.remark" class="freight-calc__remark">{{ quote.remark }}</p>
        <p v-if="!quote.free && gapCents > 0" class="ss-text-brand freight-calc__gap">
          再买 {{ formatYuan(gapCents) }} 即可免运费
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.freight-calc__form {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--ss-space-4);
  align-items: end;
  padding: var(--ss-space-5);
  margin-bottom: var(--ss-space-4);
}

.freight-calc__result {
  display: flex;
  gap: var(--ss-space-8);
  padding: var(--ss-space-5);
  flex-wrap: wrap;
}

.freight-calc__amount {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
  min-width: 180px;
}

.freight-calc__detail {
  flex: 1;
  min-width: 260px;
}

.freight-calc__row {
  display: flex;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-2) 0;
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.freight-calc__row:last-of-type {
  border-bottom: 0;
}

.freight-calc__remark {
  margin: var(--ss-space-2) 0 0;
  color: var(--ss-color-text-secondary);
  font-size: var(--ss-font-size-sm);
}

.freight-calc__gap {
  margin: var(--ss-space-1) 0 0;
  font-size: var(--ss-font-size-sm);
}
</style>
