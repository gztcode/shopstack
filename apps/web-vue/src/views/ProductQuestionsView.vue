<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { listProductQuestions } from '@/api/product'
import type { PageMeta, ProductQuestion } from '@/types'
import { formatDateTime } from '@/utils/format'
import { handleImageError } from '@/utils/image'

/**
 * 商品问答
 * 数据来源 GET /api/v1/products/{id}/questions。
 */
const route = useRoute()

const questions = ref<ProductQuestion[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 10, total: 0, total_pages: 1 })
const loading = ref(false)

const PAGE_SIZE = 10

const productId = computed(() => {
  const raw = route.params.id ?? route.query.productId
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : 0
})

async function load(): Promise<void> {
  if (!productId.value) {
    questions.value = []
    return
  }
  loading.value = true
  try {
    const result = await listProductQuestions(productId.value, {
      page: meta.value.page,
      page_size: PAGE_SIZE,
    })
    questions.value = result.questions
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

watch(productId, () => {
  meta.value = { ...meta.value, page: 1 }
  load()
})

onMounted(load)
</script>

<template>
  <div class="product-questions ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">商品问答</h1>
        <p class="ss-page-sub">买家的真实提问与商家解答</p>
      </div>
      <RouterLink
        v-if="productId"
        class="ss-btn ss-btn-outline ss-btn-sm"
        :to="`/product/${productId}`"
      >
        查看商品
      </RouterLink>
    </div>

    <EmptyState
      v-if="!questions.length && !loading"
      icon="❓"
      title="还没有人提问"
      description="把疑问提给商家，收到回答后会第一时间通知你"
      action-text="去商品页提问"
      @action="$router.push(productId ? `/product/${productId}` : '/category')"
    />

    <article v-for="question in questions" :key="question.id" class="product-questions__item ss-card">
      <header class="product-questions__head">
        <span class="product-questions__avatar">{{ question.user_nickname.slice(0, 1) }}</span>
        <div class="ss-col">
          <strong>{{ question.user_nickname }}</strong>
          <span class="ss-muted-block">{{ formatDateTime(question.created_at) }}</span>
        </div>
      </header>

      <p class="product-questions__content">{{ question.content }}</p>

      <div v-if="question.images.length" class="product-questions__images">
        <img
          v-for="(image, index) in question.images"
          :key="index"
          :src="image"
          :alt="`提问图片 ${index + 1}`"
          @error="handleImageError"
        />
      </div>

      <footer v-if="question.reply" class="product-questions__reply">
        <div class="product-questions__reply-head">
          <span class="ss-tag ss-tag-success">商家回答</span>
          <span class="ss-muted-block">{{ formatDateTime(question.reply_at) }}</span>
        </div>
        <p>{{ question.reply }}</p>
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
.product-questions__item {
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-3);
}

.product-questions__head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  margin-bottom: var(--ss-space-3);
}

.product-questions__avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-accent-100);
  color: var(--ss-color-accent-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--ss-font-weight-semibold);
  flex: none;
}

.product-questions__content {
  margin: 0;
  line-height: var(--ss-font-line-height-normal);
}

.product-questions__images {
  display: flex;
  gap: var(--ss-space-2);
  margin-top: var(--ss-space-2);
  flex-wrap: wrap;
}

.product-questions__images img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.product-questions__reply {
  margin-top: var(--ss-space-3);
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-success-50);
}

.product-questions__reply-head {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  margin-bottom: var(--ss-space-1);
}

.product-questions__reply p {
  margin: 0;
  color: var(--ss-color-text-secondary);
}
</style>
