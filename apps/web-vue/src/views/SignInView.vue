<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getSignInStatus, signIn } from '@/api/marketing'
import { useAppStore } from '@/stores/app'
import type { SignInStatus } from '@/types'
import { formatNumber } from '@/utils/format'

/**
 * 签到中心
 * 数据来源 GET /api/v1/marketing/sign-in（状态与日历）、POST /api/v1/marketing/sign-in（签到）。
 */
const app = useAppStore()

const status = ref<SignInStatus | null>(null)
const loading = ref(false)
const submitting = ref(false)

/** 签到日历按 7 列排布，末尾补空位保持整齐 */
const calendarRows = computed(() => {
  const days = status.value?.calendar ?? []
  const rows: (typeof days)[] = []
  for (let index = 0; index < days.length; index += 7) {
    rows.push(days.slice(index, index + 7))
  }
  return rows
})

/** 本月连续签到进度：已签天数 / 本月总天数 */
const monthProgress = computed(() => {
  const total = status.value?.calendar.length ?? 0
  const signed = status.value?.calendar.filter((day) => day.signed).length ?? 0
  if (!total) return 0
  return Math.min(100, Math.round((signed / total) * 100))
})

async function load(): Promise<void> {
  loading.value = true
  try {
    status.value = await getSignInStatus()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

async function onSignIn(): Promise<void> {
  if (submitting.value) return
  submitting.value = true
  try {
    status.value = await signIn()
    app.success(`签到成功，获得 ${status.value.points_awarded} 积分`)
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="sign-in ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">签到中心</h1>
        <p class="ss-page-sub">每日签到领积分，连续签到奖励更多</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/points">积分中心</RouterLink>
    </div>

    <section class="sign-in__hero ss-card">
      <div class="sign-in__hero-main">
        <span class="sign-in__hero-label">今日签到</span>
        <strong class="sign-in__hero-points">
          +{{ status?.points_awarded ?? 0 }}
          <small>积分</small>
        </strong>
        <span class="ss-muted-block">
          明日签到可得 {{ status?.next_points ?? 0 }} 积分
        </span>
      </div>
      <div class="sign-in__hero-stats">
        <div class="sign-in__stat">
          <span class="ss-muted-block">连续签到</span>
          <strong class="ss-num">{{ status?.continuous_days ?? 0 }} 天</strong>
        </div>
        <div class="sign-in__stat">
          <span class="ss-muted-block">累计签到</span>
          <strong class="ss-num">{{ formatNumber(status?.total_days ?? 0) }} 天</strong>
        </div>
        <div class="sign-in__stat">
          <span class="ss-muted-block">本月完成度</span>
          <strong class="ss-num">{{ monthProgress }}%</strong>
        </div>
      </div>
      <button
        type="button"
        class="ss-btn ss-btn-accent ss-btn-lg"
        :disabled="status?.signed_today || submitting"
        @click="onSignIn"
      >
        {{ status?.signed_today ? '今日已签到' : '立即签到' }}
      </button>
    </section>

    <section class="ss-section">
      <div class="ss-section-title">
        <h2>签到日历</h2>
      </div>
      <div class="sign-in__calendar ss-card">
        <div class="sign-in__week">
          <span v-for="day in ['一', '二', '三', '四', '五', '六', '日']" :key="day">{{ day }}</span>
        </div>
        <div v-for="(row, index) in calendarRows" :key="index" class="sign-in__row">
          <div
            v-for="day in row"
            :key="day.date"
            class="sign-in__day"
            :class="{ 'sign-in__day--signed': day.signed }"
          >
            <span class="sign-in__day-num">{{ Number(day.date.slice(-2)) }}</span>
            <span class="sign-in__day-points">+{{ day.points }}</span>
          </div>
          <div v-for="empty in 7 - row.length" :key="`empty-${empty}`" class="sign-in__day" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.sign-in__hero {
  display: flex;
  align-items: center;
  gap: var(--ss-space-6);
  padding: var(--ss-space-6);
  margin-bottom: var(--ss-space-5);
  background: var(--ss-gradient-hero);
  color: var(--ss-color-text-inverse);
  flex-wrap: wrap;
}

.sign-in__hero-main {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
}

.sign-in__hero-label {
  font-size: var(--ss-font-size-sm);
  opacity: 0.85;
}

.sign-in__hero-points {
  font-size: var(--ss-font-size-4xl);
  font-family: var(--ss-font-family-numeric);
}

.sign-in__hero-points small {
  font-size: var(--ss-font-size-md);
  font-weight: var(--ss-font-weight-regular);
}

.sign-in__hero-stats {
  display: flex;
  gap: var(--ss-space-6);
  flex: 1;
  flex-wrap: wrap;
}

.sign-in__stat {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
}

.sign-in__stat .ss-muted-block {
  color: var(--ss-color-text-inverse);
  opacity: 0.85;
}

.sign-in__calendar {
  padding: var(--ss-space-4);
}

.sign-in__week,
.sign-in__row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: var(--ss-space-2);
}

.sign-in__week {
  margin-bottom: var(--ss-space-2);
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-xs);
  text-align: center;
}

.sign-in__row {
  margin-bottom: var(--ss-space-2);
}

.sign-in__day {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--ss-space-2);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  font-size: var(--ss-font-size-sm);
}

.sign-in__day--signed {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.sign-in__day-points {
  font-size: var(--ss-font-size-xs);
  opacity: 0.8;
}

@media (max-width: 767px) {
  .sign-in__hero {
    padding: var(--ss-space-4);
  }

  .sign-in__hero-stats {
    gap: var(--ss-space-4);
  }
}
</style>
