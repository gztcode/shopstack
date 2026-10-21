<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import { claimTask, listTasks } from '@/api/marketing'
import { useAppStore } from '@/stores/app'
import type { UserTask } from '@/types'

/**
 * 任务中心
 * 数据来源 GET /api/v1/marketing/tasks，领取奖励 POST /api/v1/marketing/tasks/{id}/claim。
 */
const app = useAppStore()

const tasks = ref<UserTask[]>([])
const loading = ref(false)
const claiming = ref<number | null>(null)

/** 任务类型文案 */
const TASK_TYPE_TEXT: Record<number, string> = {
  1: '浏览任务',
  2: '下单任务',
  3: '分享任务',
  4: '评价任务',
  5: '签到任务',
  6: '邀请任务',
}

/** 任务类型 → 跳转路径 */
const TASK_TYPE_LINK: Record<number, string> = {
  1: '/category',
  2: '/order/all',
  3: '/history',
  4: '/reviews',
  5: '/sign-in',
  6: '/member',
}

const completedCount = computed(() => tasks.value.filter((task) => task.completed).length)

const claimableCount = computed(
  () => tasks.value.filter((task) => task.completed && !task.claimed).length,
)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listTasks({ page_size: 50 })
    tasks.value = result.tasks
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

async function onClaim(task: UserTask): Promise<void> {
  if (claiming.value !== null) return
  claiming.value = task.task_id
  try {
    await claimTask(task.task_id)
    app.success(`已领取「${task.name}」奖励`)
    await load()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    claiming.value = null
  }
}

onMounted(load)
</script>

<template>
  <div class="task-center ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">任务中心</h1>
        <p class="ss-page-sub">完成任务赚积分与优惠券</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/points">积分中心</RouterLink>
    </div>

    <section class="task-center__summary ss-card">
      <div class="task-center__stat">
        <span class="ss-muted-block">任务总数</span>
        <strong class="ss-num">{{ tasks.length }}</strong>
      </div>
      <div class="task-center__stat">
        <span class="ss-muted-block">已完成</span>
        <strong class="ss-num ss-text-success">{{ completedCount }}</strong>
      </div>
      <div class="task-center__stat">
        <span class="ss-muted-block">待领取</span>
        <strong class="ss-num ss-text-brand">{{ claimableCount }}</strong>
      </div>
    </section>

    <EmptyState
      v-if="!tasks.length && !loading"
      icon="📋"
      title="暂无任务"
      description="活动任务正在配置，先去签到或逛逛商品攒积分吧"
      action-text="去签到"
      @action="$router.push('/sign-in')"
    />

    <article v-for="task in tasks" :key="task.task_id" class="task-center__item ss-card">
      <div class="task-center__icon">{{ task.icon || '🎯' }}</div>
      <div class="ss-col ss-grow">
        <div class="task-center__head">
          <strong>{{ task.name }}</strong>
          <span class="ss-tag ss-tag-neutral">{{ TASK_TYPE_TEXT[task.type] ?? '任务' }}</span>
          <span v-if="task.claimed" class="ss-tag ss-tag-neutral">已领取</span>
        </div>
        <p class="ss-muted-block task-center__desc">{{ task.description }}</p>
        <div class="task-center__progress">
          <div class="task-center__bar">
            <span
              class="task-center__bar-fill"
              :style="{
                width: `${Math.min(100, Math.round((task.progress / Math.max(1, task.target_count)) * 100))}%`,
              }"
            />
          </div>
          <span class="ss-muted-block">{{ task.progress }}/{{ task.target_count }}</span>
        </div>
        <div class="task-center__reward">
          <span class="ss-tag ss-tag-accent">+{{ task.reward_points }} 积分</span>
          <span v-if="task.reward_coupon_id" class="ss-tag ss-tag-success">含优惠券</span>
        </div>
      </div>
      <div class="task-center__actions">
        <RouterLink
          v-if="!task.completed"
          class="ss-btn ss-btn-outline ss-btn-sm"
          :to="TASK_TYPE_LINK[task.type] ?? '/category'"
        >
          去完成
        </RouterLink>
        <button
          v-else-if="!task.claimed"
          type="button"
          class="ss-btn ss-btn-primary ss-btn-sm"
          :disabled="claiming === task.task_id"
          @click="onClaim(task)"
        >
          {{ claiming === task.task_id ? '领取中…' : '领取奖励' }}
        </button>
        <span v-else class="ss-muted-block">已完成</span>
      </div>
    </article>
  </div>
</template>

<style scoped>
.task-center__summary {
  display: flex;
  gap: var(--ss-space-8);
  padding: var(--ss-space-4) var(--ss-space-5);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.task-center__stat {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
  font-size: var(--ss-font-size-xl);
  font-weight: var(--ss-font-weight-semibold);
}

.task-center__item {
  display: flex;
  align-items: flex-start;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-3);
}

.task-center__icon {
  width: 52px;
  height: 52px;
  border-radius: var(--ss-radius-lg);
  background: var(--ss-color-brand-50);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex: none;
}

.task-center__head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
}

.task-center__desc {
  margin: var(--ss-space-1) 0;
}

.task-center__progress {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
}

.task-center__bar {
  width: 180px;
  height: 6px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-200);
  overflow: hidden;
}

.task-center__bar-fill {
  display: block;
  height: 100%;
  background: var(--ss-color-brand-600);
}

.task-center__reward {
  display: flex;
  gap: var(--ss-space-1);
  margin-top: var(--ss-space-2);
  flex-wrap: wrap;
}

.task-center__actions {
  flex: none;
  align-self: center;
}

@media (max-width: 767px) {
  .task-center__item {
    flex-direction: column;
  }

  .task-center__actions {
    align-self: stretch;
  }
}
</style>
