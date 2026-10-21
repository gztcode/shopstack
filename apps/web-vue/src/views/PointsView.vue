<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { listPointsLogs } from '@/api/user'
import type { PageMeta, PointsLog } from '@/types'
import { pointsBizText } from '@/utils/enums'
import { formatDateTime, formatNumber } from '@/utils/format'

const tabs = [
  { value: 'all', label: '全部' },
  { value: 'earn', label: '获得' },
  { value: 'consume', label: '消费' },
]

const activeTab = ref('all')
const logs = ref<PointsLog[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 20, total: 0, total_pages: 1 })
const currentPoints = ref(0)
const loading = ref(false)

const PAGE_SIZE = 20

/** 累计获得 / 累计消费（基于当前页之外的全量由接口汇总，这里用当前页数据估算展示） */
const earned = computed(() =>
  logs.value.filter((log) => log.change > 0).reduce((sum, log) => sum + log.change, 0),
)
const consumed = computed(() =>
  logs.value.filter((log) => log.change < 0).reduce((sum, log) => sum + Math.abs(log.change), 0),
)

const displayLogs = computed(() => {
  if (activeTab.value === 'earn') return logs.value.filter((log) => log.change > 0)
  if (activeTab.value === 'consume') return logs.value.filter((log) => log.change < 0)
  return logs.value
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listPointsLogs({ page: meta.value.page, page_size: PAGE_SIZE })
    logs.value = result.logs
    meta.value = result.meta
    currentPoints.value = result.current_points
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function changeTab(value: string): void {
  activeTab.value = value
  meta.value = { ...meta.value, page: 1 }
  load()
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
}

onMounted(load)
</script>

<template>
  <div class="points ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">积分中心</h1>
        <p class="ss-page-sub">积分可用于兑换优惠券、抵现与参与活动</p>
      </div>
    </div>

    <section class="points__hero ss-card">
      <div class="points__balance">
        <span class="ss-muted-block">当前积分</span>
        <strong class="ss-num">{{ formatNumber(currentPoints) }}</strong>
        <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/coupon-center">去兑换优惠券</RouterLink>
      </div>
      <div class="points__stats">
        <div class="points__stat">
          <strong class="ss-num points__stat--earn">+{{ formatNumber(earned) }}</strong>
          <span>本页获得</span>
        </div>
        <div class="points__stat">
          <strong class="ss-num points__stat--consume">-{{ formatNumber(consumed) }}</strong>
          <span>本页消费</span>
        </div>
        <div class="points__stat">
          <strong class="ss-num">{{ formatNumber(meta.total) }}</strong>
          <span>积分记录</span>
        </div>
      </div>
    </section>

    <div class="points__tabs ss-card">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="points__tab"
        :class="{ 'points__tab--active': activeTab === tab.value }"
        @click="changeTab(tab.value)"
      >
        {{ tab.label }}
      </button>
    </div>

    <section class="ss-card">
      <div v-if="loading && !logs.length" class="ss-card-pad ss-muted-block">加载中…</div>
      <EmptyState
        v-else-if="!displayLogs.length"
        icon="🎯"
        title="暂无积分记录"
        description="下单、评价、签到都可以获得积分"
      />
      <ul v-else class="points__list">
        <li v-for="log in displayLogs" :key="log.id" class="points__item">
          <div class="ss-grow ss-col">
            <div class="ss-row">
              <strong>{{ log.title }}</strong>
              <span class="ss-tag ss-tag-neutral">{{ pointsBizText(log.biz_type) }}</span>
            </div>
            <span class="ss-muted-block">
              {{ formatDateTime(log.created_at) }}
              <template v-if="log.biz_id"> · 关联单号 {{ log.biz_id }}</template>
            </span>
          </div>
          <div class="points__amount">
            <strong class="ss-num" :class="log.change >= 0 ? 'ss-text-success' : 'ss-text-danger'">
              {{ log.change >= 0 ? '+' : '' }}{{ log.change }}
            </strong>
            <span class="ss-muted-block">余额 {{ formatNumber(log.balance) }}</span>
          </div>
        </li>
      </ul>
    </section>

    <Pagination
      :page="meta.page"
      :page-size="meta.page_size"
      :total="meta.total"
      @change="changePage"
    />
  </div>
</template>

<style scoped>
.points__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-6);
  padding: var(--ss-space-6);
  margin-bottom: var(--ss-space-4);
  background: var(--ss-gradient-hero);
  color: var(--ss-color-text-inverse);
}

.points__balance {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ss-space-1);
}

.points__balance strong {
  font-size: var(--ss-font-size-5xl);
  line-height: 1.1;
}

.points__balance .ss-muted-block {
  color: rgba(255, 255, 255, 0.75);
}

.points__balance .ss-btn {
  margin-top: var(--ss-space-3);
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.4);
  color: var(--ss-color-text-inverse);
}

.points__stats {
  display: flex;
  gap: var(--ss-space-8);
}

.points__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.points__stat strong {
  font-size: var(--ss-font-size-2xl);
}

.points__stat--earn {
  color: var(--ss-color-success-100);
}

.points__stat--consume {
  color: var(--ss-color-accent-100);
}

.points__stat span {
  font-size: var(--ss-font-size-xs);
  opacity: 0.8;
}

.points__tabs {
  display: flex;
  gap: var(--ss-space-1);
  padding: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
}

.points__tab {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
}

.points__tab--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.points__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.points__item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.points__item:last-child {
  border-bottom: 0;
}

.points__amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  min-width: 96px;
}

.points__amount strong {
  font-size: var(--ss-font-size-xl);
}

@media (max-width: 767px) {
  .points__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .points__stats {
    width: 100%;
    justify-content: space-between;
    gap: var(--ss-space-3);
  }
}
</style>
