<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import StarRating from '@/components/StarRating.vue'
import { listReviews } from '@/api/product'
import type { PageMeta, Review, ReviewSummary } from '@/types'
import { formatFromNow } from '@/utils/format'
import { handleImageError } from '@/utils/image'

/**
 * 评价筛选面板
 * 全部 / 好评 / 中评 / 差评 / 有图 / 已回复 六个评价页共用本组件，
 * 通过 filter 区分筛选维度：后端 filter 参数负责粗筛，中评、差评、已回复在此基础上二次细分。
 */
export type ReviewFilterKey = 'all' | 'good' | 'medium' | 'bad' | 'image' | 'reply'

const props = withDefaults(
  defineProps<{
    filter: ReviewFilterKey
    title: string
    subtitle?: string
    productId?: number
  }>(),
  {
    subtitle: '',
    productId: undefined,
  },
)

/** 后端 filter 取值：0 全部 1 有图 2 好评 3 中差评 */
const backendFilter = computed(() => {
  switch (props.filter) {
    case 'image':
      return 1
    case 'good':
      return 2
    case 'medium':
    case 'bad':
      return 3
    default:
      return 0
  }
})

/** 需要在本地二次细分的筛选维度 */
const localFilter = computed(() => {
  switch (props.filter) {
    case 'medium':
      return (review: Review) => review.rating === 3
    case 'bad':
      return (review: Review) => review.rating <= 2
    case 'reply':
      return (review: Review) => Boolean(review.admin_reply)
    default:
      return null
  }
})

const reviews = ref<Review[]>([])
const summary = ref<ReviewSummary>({ total: 0, good: 0, medium: 0, bad: 0, average: 0 })
const meta = ref<PageMeta>({ page: 1, page_size: 10, total: 0, total_pages: 1 })
const loading = ref(false)

const PAGE_SIZE = 10

const visibleReviews = computed(() => {
  const refine = localFilter.value
  return refine ? reviews.value.filter(refine) : reviews.value
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listReviews({
      page: meta.value.page,
      page_size: PAGE_SIZE,
      product_id: props.productId,
      filter: backendFilter.value,
    })
    reviews.value = result.reviews
    summary.value = result.summary
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
  <div class="review-panel ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">{{ props.title }}</h1>
        <p class="ss-page-sub">{{ props.subtitle }}</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/reviews">我的评价</RouterLink>
    </div>

    <section class="review-panel__summary ss-card">
      <div class="review-panel__summary-item">
        <span class="ss-muted-block">全部评价</span>
        <strong class="ss-num">{{ summary.total }}</strong>
      </div>
      <div class="review-panel__summary-item">
        <span class="ss-muted-block">好评</span>
        <strong class="ss-num ss-text-success">{{ summary.good }}</strong>
      </div>
      <div class="review-panel__summary-item">
        <span class="ss-muted-block">中评</span>
        <strong class="ss-num ss-text-brand">{{ summary.medium }}</strong>
      </div>
      <div class="review-panel__summary-item">
        <span class="ss-muted-block">差评</span>
        <strong class="ss-num ss-text-danger">{{ summary.bad }}</strong>
      </div>
      <div class="review-panel__summary-item">
        <span class="ss-muted-block">平均评分</span>
        <strong class="ss-num">{{ summary.average.toFixed(2) }}</strong>
      </div>
    </section>

    <EmptyState
      v-if="!visibleReviews.length && !loading"
      icon="💬"
      title="暂无符合条件的评价"
      description="换个筛选维度看看，或去商品页留下第一条评价"
      action-text="去挑选商品"
      @action="$router.push('/category')"
    />

    <article v-for="review in visibleReviews" :key="review.id" class="review-panel__item ss-card">
      <header class="review-panel__item-head">
        <span class="review-panel__avatar">{{ review.user_nickname.slice(0, 1) }}</span>
        <div class="ss-col">
          <strong>{{ review.user_nickname }}</strong>
          <span class="ss-muted-block">{{ formatFromNow(review.created_at) }}</span>
        </div>
        <span class="ss-grow" />
        <StarRating :rating="review.rating" size="sm" />
      </header>

      <div class="review-panel__item-body">
        <RouterLink
          v-if="review.product_title"
          class="review-panel__product ss-text-brand"
          :to="`/product/${review.product_id}`"
        >
          {{ review.product_title }}
        </RouterLink>
        <p class="review-panel__content">{{ review.content }}</p>
        <div v-if="review.images.length" class="review-panel__images">
          <img
            v-for="(image, index) in review.images"
            :key="index"
            :src="image"
            :alt="`评价图片 ${index + 1}`"
            @error="handleImageError"
          />
        </div>
        <p v-if="review.sku_text" class="ss-muted-block">规格：{{ review.sku_text }}</p>
      </div>

      <footer v-if="review.admin_reply" class="review-panel__reply">
        <strong>商家回复：</strong>{{ review.admin_reply }}
      </footer>
    </article>

    <Pagination
      :page="meta.page"
      :page-size="meta.page_size"
      :total="meta.total"
      @change="changePage"
    />
  </div>
</template>

<style scoped>
.review-panel__summary {
  display: flex;
  align-items: center;
  gap: var(--ss-space-6);
  padding: var(--ss-space-4) var(--ss-space-5);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.review-panel__summary-item {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
  font-size: var(--ss-font-size-lg);
  font-weight: var(--ss-font-weight-semibold);
}

.review-panel__item {
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-3);
}

.review-panel__item-head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  margin-bottom: var(--ss-space-3);
}

.review-panel__avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-brand-100);
  color: var(--ss-color-brand-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--ss-font-weight-semibold);
  flex: none;
}

.review-panel__item-body {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
}

.review-panel__product {
  font-size: var(--ss-font-size-sm);
}

.review-panel__content {
  margin: 0;
  line-height: var(--ss-font-line-height-normal);
}

.review-panel__images {
  display: flex;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
}

.review-panel__images img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.review-panel__reply {
  margin-top: var(--ss-space-3);
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  color: var(--ss-color-text-secondary);
  font-size: var(--ss-font-size-sm);
}
</style>
