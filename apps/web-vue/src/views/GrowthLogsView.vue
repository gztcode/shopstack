<script setup lang="ts">
import { onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { listGrowthLogs } from '@/api/user'
import type { GrowthLog, PageMeta } from '@/types'
import { formatDateTime, formatNumber } from '@/utils/format'

/**
 * 成长值明细
 * 数据来源 GET /api/v1/users/growth-logs。
 */
const GROWTH_BIZ_TEXT: Record<string, string> = {
  order: '订单消费',
  review: '发表评价',
  sign: '每日签到',
  invite: '邀请好友',
  refund: '退款扣回',
  activity: '参与活动',
  admin: '人工调整',
}

const logs = ref<GrowthLog[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 20, total: 0, total_pages: 1 })
const currentGrowth = ref(0)
const loading = ref(false)

const PAGE_SIZE = 20

/** 累计获得与累计消耗 */
const totals = ref({ earned: 0, spent: 0 })

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listGrowthLogs({
      page: meta.value.page,
      page_size: PAGE_SIZE,
    })
    logs.value = result.logs
    meta.value = result.meta
    currentGrowth.value = result.current_growth
    totals.value = {
      earned: result.logs.filter((log) => log.change > 0).reduce((sum, log) => sum + log.change, 0),
      spent: Math.abs(
        result.logs.filter((log) => log.change < 0).reduce((sum, log) => sum + log.change, 0),
      ),
    }
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(load)
</script>

<template>
  <div class="growth-logs ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">成长值明细</h1>
        <p class="ss-page-sub">消费、评价与活动带来的成长值记录</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/user/level">会员等级</RouterLink>
    </div>

    <section class="growth-logs__summary ss-card">
      <div class="growth-logs__stat">
        <span class="ss-muted-block">当前成长值</span>
        <strong class="ss-num">{{ formatNumber(currentGrowth) }}</strong>
      </div>
      <div class="growth-logs__stat">
        <span class="ss-muted-block">本页获得</span>
        <strong class="ss-num ss-text-success">+{{ formatNumber(totals.earned) }}</strong>
      </div>
      <div class="growth-logs__stat">
        <span class="ss-muted-block">本页消耗</span>
        <strong class="ss-num ss-text-danger">-{{ formatNumber(totals.spent) }}</strong>
      </div>
    </section>

    <EmptyState
      v-if="!logs.length && !loading"
      icon="🌱"
      title="暂无成长值记录"
      description="下单、评价、签到都会带来成长值，先去完成一单吧"
      action-text="去逛逛"
      @action="$router.push('/category')"
    />

    <section v-else class="ss-card growth-logs__list">
      <div v-for="log in logs" :key="log.id" class="growth-logs__row">
        <div class="ss-col ss-grow">
          <strong>{{ log.title }}</strong>
          <span class="ss-muted-block">
            {{ GROWTH_BIZ_TEXT[log.biz_type] ?? log.biz_type }} · {{ formatDateTime(log.created_at) }}
          </span>
        </div>
        <span
          class="growth-logs__change ss-num"
          :class="log.change >= 0 ? 'ss-text-success' : 'ss-text-danger'"
        >
          {{ log.change >= 0 ? '+' : '' }}{{ log.change }}
        </span>
        <span class="growth-logs__balance ss-muted-block">结余 {{ formatNumber(log.balance) }}</span>
      </div>
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
.growth-logs__summary {
  display: flex;
  gap: var(--ss-space-8);
  padding: var(--ss-space-4) var(--ss-space-5);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.growth-logs__stat {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
  font-size: var(--ss-font-size-xl);
  font-weight: var(--ss-font-weight-semibold);
}

.growth-logs__list {
  overflow: hidden;
}

.growth-logs__row {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-3) var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.growth-logs__row:last-child {
  border-bottom: 0;
}

.growth-logs__change {
  font-size: var(--ss-font-size-lg);
  font-weight: var(--ss-font-weight-semibold);
  min-width: 64px;
  text-align: right;
}

.growth-logs__balance {
  min-width: 100px;
  text-align: right;
  font-size: var(--ss-font-size-sm);
}

@media (max-width: 767px) {
  .growth-logs__row {
    flex-wrap: wrap;
  }

  .growth-logs__balance {
    text-align: left;
  }
}
</style>
