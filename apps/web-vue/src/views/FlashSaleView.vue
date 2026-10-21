<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import PriceText from '@/components/PriceText.vue'
import { listPromotions } from '@/api/marketing'
import { getProduct, listProducts } from '@/api/product'
import { useAppStore } from '@/stores/app'
import type { Product, Promotion } from '@/types'
import { formatCountdown, formatNumber } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const router = useRouter()
const app = useAppStore()

const promotions = ref<Promotion[]>([])
const products = ref<Product[]>([])
const loading = ref(false)
const buying = ref<number | null>(null)
const now = ref(Math.floor(Date.now() / 1000))
let timer: number | null = null

/** 秒杀活动：promotion.type === 3 */
const flashPromotions = computed(() => promotions.value.filter((item) => item.type === 3))

/** 距离最近一个活动结束的倒计时 */
const nearestEnd = computed(() => {
  const ends = flashPromotions.value.map((item) => item.end_time).filter((value) => value > now.value)
  if (!ends.length) return null
  const end = Math.min(...ends)
  return { end, remain: end - now.value, text: formatCountdown(end - now.value) }
})

/** 活动对应的商品 */
function productOf(promotion: Promotion): Product | undefined {
  if (promotion.product_id) {
    return products.value.find((item) => item.id === promotion.product_id)
  }
  return products.value[0]
}

/** 已抢进度 */
function soldPercent(promotion: Promotion): number {
  const limit = promotion.limit_per_user || 0
  if (!limit) return 0
  return Math.min(100, Math.round((promotion.sold_count / limit) * 100))
}

async function grab(promotion: Promotion): Promise<void> {
  const product = productOf(promotion)
  if (!product) {
    app.warning('活动商品暂不可售')
    return
  }
  buying.value = promotion.id
  try {
    const detail = await getProduct(product.id)
    const sku = detail.skus.find((item) => item.enabled && item.stock > 0)
    if (!sku) {
      app.warning('该商品暂时缺货')
      return
    }
    router.push({
      name: 'checkout',
      query: {
        productId: String(product.id),
        skuId: String(sku.id),
        quantity: '1',
      },
    })
  } catch {
    // 错误提示已由接口层处理
  } finally {
    buying.value = null
  }
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const [promotionRes, productRes] = await Promise.all([
      listPromotions({ status: 1 }),
      listProducts({ page: 1, page_size: 12, sort: 'sales' }),
    ])
    promotions.value = promotionRes.promotions
    products.value = productRes.products
  } catch {
    // 错误提示已由接口层处理
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
  <div class="flash-sale ss-container ss-page">
    <section class="flash-sale__hero">
      <div>
        <h1 class="flash-sale__title">⚡ 限时秒杀</h1>
        <p class="flash-sale__desc">整点开抢，先到先得，手慢无</p>
      </div>
      <div class="flash-sale__timer">
        <span class="ss-muted-block">距本场结束</span>
        <strong class="ss-num">{{ nearestEnd?.text ?? '00:00:00' }}</strong>
      </div>
    </section>

    <EmptyState
      v-if="!flashPromotions.length && !loading"
      icon="⚡"
      title="暂无进行中的秒杀活动"
      description="活动开始后会在这里展示限时好价"
      action-text="去逛逛"
      @action="router.push('/category')"
    />

    <section v-for="promotion in flashPromotions" :key="promotion.id" class="ss-section">
      <div class="flash-sale__head ss-card ss-card-pad">
        <div class="ss-grow">
          <strong>{{ promotion.name }}</strong>
          <p class="ss-muted-block">{{ promotion.description }}</p>
        </div>
        <div class="flash-sale__countdown">
          <span class="ss-muted-block">距结束</span>
          <strong class="ss-num">
            {{ formatCountdown(Math.max(0, promotion.end_time - now)) }}
          </strong>
        </div>
      </div>

      <div class="ss-grid ss-grid-3 flash-sale__products">
        <article
          v-for="product in [productOf(promotion)].filter(Boolean)"
          :key="product!.id"
          class="flash-sale__card ss-card"
        >
          <RouterLink :to="`/product/${product!.id}`">
            <img :src="product!.cover" :alt="product!.title" @error="handleImageError" />
          </RouterLink>
          <div class="ss-col flash-sale__info">
            <RouterLink :to="`/product/${product!.id}`" class="flash-sale__name ss-ellipsis">
              {{ product!.title }}
            </RouterLink>
            <PriceText
              :cents="promotion.discount_cents || product!.min_price_cents"
              :original-cents="product!.min_price_cents"
              size="md"
            />
            <div class="flash-sale__progress">
              <div class="flash-sale__track">
                <div
                  class="flash-sale__fill"
                  :style="{ width: `${soldPercent(promotion)}%` }"
                />
              </div>
              <span class="ss-muted-block">已抢 {{ formatNumber(promotion.sold_count) }}</span>
            </div>
            <button
              type="button"
              class="ss-btn ss-btn-accent ss-btn-block"
              :disabled="buying === promotion.id"
              @click="grab(promotion)"
            >
              {{ buying === promotion.id ? '抢购中…' : '立即抢购' }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<style scoped>
.flash-sale__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-6);
  border-radius: var(--ss-radius-xl);
  background: var(--ss-gradient-accent);
  color: var(--ss-color-text-inverse);
  margin-bottom: var(--ss-space-5);
}

.flash-sale__title {
  font-size: var(--ss-font-size-4xl);
}

.flash-sale__desc {
  margin: var(--ss-space-2) 0 0;
  opacity: 0.9;
}

.flash-sale__timer {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.flash-sale__timer .ss-muted-block {
  color: rgba(255, 255, 255, 0.85);
}

.flash-sale__timer strong {
  font-size: var(--ss-font-size-4xl);
  letter-spacing: var(--ss-font-letter-spacing-wide);
}

.flash-sale__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-4);
  margin-bottom: var(--ss-space-3);
}

.flash-sale__head p {
  margin: 2px 0 0;
}

.flash-sale__countdown {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.flash-sale__countdown strong {
  font-size: var(--ss-font-size-xl);
  color: var(--ss-color-danger-600);
}

.flash-sale__products {
  margin-bottom: var(--ss-space-6);
}

.flash-sale__card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.flash-sale__card img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  background: var(--ss-color-bg-subtle);
}

.flash-sale__info {
  padding: var(--ss-space-4);
  gap: var(--ss-space-2);
}

.flash-sale__name {
  font-weight: var(--ss-font-weight-medium);
}

.flash-sale__progress {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
}

.flash-sale__track {
  flex: 1;
  height: 6px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-100);
  overflow: hidden;
}

.flash-sale__fill {
  height: 100%;
  background: var(--ss-color-accent-500);
}

@media (max-width: 767px) {
  .flash-sale__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .flash-sale__timer {
    align-items: flex-start;
  }
}
</style>
