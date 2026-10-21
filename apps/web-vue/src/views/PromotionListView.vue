<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { listPromotions } from '@/api/marketing'
import type { PageMeta, Promotion } from '@/types'
import { promotionStatusText, promotionTypeText } from '@/utils/enums'
import { formatCountdown, formatDateTime, formatYuan } from '@/utils/format'

/**
 * 活动列表
 * 数据来源 GET /api/v1/promotions，可按活动类型与状态筛选。
 */
const TABS = [
  { value: 0, label: '全部活动' },
  { value: 1, label: '满减' },
  { value: 2, label: '折扣' },
  { value: 3, label: '秒杀' },
  { value: 4, label: '拼团' },
]

const activeTab = ref(0)
const statusFilter = ref<number | null>(1)
const promotions = ref<Promotion[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 10, total: 0, total_pages: 1 })
const loading = ref(false)
const now = ref(Math.floor(Date.now() / 1000))

const PAGE_SIZE = 10

/** 倒计时文案：进行中显示剩余时间，未开始显示距开始时间 */
function countdownText(promotion: Promotion): string {
  if (promotion.status !== 1) {
    return promotion.status === 0 ? '未开始' : '已结束'
  }
  const remain = promotion.end_time - now.value
  if (remain <= 0) return '已结束'
  return `距结束 ${formatCountdown(remain)}`
}

/** 折扣 / 满减的优惠描述 */
function benefitText(promotion: Promotion): string {
  if (promotion.type === 2) return `${promotion.percent / 10} 折`
  if (promotion.type === 3) return `秒杀价直降`
  if (promotion.type === 4) return `成团立减`
  return `满 ${formatYuan(promotion.min_amount_cents)} 减 ${formatYuan(promotion.discount_cents)}`
}

const activeCount = computed(() => promotions.value.filter((item) => item.status === 1).length)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listPromotions({
      page: meta.value.page,
      page_size: PAGE_SIZE,
      type: activeTab.value || undefined,
      status: statusFilter.value ?? undefined,
    })
    promotions.value = result.promotions
    meta.value = result.meta
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function changeTab(value: number): void {
  activeTab.value = value
  meta.value = { ...meta.value, page: 1 }
  load()
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(statusFilter, () => {
  meta.value = { ...meta.value, page: 1 }
  load()
})

onMounted(() => {
  load()
  window.setInterval(() => {
    now.value = Math.floor(Date.now() / 1000)
  }, 1000)
})
</script>

<template>
  <div class="promotion-list ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">活动列表</h1>
        <p class="ss-page-sub">满减、折扣、秒杀与拼团活动全部汇总</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/flash-sale-list">限时秒杀</RouterLink>
    </div>

    <div class="promotion-list__bar ss-card">
      <div class="promotion-list__tabs">
        <button
          v-for="tab in TABS"
          :key="tab.value"
          type="button"
          class="promotion-list__tab"
          :class="{ 'promotion-list__tab--active': activeTab === tab.value }"
          @click="changeTab(tab.value)"
        >
          {{ tab.label }}
        </button>
      </div>
      <label class="promotion-list__status">
        <span class="ss-muted-block">状态</span>
        <select v-model="statusFilter" class="ss-select">
          <option :value="1">进行中</option>
          <option :value="0">未开始</option>
          <option :value="2">已结束</option>
          <option :value="null">全部</option>
        </select>
      </label>
    </div>

    <EmptyState
      v-if="!promotions.length && !loading"
      icon="🎉"
      title="暂无符合条件的活动"
      description="换个类型或状态筛选看看，新的活动上线会第一时间通知你"
      action-text="查看全部活动"
      @action="changeTab(0)"
    />

    <section v-else class="ss-grid ss-grid-2">
      <article v-for="promotion in promotions" :key="promotion.id" class="promotion-list__card ss-card">
        <div class="promotion-list__media">
          <img v-if="promotion.banner_image" :src="promotion.banner_image" :alt="promotion.name" />
          <span v-else class="promotion-list__icon">🎁</span>
        </div>
        <div class="promotion-list__body">
          <div class="promotion-list__head">
            <strong class="ss-ellipsis">{{ promotion.name }}</strong>
            <span class="ss-tag" :class="`ss-tag-${promotion.status === 1 ? 'success' : 'neutral'}`">
              {{ promotionStatusText(promotion.status) }}
            </span>
          </div>
          <p class="ss-muted-block promotion-list__desc">{{ promotion.description }}</p>
          <div class="promotion-list__meta">
            <span class="ss-tag ss-tag-accent">{{ promotionTypeText(promotion.type) }}</span>
            <span class="ss-text-brand ss-text-secondary">{{ benefitText(promotion) }}</span>
          </div>
          <div class="promotion-list__foot">
            <span class="ss-muted-block">{{ formatDateTime(promotion.created_at) }}</span>
            <span class="ss-grow" />
            <span class="promotion-list__countdown">{{ countdownText(promotion) }}</span>
          </div>
          <div class="promotion-list__sold">
            <span class="ss-muted-block">已有 {{ promotion.sold_count }} 人参与</span>
            <RouterLink
              v-if="promotion.type === 3"
              class="ss-text-brand"
              :to="`/promotion-session/${promotion.id}`"
            >
              查看场次 →
            </RouterLink>
            <RouterLink
              v-else-if="promotion.type === 4"
              class="ss-text-brand"
              to="/group-buy-list"
            >
              去拼团 →
            </RouterLink>
          </div>
        </div>
      </article>
    </section>

    <Pagination
      :page="meta.page"
      :page-size="meta.page_size"
      :total="meta.total"
      @change="changePage"
    />

    <p class="promotion-list__hint ss-muted-block">进行中的活动共 {{ activeCount }} 个</p>
  </div>
</template>

<style scoped>
.promotion-list__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-2) var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.promotion-list__tabs {
  display: flex;
  gap: var(--ss-space-1);
  overflow-x: auto;
}

.promotion-list__tab {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.promotion-list__tab--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-medium);
}

.promotion-list__status {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
}

.promotion-list__card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.promotion-list__media {
  aspect-ratio: 3 / 1;
  background: var(--ss-color-bg-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
}

.promotion-list__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.promotion-list__icon {
  font-size: 42px;
}

.promotion-list__body {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
}

.promotion-list__head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
}

.promotion-list__desc {
  margin: 0;
  min-height: 40px;
}

.promotion-list__meta {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
}

.promotion-list__foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
}

.promotion-list__countdown {
  color: var(--ss-color-danger-600);
  font-size: var(--ss-font-size-sm);
  font-family: var(--ss-font-family-numeric);
}

.promotion-list__sold {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  border-top: 1px solid var(--ss-color-border-subtle);
  padding-top: var(--ss-space-2);
}

.promotion-list__hint {
  text-align: center;
  margin-top: var(--ss-space-2);
}
</style>
