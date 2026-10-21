<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import { listReviewTags } from '@/api/product'
import { listReviews } from '@/api/product'
import type { PageMeta, Review, ReviewTag } from '@/types'
import { formatFromNow } from '@/utils/format'
import { handleImageError } from '@/utils/image'

/**
 * 评价标签
 * 展示平台配置的评价标签体系（GET /api/v1/reviews/tags），
 * 并给出每个标签下已聚合的评价条数（GET /api/v1/reviews）。
 */
const tags = ref<ReviewTag[]>([])
const reviews = ref<Review[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 10, total: 0, total_pages: 1 })
const loading = ref(false)

/** 标签 → 评价条数（按评价内容命中标签关键词统计） */
const tagCounts = computed(() => {
  const counts: Record<number, number> = {}
  tags.value.forEach((tag) => {
    counts[tag.id] = reviews.value.filter((review) => review.content.includes(tag.name)).length
  })
  return counts
})

/** 命中标签最多的评价，优先展示有图且被商家回复过的 */
const topReviews = computed(() =>
  [...reviews.value]
    .sort((a, b) => {
      const aHit = a.images.length > 0 ? 1 : 0
      const bHit = b.images.length > 0 ? 1 : 0
      if (aHit !== bHit) return bHit - aHit
      return b.like_count - a.like_count
    })
    .slice(0, 4),
)

async function load(): Promise<void> {
  loading.value = true
  try {
    const [tagRes, reviewRes] = await Promise.all([
      listReviewTags({ page_size: 50 }),
      listReviews({ page: 1, page_size: 50 }),
    ])
    tags.value = tagRes.tags
    reviews.value = reviewRes.reviews
    meta.value = reviewRes.meta
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="review-tag ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">评价标签</h1>
        <p class="ss-page-sub">买家最常提到的关键词，帮你快速判断商品表现</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/review/all">全部评价</RouterLink>
    </div>

    <EmptyState
      v-if="!tags.length && !loading"
      icon="🏷️"
      title="暂无评价标签"
      description="标签由平台统一维护，商家评价后会自动归类"
      action-text="去写评价"
      @action="$router.push('/reviews')"
    />

    <section v-else class="review-tag__list ss-card">
      <RouterLink
        v-for="tag in tags"
        :key="tag.id"
        class="review-tag__item"
        :to="`/review-all?tag=${tag.id}`"
      >
        <span class="review-tag__name">{{ tag.name }}</span>
        <span class="ss-tag ss-tag-accent">{{ tagCounts[tag.id] ?? 0 }} 条</span>
      </RouterLink>
    </section>

    <section v-if="topReviews.length" class="ss-section">
      <div class="ss-section-title">
        <h2>标签关联的精选评价</h2>
      </div>
      <div class="ss-grid ss-grid-2">
        <article v-for="review in topReviews" :key="review.id" class="review-tag__review ss-card">
          <header class="review-tag__review-head">
            <strong>{{ review.user_nickname }}</strong>
            <span class="ss-grow" />
            <span class="ss-muted-block">{{ formatFromNow(review.created_at) }}</span>
          </header>
          <p class="review-tag__review-content">{{ review.content }}</p>
          <div v-if="review.images.length" class="review-tag__review-images">
            <img
              v-for="(image, index) in review.images"
              :key="index"
              :src="image"
              :alt="`评价图片 ${index + 1}`"
              @error="handleImageError"
            />
          </div>
          <RouterLink class="ss-text-brand" :to="`/product/${review.product_id}`">
            {{ review.product_title }}
          </RouterLink>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.review-tag__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
}

.review-tag__item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-2) var(--ss-space-3);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-bg-card);
}

.review-tag__item:hover {
  border-color: var(--ss-color-brand-600);
}

.review-tag__name {
  font-size: var(--ss-font-size-sm);
}

.review-tag__review {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
}

.review-tag__review-head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
}

.review-tag__review-content {
  margin: 0;
  line-height: var(--ss-font-line-height-normal);
}

.review-tag__review-images {
  display: flex;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
}

.review-tag__review-images img {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}
</style>
