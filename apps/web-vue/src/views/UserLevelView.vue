<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import { listUserLevels as listMarketingLevels } from '@/api/marketing'
import { getUserLevel, listUserLevels } from '@/api/user'
import type { UserLevel, UserLevelInfo } from '@/types'
import { formatNumber } from '@/utils/format'

/**
 * 会员等级
 * 数据来源 GET /api/v1/users/level、GET /api/v1/users/levels 与 GET /api/v1/marketing/levels。
 */
const info = ref<UserLevelInfo | null>(null)
const levels = ref<UserLevel[]>([])
const marketingLevels = ref<UserLevel[]>([])
const loading = ref(false)

/** 距离下一等级的进度百分比 */
const progress = computed(() => {
  if (!info.value) return 0
  const { current_min_growth, next_min_growth, growth } = info.value
  if (next_min_growth <= current_min_growth) return 100
  const span = next_min_growth - current_min_growth
  return Math.min(100, Math.max(0, Math.round(((growth - current_min_growth) / span) * 100)))
})

/** 会员等级说明（营销域口径），与用户域等级合并去重 */
const mergedLevels = computed(() => {
  const map = new Map<number, UserLevel>()
  ;[...levels.value, ...marketingLevels.value].forEach((item) => {
    if (!map.has(item.level)) map.set(item.level, item)
  })
  return Array.from(map.values()).sort((a, b) => a.level - b.level)
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const [levelRes, userLevelsRes, marketingRes] = await Promise.all([
      getUserLevel(),
      listUserLevels(),
      listMarketingLevels(),
    ])
    info.value = levelRes
    levels.value = userLevelsRes.levels
    marketingLevels.value = marketingRes.levels
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="user-level ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">会员等级</h1>
        <p class="ss-page-sub">成长值决定会员等级，等级越高权益越多</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/user/growth-logs">成长值明细</RouterLink>
    </div>

    <EmptyState
      v-if="!info && !loading"
      icon="👑"
      title="暂无会员信息"
      description="登录后即可查看你的会员等级与成长值"
      action-text="去登录"
      @action="$router.push('/login')"
    />

    <template v-else-if="info">
      <section class="user-level__hero ss-card">
        <div class="user-level__hero-main">
          <span class="user-level__icon">
            {{ mergedLevels.find((item) => item.level === info?.level)?.icon ?? '🥉' }}
          </span>
          <div class="ss-col">
            <strong class="user-level__name">{{ info.level_name || '普通会员' }}</strong>
            <span class="ss-muted-block">
              当前成长值 {{ formatNumber(info.growth) }} · 折扣
              {{ info.discount_percent / 10 }} 折
            </span>
          </div>
        </div>
        <div class="user-level__hero-progress">
          <div class="user-level__bar">
            <span class="user-level__bar-fill" :style="{ width: `${progress}%` }" />
          </div>
          <span class="ss-muted-block">
            {{
              info.next_level_name
                ? `距离 ${info.next_level_name} 还差 ${formatNumber(info.growth_to_next)} 成长值`
                : '已达到最高等级'
            }}
          </span>
        </div>
      </section>

      <section class="ss-section">
        <div class="ss-section-title">
          <h2>等级权益</h2>
        </div>
        <div class="ss-grid ss-grid-3">
          <article
            v-for="level in mergedLevels"
            :key="level.id"
            class="user-level__card ss-card"
            :class="{ 'user-level__card--current': level.level === info.level }"
          >
            <header class="user-level__card-head">
              <span class="user-level__card-icon">{{ level.icon || '🎁' }}</span>
              <div class="ss-col">
                <strong>{{ level.name }}</strong>
                <span class="ss-muted-block">
                  {{ formatNumber(level.min_growth) }} -
                  {{ level.max_growth >= 999999 ? '∞' : formatNumber(level.max_growth) }} 成长值
                </span>
              </div>
              <span v-if="level.level === info.level" class="ss-tag ss-tag-accent">当前</span>
            </header>
            <p class="ss-muted-block user-level__card-desc">{{ level.description }}</p>
            <ul class="user-level__benefits">
              <li v-for="benefit in level.benefits" :key="benefit">{{ benefit }}</li>
            </ul>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.user-level__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-6);
  padding: var(--ss-space-5);
  margin-bottom: var(--ss-space-5);
  background: var(--ss-gradient-hero);
  color: var(--ss-color-text-inverse);
  flex-wrap: wrap;
}

.user-level__hero .ss-muted-block {
  color: var(--ss-color-text-inverse);
  opacity: 0.88;
}

.user-level__hero-main {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
}

.user-level__icon {
  font-size: 44px;
}

.user-level__name {
  font-size: var(--ss-font-size-2xl);
}

.user-level__hero-progress {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  min-width: 260px;
  flex: 1;
}

.user-level__bar {
  height: 10px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-700);
  overflow: hidden;
}

.user-level__bar-fill {
  display: block;
  height: 100%;
  background: var(--ss-gradient-accent);
}

.user-level__card {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
}

.user-level__card--current {
  border-color: var(--ss-color-brand-600);
  box-shadow: var(--ss-shadow-brand);
}

.user-level__card-head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
}

.user-level__card-icon {
  font-size: 30px;
}

.user-level__card-desc {
  margin: 0;
}

.user-level__benefits {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
  font-size: var(--ss-font-size-sm);
  color: var(--ss-color-text-secondary);
}

.user-level__benefits li::before {
  content: '· ';
  color: var(--ss-color-brand-600);
}
</style>
