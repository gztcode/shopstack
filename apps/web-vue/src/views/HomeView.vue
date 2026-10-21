<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import Carousel from '@/components/Carousel.vue'
import ProductCard from '@/components/ProductCard.vue'
import { useAddToCart } from '@/composables/useAddToCart'
import { listBanners } from '@/api/product'
import { listCategories, listProducts } from '@/api/product'
import { listPromotions } from '@/api/marketing'
import type { Banner, Category, Product, Promotion } from '@/types'
import { formatCountdown, formatYuan } from '@/utils/format'

const router = useRouter()
const { add } = useAddToCart()

const keyword = ref('')
const banners = ref<Banner[]>([])
const categories = ref<Category[]>([])
const promotions = ref<Promotion[]>([])
const products = ref<Product[]>([])
const loading = ref(true)
const now = ref(Math.floor(Date.now() / 1000))
let timer: number | null = null

/** 秒杀倒计时（取最近结束的活动） */
const seckill = computed(() => {
  const promotion = promotions.value[0]
  if (!promotion) return null
  const remain = Math.max(0, promotion.end_time - now.value)
  return { promotion, remain, text: formatCountdown(remain) }
})

const seckillProducts = computed(() => products.value.slice(0, 4))

function search(): void {
  const value = keyword.value.trim()
  if (!value) {
    router.push({ name: 'category' })
    return
  }
  router.push({ name: 'search', query: { q: value } })
}

function openBanner(item: { link?: string }): void {
  if (item.link) router.push(item.link)
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const [bannerRes, categoryRes, promotionRes, productRes] = await Promise.all([
      listBanners('home_banner'),
      listCategories({ tree: true }),
      listPromotions({ status: 1 }),
      listProducts({ page: 1, page_size: 10, sort: 'sales' }),
    ])
    banners.value = bannerRes.banners
    categories.value = categoryRes.categories
    promotions.value = promotionRes.promotions
    products.value = productRes.products
  } finally {
    loading.value = false
  }
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
  <div class="home ss-container ss-page">
    <!-- Hero 搜索 -->
    <section class="home-hero">
      <div class="home-hero__text">
        <h1 class="home-hero__title">ShopStack 商城 · 一站式好物</h1>
        <p class="home-hero__desc">
          {{ promotions.length ? promotions[0].description : '数码家居服饰生鲜，正品保障' }}
        </p>
        <form class="home-hero__search" @submit.prevent="search">
          <input v-model="keyword" type="search" placeholder="搜索你想要的商品" aria-label="搜索商品" />
          <button type="submit" class="ss-btn ss-btn-accent ss-btn-lg">立即搜索</button>
        </form>
      </div>
      <div class="home-hero__decoration" aria-hidden="true">
        <span>🛍️</span>
        <span>📦</span>
        <span>🚚</span>
      </div>
    </section>

    <!-- 分类快捷入口 -->
    <section class="ss-section">
      <div class="ss-section-title">
        <h2>分类导航</h2>
        <RouterLink class="ss-text-brand ss-muted-block" to="/category">全部商品 →</RouterLink>
      </div>
      <div class="home-categories ss-scroll-x">
        <RouterLink
          v-for="category in categories"
          :key="category.id"
          class="home-categories__item"
          :to="`/category/${category.id}`"
        >
          <span class="home-categories__icon">{{ category.icon || '🛍️' }}</span>
          <span class="home-categories__name">{{ category.name }}</span>
          <span class="home-categories__count">{{ category.product_count }} 件</span>
        </RouterLink>
      </div>
    </section>

    <!-- 轮播图 -->
    <section class="ss-section">
      <Carousel :items="banners" height="360px" @select="openBanner" />
    </section>

    <!-- 限时秒杀 -->
    <section v-if="seckill" class="ss-section">
      <div class="home-seckill">
        <div class="home-seckill__head">
          <div class="ss-row">
            <strong class="home-seckill__title">⚡ 限时秒杀</strong>
            <span class="ss-muted-block">{{ seckill.promotion.name }}</span>
          </div>
          <span class="home-seckill__timer">
            距结束 <b class="ss-num">{{ seckill.text }}</b>
          </span>
        </div>
        <div class="ss-grid ss-grid-4">
          <ProductCard
            v-for="product in seckillProducts"
            :key="product.id"
            :product="product"
            @add="add($event.id)"
          />
        </div>
      </div>
    </section>

    <!-- 促销模块 -->
    <section v-if="promotions.length" class="ss-section">
      <div class="ss-section-title">
        <h2>促销活动</h2>
      </div>
      <div class="ss-grid ss-grid-3">
        <div v-for="promotion in promotions" :key="promotion.id" class="home-promo ss-card">
          <img :src="promotion.banner_image" :alt="promotion.name" />
          <div class="home-promo__body">
            <strong>{{ promotion.name }}</strong>
            <p class="ss-muted-block">{{ promotion.description }}</p>
            <div class="ss-row-between">
              <span class="ss-tag ss-tag-accent">
                已参与 {{ promotion.sold_count }} 人
              </span>
              <span class="ss-text-brand ss-muted-block">
                <template v-if="promotion.type === 3">限时秒杀</template>
                <template v-else-if="promotion.type === 2">{{ promotion.percent / 10 }} 折</template>
                <template v-else>满 {{ formatYuan(promotion.min_amount_cents) }} 减 {{ formatYuan(promotion.discount_cents) }}</template>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 商品推荐 -->
    <section class="ss-section">
      <div class="ss-section-title">
        <h2>热销推荐</h2>
        <RouterLink class="ss-text-brand ss-muted-block" to="/category?sort=sales">查看更多 →</RouterLink>
      </div>
      <div class="ss-grid ss-grid-4">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          :loading="loading"
          @add="add($event.id)"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-6);
  padding: var(--ss-space-8);
  border-radius: var(--ss-radius-xl);
  background: var(--ss-gradient-hero);
  color: var(--ss-color-text-inverse);
  margin-bottom: var(--ss-space-7);
}

.home-hero__title {
  font-size: var(--ss-font-size-4xl);
  font-weight: var(--ss-font-weight-bold);
  letter-spacing: var(--ss-font-letter-spacing-tight);
}

.home-hero__desc {
  margin: var(--ss-space-3) 0 var(--ss-space-5);
  opacity: 0.85;
}

.home-hero__search {
  display: flex;
  gap: var(--ss-space-3);
  max-width: 560px;
}

.home-hero__search input {
  flex: 1;
  height: 48px;
  padding: 0 var(--ss-space-4);
  border: 0;
  border-radius: var(--ss-radius-pill);
  outline: none;
  font-size: var(--ss-font-size-md);
}

.home-hero__decoration {
  display: flex;
  gap: var(--ss-space-4);
  font-size: 64px;
  opacity: 0.9;
}

.home-categories {
  display: flex;
  gap: var(--ss-space-3);
  padding-bottom: var(--ss-space-2);
}

.home-categories__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  flex: none;
  width: 116px;
  padding: var(--ss-space-4) var(--ss-space-2);
  border-radius: var(--ss-radius-lg);
  background: var(--ss-color-bg-card);
  border: 1px solid var(--ss-color-border-subtle);
  transition: box-shadow var(--ss-duration-base) var(--ss-easing-standard);
}

.home-categories__item:hover {
  box-shadow: var(--ss-shadow-md);
}

.home-categories__icon {
  font-size: 30px;
}

.home-categories__name {
  font-size: var(--ss-font-size-md);
  font-weight: var(--ss-font-weight-medium);
}

.home-categories__count {
  color: var(--ss-color-text-quaternary);
  font-size: var(--ss-font-size-xs);
}

.home-seckill {
  padding: var(--ss-space-5);
  border-radius: var(--ss-radius-xl);
  background: var(--ss-gradient-accent);
  color: var(--ss-color-text-inverse);
}

.home-seckill__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-3);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.home-seckill__title {
  font-size: var(--ss-font-size-2xl);
}

.home-seckill__timer {
  font-size: var(--ss-font-size-md);
}

.home-promo {
  overflow: hidden;
}

.home-promo img {
  width: 100%;
  height: 140px;
  object-fit: cover;
}

.home-promo__body {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
}

.home-promo__body p {
  margin: 0;
}

@media (max-width: 1023px) {
  .home-hero__decoration {
    display: none;
  }
}

@media (max-width: 767px) {
  .home-hero {
    padding: var(--ss-space-5);
    border-radius: var(--ss-radius-lg);
  }

  .home-hero__title {
    font-size: var(--ss-font-size-2xl);
  }

  .home-hero__search {
    flex-direction: column;
  }
}
</style>
