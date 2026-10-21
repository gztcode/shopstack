<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import StarRating from '@/components/StarRating.vue'
import { createReview, listReviews } from '@/api/product'
import { getOrder, listOrders } from '@/api/order'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import type { Order, OrderItem, PageMeta, Review } from '@/types'
import { reviewStatusText } from '@/utils/enums'
import { formatDateTime } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const app = useAppStore()
const auth = useAuthStore()

const reviews = ref<Review[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 10, total: 0, total_pages: 1 })
const loading = ref(false)
const submitting = ref(false)

/** 可评价的商品（来自我的订单） */
const orderItems = ref<OrderItem[]>([])
const orders = ref<Order[]>([])

/** 演示环境没有对象存储，图片使用内置占位地址 */
const PLACEHOLDER_IMAGES = [
  'https://placehold.co/600x600/2A4AD9/FFFFFF?text=Review+1',
  'https://placehold.co/600x600/0BA5EC/FFFFFF?text=Review+2',
  'https://placehold.co/600x600/12B76A/FFFFFF?text=Review+3',
]

const form = reactive({
  product_id: 0,
  sku_id: 0,
  rating: 5,
  content: '',
  images: [] as string[],
})

const errors = reactive<Record<string, string>>({})

const canSubmit = computed(
  () => form.product_id > 0 && form.content.trim().length > 0 && !submitting.value,
)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listReviews({
      page: meta.value.page,
      page_size: meta.value.page_size,
      user_id: auth.user?.id,
    })
    reviews.value = result.reviews
    meta.value = result.meta
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

async function loadOrderItems(): Promise<void> {
  try {
    const result = await listOrders({ page: 1, page_size: 20 })
    orders.value = result.orders
    const items: OrderItem[] = []
    for (const order of result.orders) {
      // 已付款及之后的订单都可以评价
      const canReview =
        order.status === 'ORDER_STATUS_PAID' ||
        order.status === 'ORDER_STATUS_SHIPPED' ||
        order.status === 'ORDER_STATUS_COMPLETED'
      if (!canReview) {
        continue
      }
      const detail = await getOrder(order.id)
      detail.items.forEach((item) => {
        if (!item.reviewed) {
          items.push({ ...item, order_id: order.id })
        }
      })
    }
    orderItems.value = items
    if (items.length) {
      form.product_id = items[0].product_id
      form.sku_id = items[0].sku_id
    }
  } catch {
    // 订单加载失败时仍可浏览评价列表
  }
}

function selectItem(item: OrderItem): void {
  form.product_id = item.product_id
  form.sku_id = item.sku_id
}

function toggleImage(url: string): void {
  const index = form.images.indexOf(url)
  if (index >= 0) {
    form.images.splice(index, 1)
    return
  }
  if (form.images.length >= 3) {
    app.warning('最多上传 3 张图片')
    return
  }
  form.images.push(url)
}

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  if (!form.product_id) errors.product_id = '请选择要评价的商品'
  if (form.rating < 1 || form.rating > 5) errors.rating = '请选择 1-5 星评分'
  if (!form.content.trim()) errors.content = '请填写评价内容'
  return Object.keys(errors).length === 0
}

async function submit(): Promise<void> {
  if (!validate()) {
    app.warning('请完善评价内容')
    return
  }
  submitting.value = true
  try {
    await createReview({
      product_id: form.product_id,
      sku_id: form.sku_id,
      rating: form.rating,
      content: form.content.trim(),
      images: form.images,
    })
    app.success('评价提交成功，等待审核')
    form.content = ''
    form.images = []
    form.rating = 5
    await Promise.all([load(), loadOrderItems()])
  } catch {
    // 错误提示已由接口层处理
  } finally {
    submitting.value = false
  }
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
}

onMounted(() => {
  load()
  loadOrderItems()
})
</script>

<template>
  <div class="reviews ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">我的评价</h1>
        <p class="ss-page-sub">发表评价可获得积分奖励</p>
      </div>
    </div>

    <!-- 写评价 -->
    <section class="ss-card ss-card-pad reviews__form">
      <h2 class="reviews__title">发表评价</h2>

      <div class="ss-field">
        <span class="ss-label">选择商品</span>
        <div v-if="orderItems.length" class="reviews__items">
          <button
            v-for="item in orderItems"
            :key="`${item.order_id}-${item.id}`"
            type="button"
            class="reviews__item"
            :class="{ 'reviews__item--active': form.product_id === item.product_id && form.sku_id === item.sku_id }"
            @click="selectItem(item)"
          >
            <img :src="item.image" :alt="item.product_title" @error="handleImageError" />
            <span class="reviews__item-title ss-ellipsis">{{ item.product_title }}</span>
            <small class="ss-muted-block">{{ item.spec_text }}</small>
          </button>
        </div>
        <p v-else class="ss-muted-block">暂无可评价的商品（订单完成后可评价）</p>
        <span v-if="errors.product_id" class="ss-error-text">{{ errors.product_id }}</span>
      </div>

      <div class="ss-field">
        <span class="ss-label">评分</span>
        <div class="reviews__stars">
          <button
            v-for="value in 5"
            :key="value"
            type="button"
            class="reviews__star"
            :class="{ 'reviews__star--on': value <= form.rating }"
            @click="form.rating = value"
          >
            ★
          </button>
          <StarRating :rating="form.rating" size="sm" />
          <span v-if="errors.rating" class="ss-error-text">{{ errors.rating }}</span>
        </div>
      </div>

      <label class="ss-field">
        <span class="ss-label">评价内容</span>
        <textarea
          v-model="form.content"
          class="ss-textarea"
          placeholder="说说商品的使用感受吧（至少 5 个字）"
        />
        <span v-if="errors.content" class="ss-error-text">{{ errors.content }}</span>
      </label>

      <div class="ss-field">
        <span class="ss-label">上传图片（演示环境使用占位图）</span>
        <div class="reviews__images">
          <button
            v-for="url in PLACEHOLDER_IMAGES"
            :key="url"
            type="button"
            class="reviews__image"
            :class="{ 'reviews__image--active': form.images.includes(url) }"
            @click="toggleImage(url)"
          >
            <img :src="url" alt="评价图片" @error="handleImageError" />
            <span v-if="form.images.includes(url)" class="reviews__image-check">✓</span>
          </button>
        </div>
      </div>

      <div class="ss-row">
        <button
          type="button"
          class="ss-btn ss-btn-primary"
          :disabled="!canSubmit"
          @click="submit"
        >
          {{ submitting ? '提交中…' : '提交评价' }}
        </button>
        <span class="ss-muted-block">提交后可获得 50 积分</span>
      </div>
    </section>

    <!-- 评价列表 -->
    <div class="reviews__list-head">
      <h2 class="reviews__title">评价记录</h2>
      <span class="ss-muted-block">共 {{ meta.total }} 条</span>
    </div>

    <EmptyState
      v-if="!reviews.length && !loading"
      icon="⭐"
      title="还没有发表评价"
      description="完成订单后即可发表评价赢积分"
    />

    <div v-else class="reviews__list">
      <article v-for="review in reviews" :key="review.id" class="reviews__item-card ss-card ss-card-pad">
        <div class="ss-row-between">
          <div class="ss-row">
            <strong>{{ review.product_title || `商品 #${review.product_id}` }}</strong>
            <StarRating :rating="review.rating" size="sm" />
            <span class="ss-tag ss-tag-neutral">{{ review.sku_text }}</span>
          </div>
          <span class="ss-muted-block">{{ formatDateTime(review.created_at) }}</span>
        </div>
        <p class="reviews__content">{{ review.content }}</p>
        <div v-if="review.images.length" class="reviews__thumbs">
          <img v-for="image in review.images" :key="image" :src="image" alt="评价图片" @error="handleImageError" />
        </div>
        <div class="ss-row-between">
          <span class="ss-tag ss-tag-warning">{{ reviewStatusText(review.status) }}</span>
          <span v-if="review.admin_reply" class="ss-muted-block">商家回复：{{ review.admin_reply }}</span>
          <span v-else class="ss-muted-block">{{ review.like_count }} 人觉得有用</span>
        </div>
      </article>
    </div>

    <Pagination
      :page="meta.page"
      :page-size="meta.page_size"
      :total="meta.total"
      @change="changePage"
    />
  </div>
</template>

<style scoped>
.reviews__form {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-4);
  margin-bottom: var(--ss-space-5);
}

.reviews__title {
  font-size: var(--ss-font-size-xl);
}

.reviews__items {
  display: flex;
  gap: var(--ss-space-3);
  flex-wrap: wrap;
}

.reviews__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 180px;
  padding: var(--ss-space-2);
  border: 1px solid var(--ss-color-border-subtle);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-card);
  cursor: pointer;
  text-align: left;
}

.reviews__item--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
}

.reviews__item img {
  width: 100%;
  height: 96px;
  object-fit: cover;
  border-radius: var(--ss-radius-sm);
  background: var(--ss-color-bg-subtle);
}

.reviews__item-title {
  font-size: var(--ss-font-size-sm);
  font-weight: var(--ss-font-weight-medium);
  width: 100%;
}

.reviews__stars {
  display: flex;
  align-items: center;
  gap: var(--ss-space-1);
}

.reviews__star {
  border: 0;
  background: transparent;
  font-size: 24px;
  color: var(--ss-color-neutral-300);
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.reviews__star--on {
  color: var(--ss-color-warning-500);
}

.reviews__images {
  display: flex;
  gap: var(--ss-space-2);
}

.reviews__image {
  position: relative;
  width: 72px;
  height: 72px;
  padding: 0;
  border: 1px solid var(--ss-color-border-subtle);
  border-radius: var(--ss-radius-md);
  overflow: hidden;
  background: var(--ss-color-bg-subtle);
  cursor: pointer;
}

.reviews__image--active {
  border-color: var(--ss-color-brand-600);
}

.reviews__image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reviews__image-check {
  position: absolute;
  right: 2px;
  bottom: 2px;
  width: 18px;
  height: 18px;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.reviews__list-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: var(--ss-space-3);
}

.reviews__list {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
}

.reviews__item-card {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
}

.reviews__content {
  margin: 0;
  color: var(--ss-color-text-secondary);
  line-height: var(--ss-font-line-height-relaxed);
}

.reviews__thumbs {
  display: flex;
  gap: var(--ss-space-2);
}

.reviews__thumbs img {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}
</style>
