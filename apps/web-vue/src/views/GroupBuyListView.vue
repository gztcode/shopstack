<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import PriceText from '@/components/PriceText.vue'
import { listGroupBuys } from '@/api/marketing'
import type { GroupBuy, PageMeta } from '@/types'
import { formatCountdown } from '@/utils/format'
import { handleImageError } from '@/utils/image'

/**
 * 拼团列表
 * 数据来源 GET /api/v1/group-buys。
 */
const STATUS_TABS = [
  { value: 0, label: '全部' },
  { value: 1, label: '进行中' },
  { value: 2, label: '已结束' },
]

const router = useRouter()

const groupBuys = ref<GroupBuy[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 10, total: 0, total_pages: 1 })
const activeTab = ref(0)
const loading = ref(false)
const now = ref(Math.floor(Date.now() / 1000))
let timer: number | null = null

const PAGE_SIZE = 10

/** 已成团人数占比 */
function progress(groupBuy: GroupBuy): number {
  const target = groupBuy.required_members || groupBuy.group_size || 1
  return Math.min(100, Math.round((groupBuy.joined_members / target) * 100))
}

/** 倒计时文案 */
function countdown(groupBuy: GroupBuy): string {
  if (groupBuy.status === 2) return '已结束'
  if (groupBuy.status === 3) return '已下线'
  if (groupBuy.status === 0) {
    const remain = groupBuy.start_time - now.value
    return remain > 0 ? `${formatCountdown(remain)} 后开团` : '即将开团'
  }
  const remain = groupBuy.end_time - now.value
  return remain > 0 ? `距结束 ${formatCountdown(remain)}` : '即将结束'
}

const joinedCount = computed(
  () => groupBuys.value.filter((item) => item.status === 1).length,
)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listGroupBuys({
      page: meta.value.page,
      page_size: PAGE_SIZE,
      status: activeTab.value || undefined,
    })
    groupBuys.value = result.group_buys
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
  <div class="group-buy-list ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">拼团列表</h1>
        <p class="ss-page-sub">邀好友一起买，成团更划算</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/group-buy">拼团专区</RouterLink>
    </div>

    <div class="group-buy-list__tabs ss-card">
      <button
        v-for="tab in STATUS_TABS"
        :key="tab.value"
        type="button"
        class="group-buy-list__tab"
        :class="{ 'group-buy-list__tab--active': activeTab === tab.value }"
        @click="changeTab(tab.value)"
      >
        {{ tab.label }}
      </button>
      <span class="ss-grow" />
      <span class="ss-muted-block">进行中 {{ joinedCount }} 个</span>
    </div>

    <EmptyState
      v-if="!groupBuys.length && !loading"
      icon="👥"
      title="暂无拼团活动"
      description="换个状态看看，或去热销频道挑选想拼团的商品"
      action-text="去看热销"
      @action="router.push('/channel/hot')"
    />

    <section v-else class="ss-grid ss-grid-2">
      <article
        v-for="groupBuy in groupBuys"
        :key="groupBuy.id"
        class="group-buy-list__card ss-card ss-card-hover"
      >
        <RouterLink class="group-buy-list__media" :to="`/group-buy-detail/${groupBuy.id}`">
          <img :src="groupBuy.product_image" :alt="groupBuy.product_title" @error="handleImageError" />
          <span class="group-buy-list__status">
            {{ groupBuy.status === 1 ? '拼团中' : groupBuy.status === 2 ? '已结束' : '未开始' }}
          </span>
        </RouterLink>
        <div class="group-buy-list__body">
          <RouterLink
            class="group-buy-list__title ss-ellipsis"
            :to="`/group-buy-detail/${groupBuy.id}`"
          >
            {{ groupBuy.name }}
          </RouterLink>
          <p class="ss-muted-block ss-ellipsis group-buy-list__desc">{{ groupBuy.description }}</p>
          <div class="group-buy-list__price">
            <PriceText :cents="groupBuy.price_cents" :original-cents="groupBuy.original_price_cents" size="lg" />
          </div>
          <div class="group-buy-list__progress">
            <div class="group-buy-list__bar">
              <span class="group-buy-list__bar-fill" :style="{ width: `${progress(groupBuy)}%` }" />
            </div>
            <span class="ss-muted-block">
              {{ groupBuy.joined_members }}/{{ groupBuy.required_members }} 人成团
            </span>
          </div>
          <div class="group-buy-list__foot">
            <span class="group-buy-list__countdown">{{ countdown(groupBuy) }}</span>
            <span class="ss-grow" />
            <RouterLink class="ss-btn ss-btn-primary ss-btn-sm" :to="`/group-buy-detail/${groupBuy.id}`">
              去拼团
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
  </div>
</template>

<style scoped>
.group-buy-list__tabs {
  display: flex;
  align-items: center;
  gap: var(--ss-space-1);
  padding: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
  overflow-x: auto;
}

.group-buy-list__tab {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.group-buy-list__tab--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-medium);
}

.group-buy-list__card {
  display: flex;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
}

.group-buy-list__media {
  position: relative;
  width: 180px;
  height: 180px;
  border-radius: var(--ss-radius-lg);
  overflow: hidden;
  background: var(--ss-color-bg-subtle);
  flex: none;
}

.group-buy-list__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.group-buy-list__status {
  position: absolute;
  top: var(--ss-space-2);
  left: var(--ss-space-2);
  padding: 2px var(--ss-space-2);
  border-radius: var(--ss-radius-xs);
  background: var(--ss-color-danger-600);
  color: var(--ss-color-text-inverse);
  font-size: var(--ss-font-size-xs);
}

.group-buy-list__body {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  flex: 1;
  min-width: 0;
}

.group-buy-list__title {
  font-weight: var(--ss-font-weight-semibold);
}

.group-buy-list__desc {
  margin: 0;
}

.group-buy-list__progress {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  font-size: var(--ss-font-size-sm);
}

.group-buy-list__bar {
  flex: 1;
  height: 8px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-200);
  overflow: hidden;
}

.group-buy-list__bar-fill {
  display: block;
  height: 100%;
  background: var(--ss-color-brand-600);
}

.group-buy-list__foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  margin-top: auto;
}

.group-buy-list__countdown {
  color: var(--ss-color-danger-600);
  font-size: var(--ss-font-size-sm);
  font-family: var(--ss-font-family-numeric);
}

@media (max-width: 767px) {
  .group-buy-list__card {
    flex-direction: column;
  }

  .group-buy-list__media {
    width: 100%;
    height: 200px;
  }
}
</style>
