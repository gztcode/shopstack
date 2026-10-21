<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import Carousel from '@/components/Carousel.vue'
import PriceText from '@/components/PriceText.vue'
import ProductCard from '@/components/ProductCard.vue'
import QuantityStepper from '@/components/QuantityStepper.vue'
import Skeleton from '@/components/Skeleton.vue'
import StarRating from '@/components/StarRating.vue'
import { listReviews, getProduct } from '@/api/product'
import { useAddToCart } from '@/composables/useAddToCart'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useCompareStore } from '@/stores/compare'
import { useHistoryStore } from '@/stores/history'
import { useUserStore } from '@/stores/user'
import type { ProductDetail, Review, ReviewSummary } from '@/types'
import { formatCount, formatDateTime } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const route = useRoute()
const router = useRouter()
const app = useAppStore()
const auth = useAuthStore()
const cart = useCartStore()
const userStore = useUserStore()
const history = useHistoryStore()
const compare = useCompareStore()
const { add } = useAddToCart()

const detail = ref<ProductDetail | null>(null)
const reviews = ref<Review[]>([])
const summary = ref<ReviewSummary>({ total: 0, good: 0, medium: 0, bad: 0, average: 0 })
const loading = ref(true)
const quantity = ref(1)
const activeImage = ref(0)
const selectedSpecs = reactive<Record<string, string>>({})
const favorited = ref(false)

const productId = computed(() => Number(route.params.id))

/** 规格维度（取所有 SKU 规格键的并集） */
const specKeys = computed(() => {
  const keys: string[] = []
  detail.value?.skus.forEach((sku) => {
    Object.keys(sku.specs ?? {}).forEach((key) => {
      if (!keys.includes(key)) keys.push(key)
    })
  })
  return keys
})

/** 当前选中的 SKU */
const selectedSku = computed(() => {
  const skus = detail.value?.skus ?? []
  if (!skus.length) return null
  const matched = skus.find((sku) =>
    specKeys.value.every((key) => (sku.specs?.[key] ?? '') === (selectedSpecs[key] ?? '')),
  )
  return matched ?? skus[0]
})

/** 每个规格维度的可选值 */
const specOptions = computed(() =>
  specKeys.value.map((key) => {
    const options: string[] = []
    detail.value?.skus.forEach((sku) => {
      const value = sku.specs?.[key]
      if (value && !options.includes(value)) options.push(value)
    })
    return { key, options }
  }),
)

/** 某个规格值在当前其它选择下是否可选 */
function optionEnabled(key: string, value: string): boolean {
  const skus = detail.value?.skus ?? []
  return skus.some(
    (sku) =>
      sku.enabled &&
      sku.stock > 0 &&
      sku.specs?.[key] === value &&
      specKeys.value
        .filter((item) => item !== key)
        .every((item) => (sku.specs?.[item] ?? '') === (selectedSpecs[item] ?? '')),
  )
}

const currentPrice = computed(() => selectedSku.value?.price_cents ?? detail.value?.product.min_price_cents ?? 0)
const currentOriginal = computed(
  () => selectedSku.value?.original_price_cents ?? detail.value?.product.max_price_cents ?? 0,
)
const currentStock = computed(() => selectedSku.value?.stock ?? 0)
const soldOut = computed(() => currentStock.value <= 0)

const carouselItems = computed(() => {
  const images = detail.value?.images ?? []
  if (images.length) {
    return images.map((image) => ({ id: image.sort, image: image.url, title: image.alt }))
  }
  const product = detail.value?.product
  return product ? [{ id: product.id, image: product.cover, title: product.title }] : []
})

const relatedProducts = computed(() => detail.value?.related ?? [])

function selectSpec(key: string, value: string): void {
  selectedSpecs[key] = value
  quantity.value = 1
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await getProduct(productId.value)
    detail.value = result
    const first = result.skus[0]
    specKeys.value.forEach((key) => {
      selectedSpecs[key] = first?.specs?.[key] ?? ''
    })
    quantity.value = 1
    activeImage.value = 0
    // 记录浏览足迹（本地存储）
    history.add({
      product_id: result.product.id,
      title: result.product.title,
      cover: result.product.cover,
      price_cents: result.product.min_price_cents,
    })
    const reviewRes = await listReviews({ product_id: productId.value, page: 1, page_size: 5 })
    reviews.value = reviewRes.reviews
    summary.value = reviewRes.summary
  } finally {
    loading.value = false
  }
}

async function addToCart(): Promise<void> {
  const sku = selectedSku.value
  if (!sku) return
  if (soldOut.value) {
    app.warning('该规格暂时缺货')
    return
  }
  await cart.addToCart({
    product_id: productId.value,
    sku_id: sku.id,
    quantity: quantity.value,
  })
  app.success('已加入购物车')
}

async function buyNow(): Promise<void> {
  const sku = selectedSku.value
  if (!sku) return
  if (soldOut.value) {
    app.warning('该规格暂时缺货')
    return
  }
  if (!auth.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  router.push({
    name: 'checkout',
    query: {
      productId: String(productId.value),
      skuId: String(sku.id),
      quantity: String(quantity.value),
    },
  })
}

function addToCompare(): void {
  const sku = selectedSku.value
  const product = detail.value?.product
  if (!sku || !product) {
    app.warning('请先选择规格')
    return
  }
  const result = compare.add({
    product_id: product.id,
    sku_id: sku.id,
    title: product.title,
    cover: product.cover,
    price_cents: sku.price_cents,
    original_price_cents: sku.original_price_cents,
    spec_text: sku.spec_text,
    specs: sku.specs ?? {},
    stock: sku.stock,
    sales_count: product.sales_count,
  })
  if (result.ok) {
    app.success(`${result.message}，当前已选 ${compare.count} 个商品`)
  } else {
    app.warning(result.message)
  }
}

async function toggleFavorite(): Promise<void> {
  if (!auth.isLoggedIn) {
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return
  }
  try {
    favorited.value = await userStore.toggleFavorite(productId.value)
    app.success(favorited.value ? '已加入收藏' : '已取消收藏')
  } catch {
    // 错误提示已由接口层处理
  }
}

watch(productId, load)
watch(
  () => detail.value?.product.id,
  () => {
    if (auth.isLoggedIn) {
      userStore.loadFavorites().then(() => {
        favorited.value = userStore.favorites.some((item) => item.product_id === productId.value)
      })
    }
  },
)

load()
if (auth.isLoggedIn) {
  userStore.loadFavorites().then(() => {
    favorited.value = userStore.favorites.some((item) => item.product_id === productId.value)
  })
}
</script>

<template>
  <div class="detail ss-container ss-page">
    <template v-if="loading && !detail">
      <div class="ss-grid ss-grid-2">
        <Skeleton variant="block" height="380px" />
        <div class="ss-col">
          <Skeleton height="32px" />
          <Skeleton height="20px" />
          <Skeleton height="72px" />
          <Skeleton height="120px" />
        </div>
      </div>
    </template>

    <template v-else-if="detail">
      <nav class="detail__crumb ss-muted-block">
        <RouterLink to="/">首页</RouterLink>
        <span>/</span>
        <RouterLink :to="`/category/${detail.product.category_id}`">
          {{ detail.product.category_name }}
        </RouterLink>
        <span>/</span>
        <span class="ss-ellipsis">{{ detail.product.title }}</span>
      </nav>

      <section class="detail__main ss-card ss-card-pad">
        <div class="detail__gallery">
          <Carousel :items="carouselItems" height="420px" />
          <div class="detail__thumbs">
            <button
              v-for="(item, index) in carouselItems"
              :key="item.id"
              type="button"
              class="detail__thumb"
              :class="{ 'detail__thumb--active': index === activeImage }"
              @click="activeImage = index"
            >
              <img :src="item.image" :alt="item.title" @error="handleImageError" />
            </button>
          </div>
        </div>

        <div class="detail__info">
          <h1 class="detail__title">{{ detail.product.title }}</h1>
          <p class="detail__subtitle">{{ detail.product.subtitle }}</p>

          <div class="detail__price-box">
            <PriceText :cents="currentPrice" :original-cents="currentOriginal" size="lg" />
            <span class="ss-tag ss-tag-accent">
              限时秒杀
            </span>
          </div>

          <div class="detail__meta ss-muted-block">
            <span>已售 {{ formatCount(detail.product.sales_count) }}</span>
            <span>库存 {{ currentStock }}</span>
            <span>分类：{{ detail.product.category_name }}</span>
          </div>

          <div v-for="group in specOptions" :key="group.key" class="detail__spec">
            <span class="detail__spec-label">{{ group.key }}</span>
            <div class="detail__spec-values">
              <button
                v-for="option in group.options"
                :key="option"
                type="button"
                class="detail__spec-value"
                :class="{ 'detail__spec-value--active': selectedSpecs[group.key] === option }"
                :disabled="!optionEnabled(group.key, option)"
                @click="selectSpec(group.key, option)"
              >
                {{ option }}
              </button>
            </div>
          </div>

          <div class="detail__quantity">
            <span class="detail__spec-label">数量</span>
            <QuantityStepper
              v-model="quantity"
              :min="1"
              :max="Math.max(1, currentStock)"
              :disabled="soldOut"
            />
            <span v-if="soldOut" class="ss-text-danger ss-muted-block">该规格暂时缺货</span>
          </div>

          <div class="detail__desc ss-muted-block">{{ detail.product.description }}</div>

          <div class="detail__tags">
            <span v-for="tag in detail.product.tags" :key="tag" class="ss-tag">{{ tag }}</span>
          </div>
        </div>
      </section>

      <!-- 商品参数 -->
      <section v-if="detail.attributes.length" class="ss-section">
        <div class="ss-section-title"><h2>商品参数</h2></div>
        <div class="detail__attributes ss-card ss-card-pad">
          <div v-for="attribute in detail.attributes" :key="attribute.id" class="detail__attribute">
            <span class="ss-muted-block">{{ attribute.name }}</span>
            <span>{{ attribute.value }}</span>
          </div>
        </div>
      </section>

      <!-- 用户评价 -->
      <section class="ss-section">
        <div class="ss-section-title">
          <h2>用户评价</h2>
          <span class="ss-muted-block">共 {{ summary.total }} 条</span>
        </div>
        <div class="detail__reviews ss-card ss-card-pad">
          <div class="detail__review-summary">
            <div class="detail__review-score">
              <strong class="ss-num">{{ Number(summary.average || detail.review_rating).toFixed(1) }}</strong>
              <StarRating :rating="summary.average || detail.review_rating" />
              <span class="ss-muted-block">综合评分</span>
            </div>
            <div class="detail__review-bars">
              <div class="detail__review-bar">
                <span class="ss-muted-block">好评</span>
                <div class="detail__review-track">
                  <div
                    class="detail__review-fill"
                    :style="{ width: `${summary.total ? (summary.good / summary.total) * 100 : 0}%` }"
                  />
                </div>
                <span class="ss-num ss-muted-block">{{ summary.good }}</span>
              </div>
              <div class="detail__review-bar">
                <span class="ss-muted-block">中评</span>
                <div class="detail__review-track">
                  <div
                    class="detail__review-fill"
                    :style="{ width: `${summary.total ? (summary.medium / summary.total) * 100 : 0}%` }"
                  />
                </div>
                <span class="ss-num ss-muted-block">{{ summary.medium }}</span>
              </div>
              <div class="detail__review-bar">
                <span class="ss-muted-block">差评</span>
                <div class="detail__review-track">
                  <div
                    class="detail__review-fill detail__review-fill--danger"
                    :style="{ width: `${summary.total ? (summary.bad / summary.total) * 100 : 0}%` }"
                  />
                </div>
                <span class="ss-num ss-muted-block">{{ summary.bad }}</span>
              </div>
            </div>
          </div>

          <ul v-if="reviews.length" class="detail__review-list">
            <li v-for="review in reviews" :key="review.id" class="detail__review-item">
              <div class="ss-row-between">
                <strong>{{ review.user_nickname }}</strong>
                <StarRating :rating="review.rating" size="sm" />
              </div>
              <p class="detail__review-content">{{ review.content }}</p>
              <span class="ss-muted-block">
                {{ review.sku_text }} · {{ formatDateTime(review.created_at) }}
              </span>
            </li>
          </ul>
          <p v-else class="ss-muted-block">暂无评价，欢迎成为第一个评价的人。</p>
        </div>
      </section>

      <!-- 相关推荐 -->
      <section v-if="relatedProducts.length" class="ss-section">
        <div class="ss-section-title"><h2>相关推荐</h2></div>
        <div class="ss-grid ss-grid-4">
          <ProductCard
            v-for="product in relatedProducts"
            :key="product.id"
            :product="product"
            @add="add($event.id)"
          />
        </div>
      </section>

      <!-- 底部操作栏 -->
      <div class="detail__bar">
        <button type="button" class="detail__bar-icon" @click="router.push('/cart')">
          <span>🛒</span>
          <small>购物车</small>
        </button>
        <button type="button" class="detail__bar-icon" @click="toggleFavorite">
          <span>{{ favorited ? '💖' : '🤍' }}</span>
          <small>{{ favorited ? '已收藏' : '收藏' }}</small>
        </button>
        <button type="button" class="detail__bar-icon" @click="addToCompare">
          <span>⚖️</span>
          <small>对比</small>
        </button>
        <RouterLink class="detail__bar-icon" to="/history">
          <span>🕘</span>
          <small>足迹</small>
        </RouterLink>
        <button
          type="button"
          class="ss-btn ss-btn-accent detail__bar-btn"
          :disabled="soldOut"
          @click="addToCart"
        >
          加入购物车
        </button>
        <button
          type="button"
          class="ss-btn ss-btn-primary detail__bar-btn"
          :disabled="soldOut"
          @click="buyNow"
        >
          立即购买
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.detail__crumb {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
  overflow: hidden;
  white-space: nowrap;
}

.detail__main {
  display: grid;
  grid-template-columns: minmax(0, 460px) minmax(0, 1fr);
  gap: var(--ss-space-7);
}

.detail__thumbs {
  display: flex;
  gap: var(--ss-space-2);
  margin-top: var(--ss-space-3);
  flex-wrap: wrap;
}

.detail__thumb {
  width: 64px;
  height: 64px;
  padding: 0;
  border: 1px solid var(--ss-color-border-subtle);
  border-radius: var(--ss-radius-md);
  overflow: hidden;
  cursor: pointer;
  background: var(--ss-color-bg-subtle);
}

.detail__thumb--active {
  border-color: var(--ss-color-brand-600);
}

.detail__thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail__info {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
  min-width: 0;
}

.detail__title {
  font-size: var(--ss-font-size-3xl);
  font-weight: var(--ss-font-weight-bold);
  letter-spacing: var(--ss-font-letter-spacing-tight);
}

.detail__subtitle {
  margin: 0;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-lg);
}

.detail__price-box {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  background: linear-gradient(90deg, var(--ss-color-brand-50), transparent);
}

.detail__meta {
  display: flex;
  gap: var(--ss-space-5);
  flex-wrap: wrap;
}

.detail__spec {
  display: flex;
  gap: var(--ss-space-3);
  align-items: flex-start;
}

.detail__spec-label {
  width: 44px;
  flex: none;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-md);
  line-height: 32px;
}

.detail__spec-values {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ss-space-2);
}

.detail__spec-value {
  min-width: 56px;
  height: 32px;
  padding: 0 var(--ss-space-3);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-sm);
  background: var(--ss-color-bg-card);
  cursor: pointer;
  font-size: var(--ss-font-size-sm);
}

.detail__spec-value:hover:not(:disabled) {
  border-color: var(--ss-color-brand-600);
  color: var(--ss-color-brand-600);
}

.detail__spec-value--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
  color: var(--ss-color-brand-600);
  font-weight: var(--ss-font-weight-medium);
}

.detail__spec-value:disabled {
  color: var(--ss-color-text-placeholder);
  background: var(--ss-color-neutral-50);
  cursor: not-allowed;
  text-decoration: line-through;
}

.detail__quantity {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
}

.detail__desc {
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  line-height: var(--ss-font-line-height-relaxed);
}

.detail__tags {
  display: flex;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
}

.detail__attributes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ss-space-3) var(--ss-space-6);
}

.detail__attribute {
  display: flex;
  gap: var(--ss-space-4);
  font-size: var(--ss-font-size-md);
}

.detail__attribute span:first-child {
  width: 72px;
  flex: none;
}

.detail__reviews {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-5);
}

.detail__review-summary {
  display: flex;
  gap: var(--ss-space-8);
  padding-bottom: var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.detail__review-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 120px;
}

.detail__review-score strong {
  font-size: var(--ss-font-size-5xl);
  color: var(--ss-color-danger-600);
}

.detail__review-bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  justify-content: center;
}

.detail__review-bar {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  font-size: var(--ss-font-size-sm);
}

.detail__review-bar span:first-child {
  width: 32px;
  flex: none;
}

.detail__review-track {
  flex: 1;
  height: 8px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-100);
  overflow: hidden;
}

.detail__review-fill {
  height: 100%;
  background: var(--ss-color-success-500);
  border-radius: var(--ss-radius-pill);
}

.detail__review-fill--danger {
  background: var(--ss-color-danger-500);
}

.detail__review-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-4);
}

.detail__review-item {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
}

.detail__review-content {
  margin: 0;
  color: var(--ss-color-text-secondary);
  line-height: var(--ss-font-line-height-relaxed);
}

.detail__bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--ss-z-index-sticky);
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) var(--ss-space-5);
  background: var(--ss-color-bg-card);
  border-top: 1px solid var(--ss-color-border-subtle);
  box-shadow: var(--ss-shadow-lg);
}

.detail__bar-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border: 0;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  color: var(--ss-color-text-secondary);
}

.detail__bar-icon small {
  font-size: var(--ss-font-size-xs);
}

.detail__bar-btn {
  flex: 1;
}

@media (max-width: 1023px) {
  .detail__main {
    grid-template-columns: 1fr;
    gap: var(--ss-space-5);
  }

  .detail__attributes {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .detail__title {
    font-size: var(--ss-font-size-2xl);
  }

  .detail__review-summary {
    flex-direction: column;
    gap: var(--ss-space-4);
  }

  .detail__bar {
    padding: var(--ss-space-2) var(--ss-space-3);
    bottom: 56px;
  }

  .detail__bar-btn {
    height: 40px;
    padding: 0 var(--ss-space-3);
    font-size: var(--ss-font-size-md);
  }
}
</style>
