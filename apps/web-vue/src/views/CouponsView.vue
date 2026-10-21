<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import { listUserCoupons } from '@/api/marketing'
import { useUserStore } from '@/stores/user'
import type { UserCoupon } from '@/types'
import { couponTypeText, userCouponStatusText, userCouponStatusTone } from '@/utils/enums'
import { formatDateTime, formatYuan } from '@/utils/format'

const userStore = useUserStore()

const tabs = [
  { value: 1, label: '未使用' },
  { value: 2, label: '已使用' },
  { value: 3, label: '已过期' },
]

const activeTab = ref(1)
const coupons = ref<UserCoupon[]>([])

async function load(): Promise<void> {
  const result = await listUserCoupons({ status: activeTab.value, page: 1, page_size: 50 })
  coupons.value = result.coupons
  await userStore.loadCoupons()
}

watch(activeTab, load)
onMounted(load)
</script>

<template>
  <div class="coupons ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">我的优惠券</h1>
        <p class="ss-page-sub">结算时可直接选择可用券抵扣</p>
      </div>
      <RouterLink class="ss-btn ss-btn-primary" to="/coupon-center">去领券中心</RouterLink>
    </div>

    <div class="coupons__tabs ss-card">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="coupons__tab"
        :class="{ 'coupons__tab--active': activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
      </button>
    </div>

    <EmptyState
      v-if="!coupons.length"
      icon="🎟️"
      title="暂无优惠券"
      description="参与平台活动即可领取优惠券"
      action-text="去看看活动"
      @action="$router.push('/')"
    />

    <div v-else class="coupons__list">
      <section
        v-for="item in coupons"
        :key="item.id"
        class="coupons__card ss-card"
        :class="{ 'coupons__card--disabled': item.status !== 'USER_COUPON_STATUS_UNUSED' }"
      >
        <div class="coupons__value">
          <strong>
            {{ item.coupon.type === 'COUPON_TYPE_PERCENT'
              ? `${item.coupon.percent / 10}折`
              : item.coupon.type === 'COUPON_TYPE_SHIPPING'
                ? '免运费'
                : formatYuan(item.coupon.face_value_cents) }}
          </strong>
          <span>{{ couponTypeText(item.coupon.type) }}</span>
        </div>
        <div class="ss-grow ss-col">
          <strong>{{ item.coupon.name }}</strong>
          <span class="ss-muted-block">
            满 {{ formatYuan(item.coupon.min_amount_cents) }} 可用 ·
            有效期至 {{ formatDateTime(item.coupon.end_time) }}
          </span>
          <span class="ss-muted-block">领取时间：{{ formatDateTime(item.received_at) }}</span>
        </div>
        <span class="ss-tag" :class="`ss-tag-${userCouponStatusTone(item.status)}`">
          {{ userCouponStatusText(item.status) }}
        </span>
      </section>
    </div>
  </div>
</template>

<style scoped>
.coupons__tabs {
  display: flex;
  gap: var(--ss-space-1);
  padding: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
}

.coupons__tab {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
}

.coupons__tab--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.coupons__list {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
}

.coupons__card {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
}

.coupons__card--disabled {
  opacity: 0.62;
  background: var(--ss-color-neutral-25);
}

.coupons__value {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120px;
  flex: none;
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-gradient-accent);
  color: var(--ss-color-text-inverse);
}

.coupons__value strong {
  font-size: var(--ss-font-size-2xl);
  font-family: var(--ss-font-family-numeric);
}

.coupons__value span {
  font-size: var(--ss-font-size-xs);
  opacity: 0.9;
}

@media (max-width: 767px) {
  .coupons__card {
    flex-wrap: wrap;
  }

  .coupons__value {
    width: 96px;
  }
}
</style>
