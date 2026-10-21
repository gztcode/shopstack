<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { listPromotionSessions, listPromotions } from '@/api/marketing'
import type { Promotion, PromotionSession } from '@/types'
import { formatCountdown, formatDateTime } from '@/utils/format'

/**
 * 活动场次
 * 数据来源 GET /api/v1/promotions 与 GET /api/v1/promotions/{id}/sessions。
 */
const route = useRoute()

const promotions = ref<Promotion[]>([])
const sessions = ref<PromotionSession[]>([])
const currentPromotion = ref<Promotion | null>(null)
const loading = ref(false)
const now = ref(Math.floor(Date.now() / 1000))
let timer: number | null = null

const promotionId = computed(() => {
  const raw = route.params.id ?? route.query.promotionId
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : 0
})

/** 场次状态文案 */
function statusText(session: PromotionSession): string {
  if (session.status === 0) return '未开始'
  if (session.status === 2) return '已结束'
  return '进行中'
}

/** 场次时间描述 */
function timeText(session: PromotionSession): string {
  const start = formatDateTime(session.start_time * 1000)
  const end = formatDateTime(session.end_time * 1000)
  return `${start} 至 ${end}`
}

/** 场次倒计时 */
function countdown(session: PromotionSession): string {
  if (session.status === 2) return '已结束'
  if (session.status === 0) {
    const remain = session.start_time - now.value
    return remain > 0 ? `${formatCountdown(remain)} 后开始` : '即将开始'
  }
  const remain = session.end_time - now.value
  return remain > 0 ? `距结束 ${formatCountdown(remain)}` : '即将结束'
}

/** 售罄比例 */
function soldPercent(session: PromotionSession): number {
  if (!session.stock) return 0
  return Math.min(100, Math.round((session.sold_count / session.stock) * 100))
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const promotionRes = await listPromotions({ page_size: 50 })
    promotions.value = promotionRes.promotions
    const target =
      promotionRes.promotions.find((item) => item.id === promotionId.value) ?? promotionRes.promotions[0]
    currentPromotion.value = target ?? null
    if (!target) {
      sessions.value = []
      return
    }
    const sessionRes = await listPromotionSessions(target.id, { page_size: 50 })
    sessions.value = sessionRes.sessions
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

watch(promotionId, load)

onMounted(() => {
  load()
  timer = window.setInterval(() => {
    now.value = Math.floor(Date.now() / 1000)
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer)
})
</script>

<template>
  <div class="promotion-session ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">活动场次</h1>
        <p class="ss-page-sub">查看每个场次的开始时间与库存进度</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/promotion-list">活动列表</RouterLink>
    </div>

    <div v-if="promotions.length" class="promotion-session__tabs ss-card">
      <RouterLink
        v-for="promotion in promotions"
        :key="promotion.id"
        class="promotion-session__tab"
        :class="{ 'promotion-session__tab--active': currentPromotion?.id === promotion.id }"
        :to="`/promotion-session/${promotion.id}`"
      >
        {{ promotion.name }}
      </RouterLink>
    </div>

    <section v-if="currentPromotion" class="promotion-session__banner ss-card">
      <div class="ss-col">
        <strong>{{ currentPromotion.name }}</strong>
        <span class="ss-muted-block">{{ currentPromotion.description }}</span>
      </div>
      <span class="ss-tag ss-tag-accent">共 {{ sessions.length }} 个场次</span>
    </section>

    <EmptyState
      v-if="!sessions.length && !loading"
      icon="🕐"
      title="暂无场次安排"
      description="该活动还未配置场次，可先查看其它活动"
      action-text="查看活动列表"
      @action="$router.push('/promotion-list')"
    />

    <section v-else class="ss-grid ss-grid-3">
      <article
        v-for="session in sessions"
        :key="session.id"
        class="promotion-session__card ss-card"
      >
        <header class="promotion-session__head">
          <strong>{{ session.name }}</strong>
          <span
            class="ss-tag"
            :class="`ss-tag-${session.status === 1 ? 'success' : session.status === 0 ? 'warning' : 'neutral'}`"
          >
            {{ statusText(session) }}
          </span>
        </header>
        <p class="ss-muted-block promotion-session__time">{{ timeText(session) }}</p>
        <span class="promotion-session__countdown">{{ countdown(session) }}</span>
        <div class="promotion-session__bar">
          <span class="promotion-session__bar-fill" :style="{ width: `${soldPercent(session)}%` }" />
        </div>
        <div class="promotion-session__foot">
          <span class="ss-muted-block">已抢 {{ session.sold_count }}/{{ session.stock }}</span>
          <span class="ss-grow" />
          <RouterLink class="ss-text-brand" to="/flash-sale-list">去抢购 →</RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.promotion-session__tabs {
  display: flex;
  gap: var(--ss-space-1);
  padding: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
  overflow-x: auto;
}

.promotion-session__tab {
  border-radius: var(--ss-radius-md);
  padding: var(--ss-space-2) var(--ss-space-4);
  color: var(--ss-color-text-secondary);
  white-space: nowrap;
}

.promotion-session__tab--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-medium);
}

.promotion-session__banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.promotion-session__card {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
}

.promotion-session__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-2);
}

.promotion-session__time {
  margin: 0;
  font-size: var(--ss-font-size-sm);
}

.promotion-session__countdown {
  color: var(--ss-color-danger-600);
  font-family: var(--ss-font-family-numeric);
  font-size: var(--ss-font-size-sm);
}

.promotion-session__bar {
  height: 8px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-200);
  overflow: hidden;
}

.promotion-session__bar-fill {
  display: block;
  height: 100%;
  background: var(--ss-gradient-accent);
}

.promotion-session__foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  font-size: var(--ss-font-size-sm);
}
</style>
