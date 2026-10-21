<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { listPointsLogs, getProfile } from '@/api/user'
import { listUserCoupons } from '@/api/marketing'
import { getOrderCount } from '@/api/order'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import type { OrderCount, User } from '@/types'
import { formatNumber, formatYuan } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const auth = useAuthStore()
const userStore = useUserStore()

const profile = ref<User | null>(null)
const totalEarned = ref(0)
const couponCount = ref(0)
const orderCount = ref<OrderCount>({
  pending_payment: 0,
  pending_shipment: 0,
  pending_receipt: 0,
  refunding: 0,
})

/** 会员等级：proto 中 User 没有 level 字段，这里按积分换算等级 */
const LEVELS = [
  { name: '青铜会员', min: 0, next: 1000, icon: '🥉' },
  { name: '白银会员', min: 1000, next: 3000, icon: '🥈' },
  { name: '黄金会员', min: 3000, next: 6000, icon: '🥇' },
  { name: '钻石会员', min: 6000, next: 12000, icon: '💎' },
]

const level = computed(() => {
  const points = profile.value?.points ?? 0
  let current = LEVELS[0]
  for (const item of LEVELS) {
    if (points >= item.min) current = item
  }
  const next = LEVELS.find((item) => item.min > current.min) ?? null
  const progress = next ? Math.min(100, Math.round(((points - current.min) / (next.min - current.min)) * 100)) : 100
  return { current, next, progress }
})

const benefits = computed(() => [
  { label: '积分中心', icon: '🎯', desc: '积分明细与兑换', path: '/points' },
  { label: '我的优惠券', icon: '🎟️', desc: `已获得 ${couponCount.value} 张`, path: '/user/coupons' },
  { label: '领券中心', icon: '🧧', desc: '领取新优惠券', path: '/coupon-center' },
  { label: '发票管理', icon: '🧾', desc: '申请与下载发票', path: '/invoices' },
  { label: '物流跟踪', icon: '🚚', desc: '查询包裹轨迹', path: '/logistics' },
  { label: '订单轨迹', icon: '🧭', desc: '订单状态流转记录', path: '/order-trace' },
  { label: '售后申请', icon: '↩️', desc: '订单退款处理', path: '/refund' },
  { label: '我的评价', icon: '⭐', desc: '发表与查看评价', path: '/reviews' },
  { label: '浏览足迹', icon: '🕘', desc: '最近浏览的商品', path: '/history' },
  { label: '商品对比', icon: '⚖️', desc: '横向对比商品参数', path: '/compare' },
])

async function load(): Promise<void> {
  const [profileRes, pointsRes, couponRes, countRes] = await Promise.allSettled([
    getProfile(),
    listPointsLogs({ page: 1, page_size: 100 }),
    listUserCoupons({ page: 1, page_size: 50 }),
    getOrderCount(),
  ])
  if (profileRes.status === 'fulfilled') {
    profile.value = profileRes.value
    auth.user = profileRes.value
  }
  if (pointsRes.status === 'fulfilled') {
    totalEarned.value = pointsRes.value.logs
      .filter((log) => log.change > 0)
      .reduce((sum, log) => sum + log.change, 0)
  }
  if (couponRes.status === 'fulfilled') {
    couponCount.value = couponRes.value.coupons.length
  }
  if (countRes.status === 'fulfilled') {
    orderCount.value = countRes.value
  }
  await userStore.loadProfile().catch(() => undefined)
}

onMounted(load)
</script>

<template>
  <div class="member ss-container ss-page">
    <section class="member__hero">
      <img
        class="member__avatar"
        :src="profile?.avatar"
        :alt="profile?.nickname ?? '用户头像'"
        @error="handleImageError"
      />
      <div class="ss-grow ss-col">
        <div class="ss-row">
          <span class="member__eyebrow">会员中心</span>
          <h1 class="member__name">{{ profile?.nickname ?? 'ShopStack 会员' }}</h1>
          <span class="member__level">
            {{ level.current.icon }} {{ level.current.name }}
          </span>
        </div>
        <p class="member__sub">{{ profile?.username }} · 余额 {{ formatYuan(profile?.balance_cents ?? 0) }}</p>
        <div class="member__progress">
          <div class="member__track">
            <div class="member__fill" :style="{ width: `${level.progress}%` }" />
          </div>
          <span class="member__progress-text">
            {{
              level.next
                ? `再获得 ${formatNumber(level.next.min - (profile?.points ?? 0))} 积分升级 ${level.next.name}`
                : '已达到最高等级'
            }}
          </span>
        </div>
      </div>
    </section>

    <section class="ss-grid ss-grid-4 member__stats">
      <div class="ss-card ss-card-pad member__stat">
        <strong class="ss-num">{{ formatNumber(profile?.points ?? 0) }}</strong>
        <span>当前积分</span>
      </div>
      <div class="ss-card ss-card-pad member__stat">
        <strong class="ss-num">{{ formatNumber(totalEarned) }}</strong>
        <span>累计获得积分</span>
      </div>
      <div class="ss-card ss-card-pad member__stat">
        <strong class="ss-num">{{ formatNumber(couponCount) }}</strong>
        <span>我的优惠券</span>
      </div>
      <div class="ss-card ss-card-pad member__stat">
        <strong class="ss-num">
          {{ formatNumber(orderCount.pending_payment + orderCount.pending_shipment + orderCount.pending_receipt) }}
        </strong>
        <span>进行中订单</span>
      </div>
    </section>

    <section class="ss-card ss-card-pad ss-section">
      <div class="ss-section-title"><h2>会员权益</h2></div>
      <div class="member__benefits">
        <RouterLink v-for="item in benefits" :key="item.path" class="member__benefit" :to="item.path">
          <span class="member__benefit-icon">{{ item.icon }}</span>
          <span class="ss-col">
            <strong>{{ item.label }}</strong>
            <small class="ss-muted-block">{{ item.desc }}</small>
          </span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.member__hero {
  display: flex;
  align-items: center;
  gap: var(--ss-space-5);
  padding: var(--ss-space-6);
  border-radius: var(--ss-radius-xl);
  background: var(--ss-gradient-hero);
  color: var(--ss-color-text-inverse);
  margin-bottom: var(--ss-space-5);
}

.member__avatar {
  width: 80px;
  height: 80px;
  border-radius: var(--ss-radius-circle);
  object-fit: cover;
  background: var(--ss-color-bg-card);
}

.member__name {
  font-size: var(--ss-font-size-3xl);
}

.member__level {
  padding: 2px var(--ss-space-3);
  border-radius: var(--ss-radius-pill);
  background: rgba(255, 255, 255, 0.18);
  font-size: var(--ss-font-size-sm);
}

.member__eyebrow {
  padding: 2px var(--ss-space-3);
  border-radius: var(--ss-radius-pill);
  background: rgba(255, 255, 255, 0.12);
  font-size: var(--ss-font-size-xs);
  letter-spacing: var(--ss-font-letter-spacing-wide);
}

.member__sub {
  margin: 0;
  opacity: 0.82;
}

.member__progress {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  margin-top: var(--ss-space-3);
  max-width: 520px;
}

.member__track {
  flex: 1;
  height: 8px;
  border-radius: var(--ss-radius-pill);
  background: rgba(255, 255, 255, 0.25);
  overflow: hidden;
}

.member__fill {
  height: 100%;
  background: var(--ss-color-accent-400);
}

.member__progress-text {
  font-size: var(--ss-font-size-xs);
  opacity: 0.9;
  white-space: nowrap;
}

.member__stats {
  margin-bottom: var(--ss-space-5);
}

.member__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.member__stat strong {
  font-size: var(--ss-font-size-3xl);
  color: var(--ss-color-brand-600);
}

.member__stat span {
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
}

.member__benefits {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--ss-space-3);
}

.member__benefit {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.member__benefit:hover {
  background: var(--ss-color-brand-50);
}

.member__benefit-icon {
  font-size: 22px;
}

.member__benefit strong {
  font-size: var(--ss-font-size-md);
}

@media (max-width: 1023px) {
  .member__benefits {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .member__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .member__benefits {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
