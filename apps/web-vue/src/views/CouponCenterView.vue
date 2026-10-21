<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { listCoupons, listUserCoupons, receiveCoupon } from '@/api/marketing'
import { useAppStore } from '@/stores/app'
import type { Coupon, PageMeta } from '@/types'
import { couponTypeText } from '@/utils/enums'
import { formatDateTime, formatNumber, formatYuan } from '@/utils/format'

const router = useRouter()
const app = useAppStore()

const coupons = ref<Coupon[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 20, total: 0, total_pages: 1 })
const loading = ref(false)
const receiving = ref<number | null>(null)
/** 本地记录已领取的券，防止重复提交 */
const received = ref<Set<number>>(new Set())

const PAGE_SIZE = 20

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listCoupons({ page: meta.value.page, page_size: PAGE_SIZE })
    coupons.value = result.coupons
    meta.value = result.meta
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

/** 已持有的券不能重复领取，后端也会拒绝重复领取 */
async function loadReceived(): Promise<void> {
  try {
    const result = await listUserCoupons({ page: 1, page_size: 100 })
    const ids = result.coupons
      .filter((item) => item.status !== 'USER_COUPON_STATUS_EXPIRED')
      .map((item) => item.coupon_id)
    received.value = new Set(ids)
  } catch {
    // 未登录或接口不可用时忽略，仅影响按钮态
  }
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
}

/** 券面额展示：满减 / 折扣 / 免运费 */
function valueText(coupon: Coupon): string {
  if (coupon.type === 'COUPON_TYPE_PERCENT') return `${coupon.percent / 10} 折`
  if (coupon.type === 'COUPON_TYPE_SHIPPING') return '免运费'
  return formatYuan(coupon.face_value_cents)
}

function soldText(coupon: Coupon): string {
  const total = coupon.total_quantity || 0
  const got = coupon.received_quantity || 0
  if (!total) return `已领取 ${formatNumber(got)} 张`
  return `已领取 ${formatNumber(got)} / ${formatNumber(total)} 张`
}

function progressPercent(coupon: Coupon): number {
  const total = coupon.total_quantity || 0
  if (!total) return 0
  return Math.min(100, Math.round(((coupon.received_quantity || 0) / total) * 100))
}

async function onReceive(coupon: Coupon): Promise<void> {
  if (received.value.has(coupon.id)) return
  receiving.value = coupon.id
  try {
    await receiveCoupon(coupon.id)
    const next = new Set(received.value)
    next.add(coupon.id)
    received.value = next
    coupon.received_quantity += 1
    app.success(`「${coupon.name}」领取成功，可在「我的优惠券」查看`)
  } catch {
    // 错误提示已由接口层处理
  } finally {
    receiving.value = null
  }
}

onMounted(() => {
  load()
  loadReceived()
})
</script>

<template>
  <div class="coupon-center ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">领券中心</h1>
        <p class="ss-page-sub">领取平台优惠券，结算时可直接抵扣</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline" to="/user/coupons">我的优惠券</RouterLink>
    </div>

    <EmptyState
      v-if="!coupons.length && !loading"
      icon="🎟️"
      title="暂无可领取的优惠券"
      description="平台活动开启后会在这里放出优惠券"
      action-text="去逛逛"
      @action="router.push('/category')"
    />

    <div v-else class="coupon-center__list">
      <section v-for="coupon in coupons" :key="coupon.id" class="coupon-center__card ss-card">
        <div class="coupon-center__value">
          <strong>{{ valueText(coupon) }}</strong>
          <span>{{ couponTypeText(coupon.type) }}</span>
        </div>

        <div class="ss-grow ss-col">
          <div class="ss-row">
            <strong>{{ coupon.name }}</strong>
            <span class="ss-tag ss-tag-neutral">{{ coupon.code }}</span>
          </div>
          <span class="ss-muted-block">满 {{ formatYuan(coupon.min_amount_cents) }} 可用</span>
          <span class="ss-muted-block">
            有效期至 {{ formatDateTime(coupon.end_time) }}
            <template v-if="coupon.category_id"> · 限指定分类使用</template>
          </span>

          <div class="coupon-center__progress">
            <div class="coupon-center__track">
              <div
                class="coupon-center__fill"
                :style="{ width: `${progressPercent(coupon)}%` }"
              />
            </div>
            <span class="ss-muted-block">{{ soldText(coupon) }}</span>
          </div>
        </div>

        <button
          type="button"
          class="ss-btn ss-btn-primary coupon-center__btn"
          :disabled="received.has(coupon.id) || receiving === coupon.id"
          @click="onReceive(coupon)"
        >
          {{ received.has(coupon.id) ? '已领取' : receiving === coupon.id ? '领取中…' : '立即领取' }}
        </button>
      </section>
    </div>

    <Pagination
      :page="meta.page"
      :page-size="meta.page_size"
      :total="meta.total"
      @change="changePage"
    />
  </div>
</template>

<style scoped>
.coupon-center__list {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
}

.coupon-center__card {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4) var(--ss-space-5);
}

.coupon-center__value {
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

.coupon-center__value strong {
  font-size: var(--ss-font-size-2xl);
  font-family: var(--ss-font-family-numeric);
}

.coupon-center__value span {
  font-size: var(--ss-font-size-xs);
  opacity: 0.9;
}

.coupon-center__progress {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  margin-top: var(--ss-space-1);
}

.coupon-center__track {
  flex: 1;
  max-width: 260px;
  height: 6px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-100);
  overflow: hidden;
}

.coupon-center__fill {
  height: 100%;
  background: var(--ss-color-accent-500);
  border-radius: var(--ss-radius-pill);
}

.coupon-center__btn {
  flex: none;
}

@media (max-width: 767px) {
  .coupon-center__card {
    flex-wrap: wrap;
  }

  .coupon-center__value {
    width: 96px;
  }

  .coupon-center__btn {
    width: 100%;
  }
}
</style>
