<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import { listPromotionSessions, listPromotions } from '@/api/marketing'
import type { Promotion, PromotionSession } from '@/types'
import { formatCountdown, formatYuan } from '@/utils/format'

/**
 * 限时秒杀
 * 活动来源 GET /api/v1/promotions?type=3，场次来源 GET /api/v1/promotions/{id}/sessions。
 */
const promotions = ref<Promotion[]>([])
const sessions = ref<Record<number, PromotionSession[]>>({})
const loading = ref(false)
const now = ref(Math.floor(Date.now() / 1000))
let timer: number | null = null

/** 进行中的秒杀活动 */
const activePromotions = computed(() => promotions.value.filter((item) => item.status === 1))

/** 距离最近一场结束的时间 */
const nearest = computed(() => {
  const ends = activePromotions.value.map((item) => item.end_time).filter((value) => value > now.value)
  if (!ends.length) return null
  const end = Math.min(...ends)
  return { end, remain: end - now.value, text: formatCountdown(end - now.value) }
})

/** 场次状态文案 */
function sessionStatusText(session: PromotionSession): string {
  if (session.status === 0) return '未开始'
  if (session.status === 2) return '已结束'
  return '抢购中'
}

/** 场次倒计时 */
function sessionCountdown(session: PromotionSession): string {
  if (session.status === 2) return '已结束'
  if (session.status === 0) {
    const remain = session.start_time - now.value
    return remain > 0 ? `${formatCountdown(remain)} 后开抢` : '即将开始'
  }
  const remain = session.end_time - now.value
  return remain > 0 ? `距结束 ${formatCountdown(remain)}` : '即将结束'
}

/** 场次已抢比例 */
function sessionPercent(session: PromotionSession): number {
  if (!session.stock) return 0
  return Math.min(100, Math.round((session.sold_count / session.stock) * 100))
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listPromotions({ type: 3, page_size: 50 })
    promotions.value = result.promotions
    const entries = await Promise.all(
      result.promotions.map(async (promotion) => {
        try {
          const sessionRes = await listPromotionSessions(promotion.id, { page_size: 20 })
          return [promotion.id, sessionRes.sessions] as const
        } catch {
          return [promotion.id, [] as PromotionSession[]] as const
        }
      }),
    )
    sessions.value = Object.fromEntries(entries)
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

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
  <div class="flash-sale-list ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">限时秒杀</h1>
        <p class="ss-page-sub">整点开抢，场次有限售完即止</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/flash-sale">秒杀专区</RouterLink>
    </div>

    <section v-if="nearest" class="flash-sale-list__hero ss-card">
      <div>
        <span class="ss-muted-block">最近一场结束倒计时</span>
        <strong class="flash-sale-list__timer ss-num">{{ nearest.text }}</strong>
      </div>
      <div class="flash-sale-list__hero-count">
        <span class="ss-muted-block">进行中活动</span>
        <strong class="ss-num">{{ activePromotions.length }} 场</strong>
      </div>
    </section>

    <EmptyState
      v-if="!promotions.length && !loading"
      icon="⚡"
      title="暂无秒杀活动"
      description="下一场秒杀开启时会第一时间通知你，先去逛逛热销好物"
      action-text="去看热销"
      @action="$router.push('/channel/hot')"
    />

    <section v-for="promotion in promotions" :key="promotion.id" class="ss-section">
      <div class="ss-section-title">
        <h2>{{ promotion.name }}</h2>
        <RouterLink class="ss-text-brand ss-muted-block" :to="`/promotion-session/${promotion.id}`">
          全部场次 →
        </RouterLink>
      </div>
      <p class="ss-muted-block flash-sale-list__desc">{{ promotion.description }}</p>

      <div class="ss-grid ss-grid-3">
        <article
          v-for="session in sessions[promotion.id] ?? []"
          :key="session.id"
          class="flash-sale-list__session ss-card"
        >
          <header class="flash-sale-list__session-head">
            <strong>{{ session.name }}</strong>
            <span
              class="ss-tag"
              :class="`ss-tag-${session.status === 1 ? 'danger' : session.status === 0 ? 'warning' : 'neutral'}`"
            >
              {{ sessionStatusText(session) }}
            </span>
          </header>
          <span class="flash-sale-list__countdown">{{ sessionCountdown(session) }}</span>
          <div class="flash-sale-list__bar">
            <span class="flash-sale-list__bar-fill" :style="{ width: `${sessionPercent(session)}%` }" />
          </div>
          <div class="flash-sale-list__session-foot">
            <span class="ss-muted-block">已抢 {{ session.sold_count }}/{{ session.stock }}</span>
            <span class="ss-grow" />
            <span v-if="promotion.min_amount_cents" class="ss-text-brand">
              门槛 {{ formatYuan(promotion.min_amount_cents) }}
            </span>
          </div>
        </article>
      </div>

      <p v-if="!(sessions[promotion.id] ?? []).length" class="ss-muted-block">
        该活动暂未配置场次，可先查看活动详情。
      </p>
    </section>
  </div>
</template>

<style scoped>
.flash-sale-list__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-5);
  padding: var(--ss-space-5);
  margin-bottom: var(--ss-space-5);
  background: var(--ss-gradient-accent);
  color: var(--ss-color-text-inverse);
  flex-wrap: wrap;
}

.flash-sale-list__hero .ss-muted-block {
  color: var(--ss-color-text-inverse);
  opacity: 0.88;
}

.flash-sale-list__timer {
  display: block;
  font-size: var(--ss-font-size-4xl);
  margin-top: var(--ss-space-1);
}

.flash-sale-list__hero-count {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
  text-align: right;
}

.flash-sale-list__desc {
  margin: 0 0 var(--ss-space-3);
}

.flash-sale-list__session {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
}

.flash-sale-list__session-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-2);
}

.flash-sale-list__countdown {
  color: var(--ss-color-danger-600);
  font-family: var(--ss-font-family-numeric);
  font-size: var(--ss-font-size-sm);
}

.flash-sale-list__bar {
  height: 8px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-200);
  overflow: hidden;
}

.flash-sale-list__bar-fill {
  display: block;
  height: 100%;
  background: var(--ss-gradient-accent);
}

.flash-sale-list__session-foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  font-size: var(--ss-font-size-sm);
}
</style>
