<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import ProductCard from '@/components/ProductCard.vue'
import { useAddToCart } from '@/composables/useAddToCart'
import { listChannelProducts, listChannels } from '@/api/product'
import type { Channel, PageMeta, Product } from '@/types'

/**
 * 频道商品面板
 * 各频道页（推荐 / 新品 / 热销 / 限时 / 预售 / 清仓 / 包邮 / 跨境 / 生鲜）共用本组件，
 * 通过 channelType 区分频道，通过 sort 区分默认排序。
 */
const props = withDefaults(
  defineProps<{
    /** 频道类型：1 推荐 2 新品 3 热销 4 限时 5 预售 6 清仓 7 包邮 8 跨境 9 生鲜 */
    channelType: number
    title: string
    subtitle?: string
    /** 默认排序：default | sales | price_asc | price_desc | newest */
    sort?: string
    /** 是否展示排序切换 */
    showSort?: boolean
    /** 排序候选（部分频道不提供全部排序） */
    sortOptions?: { value: string; label: string }[]
  }>(),
  {
    subtitle: '',
    sort: 'default',
    showSort: true,
    sortOptions: () => [
      { value: 'default', label: '综合' },
      { value: 'sales', label: '销量' },
      { value: 'price_asc', label: '价格升序' },
      { value: 'price_desc', label: '价格降序' },
      { value: 'newest', label: '最新' },
    ],
  },
)

const { add } = useAddToCart()

const channel = ref<Channel | null>(null)
const products = ref<Product[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 12, total: 0, total_pages: 1 })
const loading = ref(false)
const activeSort = ref(props.sort)

const PAGE_SIZE = 12

async function load(): Promise<void> {
  loading.value = true
  try {
    // 先按类型定位频道，再用频道 ID 拉取该频道下的商品
    const channelRes = await listChannels({ type: props.channelType, page_size: 1 })
    const target = channelRes.channels[0]
    channel.value = target
    if (!target) {
      products.value = []
      meta.value = { page: 1, page_size: PAGE_SIZE, total: 0, total_pages: 1 }
      return
    }
    const result = await listChannelProducts(target.id, {
      page: meta.value.page,
      page_size: PAGE_SIZE,
      sort: activeSort.value,
    })
    products.value = result.products
    meta.value = result.meta
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function changeSort(value: string): void {
  if (value === activeSort.value) return
  activeSort.value = value
  meta.value = { ...meta.value, page: 1 }
  load()
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(
  () => props.channelType,
  () => {
    meta.value = { ...meta.value, page: 1 }
    load()
  },
)

onMounted(load)
</script>

<template>
  <div class="channel-panel ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">{{ props.title }}</h1>
        <p class="ss-page-sub">{{ props.subtitle || channel?.description || '按频道精选好物' }}</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/channels">全部频道</RouterLink>
    </div>

    <section v-if="channel" class="channel-panel__hero ss-card">
      <img v-if="channel.banner_url" :src="channel.banner_url" :alt="channel.name" />
      <div class="channel-panel__hero-body">
        <span class="channel-panel__icon">{{ channel.icon || '🛍️' }}</span>
        <div class="ss-col">
          <strong>{{ channel.name }}频道</strong>
          <span class="ss-muted-block">{{ channel.description }}</span>
          <span class="ss-muted-block">共 {{ channel.product_count }} 件商品</span>
        </div>
      </div>
    </section>

    <div v-if="props.showSort" class="channel-panel__sort ss-card">
      <span class="ss-muted-block">排序</span>
      <button
        v-for="option in props.sortOptions"
        :key="option.value"
        type="button"
        class="channel-panel__sort-btn"
        :class="{ 'channel-panel__sort-btn--active': activeSort === option.value }"
        @click="changeSort(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <EmptyState
      v-if="!products.length && !loading"
      icon="🗂️"
      title="该频道暂无商品"
      description="频道正在上新，先去其它频道逛逛吧"
      action-text="返回频道首页"
      @action="$router.push('/channels')"
    />

    <section v-else class="ss-grid ss-grid-4">
      <ProductCard
        v-for="product in products"
        :key="product.id"
        :product="product"
        :loading="loading"
        @add="add($event.id)"
      />
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
.channel-panel__hero {
  display: flex;
  align-items: center;
  gap: var(--ss-space-5);
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
  overflow: hidden;
}

.channel-panel__hero img {
  width: 220px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  flex: none;
}

.channel-panel__hero-body {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
}

.channel-panel__icon {
  font-size: 34px;
}

.channel-panel__sort {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-2) var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.channel-panel__sort-btn {
  border: 0;
  background: transparent;
  padding: var(--ss-space-1) var(--ss-space-3);
  border-radius: var(--ss-radius-pill);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
}

.channel-panel__sort-btn--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-medium);
}

@media (max-width: 767px) {
  .channel-panel__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .channel-panel__hero img {
    width: 100%;
    height: 140px;
  }
}
</style>
