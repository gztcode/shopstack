<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import PriceText from '@/components/PriceText.vue'
import { useAddToCart } from '@/composables/useAddToCart'
import { listChannelProducts, listChannels } from '@/api/product'
import type { Channel, PageMeta, Product } from '@/types'
import { formatCount } from '@/utils/format'
import { handleImageError } from '@/utils/image'

/**
 * 预售专区
 * 预售商品来源 GET /api/v1/channels?type=5 与 GET /api/v1/channels/{id}/products。
 */
const PRESALE_CHANNEL_TYPE = 5

/** 预售规则说明（平台统一公示口径） */
const RULES = [
  { icon: '💰', title: '定金规则', text: '支付 1 元定金享预售特惠，尾款在发货前 7 天支付。' },
  { icon: '📦', title: '发货时间', text: '预售商品预计在预售结束后 15 天内按顺序发出。' },
  { icon: '↩️', title: '退换规则', text: '预售商品支持定金原路退还，未付尾款可随时取消。' },
]

const channel = ref<Channel | null>(null)
const products = ref<Product[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 12, total: 0, total_pages: 1 })
const loading = ref(false)

const PAGE_SIZE = 12
const { add } = useAddToCart()

/** 预售商品总数 */
const totalCount = computed(() => meta.value.total)

async function load(): Promise<void> {
  loading.value = true
  try {
    const channelRes = await listChannels({ type: PRESALE_CHANNEL_TYPE, page_size: 1 })
    const target = channelRes.channels[0]
    channel.value = target
    if (!target) {
      products.value = []
      return
    }
    const result = await listChannelProducts(target.id, {
      page: meta.value.page,
      page_size: PAGE_SIZE,
      sort: 'newest',
    })
    products.value = result.products
    meta.value = result.meta
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
  <div class="presale ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">预售专区</h1>
        <p class="ss-page-sub">付定金享优先发货，新品首发都在这里</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/channel/presale">预售频道</RouterLink>
    </div>

    <section class="presale__rules ss-card">
      <div v-for="rule in RULES" :key="rule.title" class="presale__rule">
        <span class="presale__rule-icon">{{ rule.icon }}</span>
        <div class="ss-col">
          <strong>{{ rule.title }}</strong>
          <span class="ss-muted-block">{{ rule.text }}</span>
        </div>
      </div>
    </section>

    <section v-if="channel" class="presale__banner ss-card">
      <img v-if="channel.banner_url" :src="channel.banner_url" :alt="channel.name" />
      <div class="ss-col">
        <strong>{{ channel.name }}专区 · 共 {{ totalCount }} 款预售</strong>
        <span class="ss-muted-block">{{ channel.description }}</span>
      </div>
    </section>

    <EmptyState
      v-if="!products.length && !loading"
      icon="📅"
      title="暂无预售商品"
      description="新品预售即将开启，可先关注签到与任务中心获取开播提醒"
      action-text="去任务中心"
      @action="$router.push('/task-center')"
    />

    <section v-else class="ss-grid ss-grid-3">
      <article v-for="product in products" :key="product.id" class="presale__card ss-card ss-card-hover">
        <RouterLink class="presale__media" :to="`/product/${product.id}`">
          <img :src="product.cover" :alt="product.title" @error="handleImageError" />
          <span class="presale__badge">预售</span>
        </RouterLink>
        <div class="presale__body">
          <RouterLink class="presale__title ss-ellipsis" :to="`/product/${product.id}`">
            {{ product.title }}
          </RouterLink>
          <p class="ss-muted-block ss-ellipsis">{{ product.subtitle }}</p>
          <div class="presale__price">
            <PriceText :cents="product.min_price_cents" :original-cents="product.max_price_cents" size="lg" />
          </div>
          <div class="presale__foot">
            <span class="ss-muted-block">定金 1 元起</span>
            <span class="ss-grow" />
            <span class="ss-muted-block">已预订 {{ formatCount(product.sales_count) }}</span>
          </div>
          <button
            type="button"
            class="ss-btn ss-btn-primary ss-btn-sm ss-btn-block"
            :disabled="loading"
            @click="add(product.id)"
          >
            预约预订
          </button>
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
.presale__rules {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
}

.presale__rule {
  display: flex;
  align-items: flex-start;
  gap: var(--ss-space-3);
}

.presale__rule-icon {
  font-size: 24px;
}

.presale__banner {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
}

.presale__banner img {
  width: 200px;
  height: 84px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  flex: none;
}

.presale__card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.presale__media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--ss-color-bg-subtle);
}

.presale__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.presale__badge {
  position: absolute;
  top: var(--ss-space-2);
  left: var(--ss-space-2);
  padding: 2px var(--ss-space-2);
  border-radius: var(--ss-radius-xs);
  background: var(--ss-color-purple-600);
  color: var(--ss-color-text-inverse);
  font-size: var(--ss-font-size-xs);
}

.presale__body {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
  flex: 1;
}

.presale__title {
  font-weight: var(--ss-font-weight-semibold);
}

.presale__body p {
  margin: 0;
}

.presale__foot {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  font-size: var(--ss-font-size-sm);
  margin-top: auto;
}

@media (max-width: 767px) {
  .presale__banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .presale__banner img {
    width: 100%;
    height: 130px;
  }
}
</style>
