<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { getAfterSale } from '@/api/order'
import type { AfterSale } from '@/types'
import { formatDateTime, formatYuan } from '@/utils/format'

/**
 * 售后详情
 * 数据来源 GET /api/v1/after-sales/{id}。
 */
const route = useRoute()
const router = useRouter()

const afterSale = ref<AfterSale | null>(null)
const loading = ref(false)

/** 售后类型文案 */
const TYPE_TEXT: Record<number, string> = {
  1: '仅退款',
  2: '退货退款',
  3: '换货',
}

/** 售后状态文案 */
const STATUS_TEXT: Record<number, string> = {
  0: '待审核',
  1: '审核通过',
  2: '审核驳回',
  3: '已退款',
  4: '已完成',
}

/** 状态色板 */
const STATUS_TONE: Record<number, string> = {
  0: 'warning',
  1: 'accent',
  2: 'danger',
  3: 'success',
  4: 'success',
}

/** 处理进度节点 */
const STEPS = [
  { status: 0, label: '提交申请' },
  { status: 1, label: '平台审核' },
  { status: 3, label: '退款到账' },
]

const afterSaleId = computed(() => {
  const raw = route.params.id ?? route.query.id
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : 0
})

/** 当前处于第几步（驳回时停在审核节点） */
const currentStep = computed(() => {
  const status = afterSale.value?.status ?? 0
  if (status === 0) return 0
  if (status === 1 || status === 2) return 1
  return 2
})

async function load(): Promise<void> {
  if (!afterSaleId.value) {
    afterSale.value = null
    return
  }
  loading.value = true
  try {
    afterSale.value = await getAfterSale(afterSaleId.value)
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

watch(afterSaleId, load)
onMounted(load)
</script>

<template>
  <div class="after-sale-detail ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">售后详情</h1>
        <p class="ss-page-sub">工单信息与处理进度</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/after-sales">售后列表</RouterLink>
    </div>

    <EmptyState
      v-if="!afterSale && !loading"
      icon="📄"
      title="工单不存在"
      description="该售后工单可能已被删除，去售后列表看看其它工单"
      action-text="返回售后列表"
      @action="router.push('/after-sales')"
    />

    <template v-else-if="afterSale">
      <section class="after-sale-detail__status ss-card">
        <div class="after-sale-detail__status-head">
          <strong class="ss-num">{{ afterSale.after_sale_no }}</strong>
          <span class="ss-grow" />
          <span class="ss-tag" :class="`ss-tag-${STATUS_TONE[afterSale.status] ?? 'neutral'}`">
            {{ STATUS_TEXT[afterSale.status] ?? '处理中' }}
          </span>
        </div>
        <div class="after-sale-detail__steps">
          <div
            v-for="(step, index) in STEPS"
            :key="step.label"
            class="after-sale-detail__step"
            :class="{
              'after-sale-detail__step--done': index <= currentStep,
              'after-sale-detail__step--current': index === currentStep,
            }"
          >
            <span class="after-sale-detail__step-dot">{{ index + 1 }}</span>
            <span class="after-sale-detail__step-label">{{ step.label }}</span>
          </div>
        </div>
        <p v-if="afterSale.status === 2" class="after-sale-detail__reject ss-text-danger">
          该申请已被驳回：{{ afterSale.admin_remark || '未填写原因' }}
        </p>
      </section>

      <section class="after-sale-detail__info ss-card">
        <h2 class="after-sale-detail__title">工单信息</h2>
        <div class="after-sale-detail__row">
          <span class="after-sale-detail__label">关联订单</span>
          <RouterLink class="ss-text-brand" :to="`/order/${afterSale.order_id}`">
            {{ afterSale.order_no }}
          </RouterLink>
        </div>
        <div class="after-sale-detail__row">
          <span class="after-sale-detail__label">售后类型</span>
          <span>{{ TYPE_TEXT[afterSale.type] ?? '售后' }}</span>
        </div>
        <div class="after-sale-detail__row">
          <span class="after-sale-detail__label">退款金额</span>
          <strong class="ss-num ss-text-danger">{{ formatYuan(afterSale.amount_cents) }}</strong>
        </div>
        <div class="after-sale-detail__row">
          <span class="after-sale-detail__label">售后原因</span>
          <span>{{ afterSale.reason || '未填写' }}</span>
        </div>
        <div class="after-sale-detail__row">
          <span class="after-sale-detail__label">问题说明</span>
          <span>{{ afterSale.description || '未填写' }}</span>
        </div>
        <div class="after-sale-detail__row">
          <span class="after-sale-detail__label">申请时间</span>
          <span>{{ formatDateTime(afterSale.created_at) }}</span>
        </div>
        <div v-if="afterSale.processed_at" class="after-sale-detail__row">
          <span class="after-sale-detail__label">处理时间</span>
          <span>{{ formatDateTime(afterSale.processed_at) }}</span>
        </div>
        <div v-if="afterSale.admin_remark" class="after-sale-detail__row">
          <span class="after-sale-detail__label">商家备注</span>
          <span>{{ afterSale.admin_remark }}</span>
        </div>
      </section>

      <div class="after-sale-detail__actions">
        <RouterLink class="ss-btn ss-btn-outline" to="/after-sales">返回列表</RouterLink>
        <RouterLink class="ss-btn ss-btn-primary" :to="`/order/${afterSale.order_id}`">查看订单</RouterLink>
      </div>
    </template>
  </div>
</template>

<style scoped>
.after-sale-detail__status {
  padding: var(--ss-space-5);
  margin-bottom: var(--ss-space-4);
}

.after-sale-detail__status-head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  margin-bottom: var(--ss-space-4);
}

.after-sale-detail__steps {
  display: flex;
  gap: var(--ss-space-4);
  flex-wrap: wrap;
}

.after-sale-detail__step {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  color: var(--ss-color-text-tertiary);
}

.after-sale-detail__step-dot {
  width: 28px;
  height: 28px;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-neutral-200);
  color: var(--ss-color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--ss-font-size-sm);
  font-weight: var(--ss-font-weight-semibold);
}

.after-sale-detail__step--done {
  color: var(--ss-color-text-primary);
}

.after-sale-detail__step--done .after-sale-detail__step-dot {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.after-sale-detail__step--current .after-sale-detail__step-dot {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  box-shadow: var(--ss-shadow-brand);
}

.after-sale-detail__reject {
  margin: var(--ss-space-3) 0 0;
  font-size: var(--ss-font-size-sm);
}

.after-sale-detail__info {
  padding: var(--ss-space-5);
  margin-bottom: var(--ss-space-4);
}

.after-sale-detail__title {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-3);
}

.after-sale-detail__row {
  display: flex;
  gap: var(--ss-space-4);
  padding: var(--ss-space-2) 0;
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.after-sale-detail__row:last-child {
  border-bottom: 0;
}

.after-sale-detail__label {
  width: 100px;
  flex: none;
  color: var(--ss-color-text-tertiary);
}

.after-sale-detail__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
}

@media (max-width: 767px) {
  .after-sale-detail__row {
    flex-direction: column;
    gap: var(--ss-space-1);
  }

  .after-sale-detail__label {
    width: auto;
  }
}
</style>
