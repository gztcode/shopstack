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
const joining = ref(false)
const now = ref(Math.floor(Date.now() / 1000))
const activePromotion = ref<Promotion | null>(null)
const activeProduct = ref<Product | null>(null)
const groupSize = ref(3)
let timer: number | null = null

/** 拼团活动：promotion.type === 4 */
const groupPromotions = computed(() => promotions.value.filter((item) => item.type === 4))

/** 其它进行中的活动（后端暂无拼团种子数据时用于兜底展示） */
const otherPromotions = computed(() => promotions.value.filter((item) => item.type !== 4))

const nearestEnd = computed(() => {
  const ends = groupPromotions.value.map((item) => item.end_time).filter((value) => value > now.value)
  if (!ends.length) return null
  const end = Math.min(...ends)
  return { end, remain: end - now.value, text: formatCountdown(end - now.value) }
})

function productOf(promotion: Promotion): Product | undefined {
  if (promotion.product_id) {
    return products.value.find((item) => item.id === promotion.product_id)
  }
  return products.value[0]
}

/** 成团进度（已参团人数 / 目标人数） */
function joinedCount(promotion: Promotion): number {
  return promotion.sold_count || 0
}

function targetCount(promotion: Promotion): number {
  return promotion.limit_per_user || Math.max(3, joinedCount(promotion))
}

function groupPercent(promotion: Promotion): number {
  const target = targetCount(promotion)
  if (!target) return 0
  return Math.min(100, Math.round((joinedCount(promotion) / target) * 100))
}

function openGroup(promotion: Promotion): void {
  activePromotion.value = promotion
  activeProduct.value = productOf(promotion) ?? null
  groupSize.value = targetCount(promotion)
}

function closeGroup(): void {
  activePromotion.value = null
  activeProduct.value = null
}

async function joinGroup(): Promise<void> {
  const promotion = activePromotion.value
  const product = activeProduct.value
  if (!promotion || !product) {
    app.warning('拼团商品不可用')
    return
  }
  joining.value = true
  try {
    const detail = await getProduct(product.id)
    const sku = detail.skus.find((item) => item.enabled && item.stock > 0)
    if (!sku) {
      app.warning('该商品暂时缺货')
      return
    }
    closeGroup()
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
    joining.value = false
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
  <div class="group-buy ss-container ss-page">
    <section class="group-buy__hero">
      <div>
        <h1 class="group-buy__title">👥 拼团专区</h1>
        <p class="group-buy__desc">和好友一起拼，更低价格拼走爆款</p>
      </div>
      <div class="group-buy__timer">
        <span class="ss-muted-block">距本场结束</span>
        <strong class="ss-num">{{ nearestEnd?.text ?? '00:00:00' }}</strong>
      </div>
    </section>

    <template v-if="!groupPromotions.length && !loading">
      <EmptyState
        icon="👥"
        title="暂无进行中的拼团活动"
        description="开团成功后邀请好友参团即可享受拼团价"
        action-text="去逛逛"
        @action="router.push('/category')"
      />

      <section v-if="otherPromotions.length" class="ss-section">
        <div class="ss-section-title">
          <h2>其它进行中的活动</h2>
          <RouterLink class="ss-text-brand ss-muted-block" to="/flash-sale">限时秒杀 →</RouterLink>
        </div>
        <div class="ss-grid ss-grid-3">
          <div v-for="promotion in otherPromotions" :key="promotion.id" class="ss-card ss-card-pad ss-col">
            <strong>{{ promotion.name }}</strong>
            <span class="ss-muted-block">{{ promotion.description }}</span>
            <RouterLink
              v-if="productOf(promotion)"
              class="ss-btn ss-btn-outline ss-btn-sm ss-btn-block"
              :to="`/product/${productOf(promotion)!.id}`"
            >
              查看活动商品
            </RouterLink>
          </div>
        </div>
      </section>
    </template>

    <div v-else class="group-buy__list">
      <article v-for="promotion in groupPromotions" :key="promotion.id" class="group-buy__card ss-card">
        <RouterLink
          v-if="productOf(promotion)"
          :to="`/product/${productOf(promotion)!.id}`"
          class="group-buy__media"
        >
          <img
            :src="productOf(promotion)!.cover"
            :alt="productOf(promotion)!.title"
            @error="handleImageError"
          />
        </RouterLink>

        <div class="ss-grow ss-col">
          <div class="ss-row-between">
            <strong>{{ promotion.name }}</strong>
            <span class="ss-tag ss-tag-accent">拼团价</span>
          </div>
          <p class="ss-muted-block group-buy__desc-text">{{ promotion.description }}</p>

          <div class="ss-row">
            <PriceText
              :cents="promotion.discount_cents || productOf(promotion)?.min_price_cents || 0"
              :original-cents="productOf(promotion)?.min_price_cents || 0"
              size="lg"
            />
            <span class="ss-muted-block">
              {{ joinedCount(promotion) }} 人已参团 · 需 {{ targetCount(promotion) }} 人成团
            </span>
          </div>

          <div class="group-buy__progress">
            <div class="group-buy__track">
              <div
                class="group-buy__fill"
                :style="{ width: `${groupPercent(promotion)}%` }"
              />
            </div>
            <span class="ss-muted-block">
              还差 {{ Math.max(0, targetCount(promotion) - joinedCount(promotion)) }} 人
            </span>
          </div>

          <div class="ss-row-between group-buy__actions">
            <span class="ss-muted-block">
              剩余时间 {{ formatCountdown(Math.max(0, promotion.end_time - now)) }}
            </span>
            <button type="button" class="ss-btn ss-btn-primary" @click="openGroup(promotion)">
              立即参团
            </button>
          </div>
        </div>
      </article>
    </div>

    <!-- 拼团弹窗 -->
    <Teleport to="body">
      <div v-if="activePromotion" class="group-buy__dialog" @click.self="closeGroup">
        <div class="group-buy__dialog-panel ss-card">
          <div class="ss-row-between">
            <h3>参团详情</h3>
            <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="closeGroup">关闭</button>
          </div>

          <div v-if="activeProduct" class="group-buy__goods">
            <img :src="activeProduct.cover" :alt="activeProduct.title" @error="handleImageError" />
            <div class="ss-col">
              <strong>{{ activeProduct.title }}</strong>
              <PriceText
                :cents="activePromotion.discount_cents || activeProduct.min_price_cents"
                :original-cents="activeProduct.min_price_cents"
                size="md"
              />
            </div>
          </div>

          <div class="group-buy__detail">
            <div class="ss-row-between"><span class="ss-muted-block">团长</span><span>团长已开团，等待好友加入</span></div>
            <div class="ss-row-between"><span class="ss-muted-block">已成团</span><span>{{ joinedCount(activePromotion) }} / {{ groupSize }} 人</span></div>
            <div class="ss-row-between"><span class="ss-muted-block">剩余名额</span><span>{{ Math.max(0, groupSize - joinedCount(activePromotion)) }} 人</span></div>
            <div class="ss-row-between"><span class="ss-muted-block">剩余时间</span><span>{{ formatCountdown(Math.max(0, activePromotion.end_time - now)) }}</span></div>
            <div class="ss-row-between"><span class="ss-muted-block">每人限购</span><span>{{ activePromotion.limit_per_user || 1 }} 件</span></div>
          </div>

          <p class="ss-muted-block group-buy__tip">
            成团人数 {{ formatNumber(joinedCount(activePromotion)) }} 人，下单后邀请好友参团即可成团享拼团价。
          </p>

          <div class="ss-row-between">
            <span />
            <div class="ss-row">
              <button type="button" class="ss-btn ss-btn-ghost" @click="closeGroup">再看看</button>
              <button type="button" class="ss-btn ss-btn-primary" :disabled="joining" @click="joinGroup">
                {{ joining ? '处理中…' : '去拼团' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.group-buy__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-6);
  border-radius: var(--ss-radius-xl);
  background: var(--ss-gradient-brand);
  color: var(--ss-color-text-inverse);
  margin-bottom: var(--ss-space-5);
}

.group-buy__title {
  font-size: var(--ss-font-size-4xl);
}

.group-buy__desc {
  margin: var(--ss-space-2) 0 0;
  opacity: 0.9;
}

.group-buy__timer {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.group-buy__timer .ss-muted-block {
  color: rgba(255, 255, 255, 0.85);
}

.group-buy__timer strong {
  font-size: var(--ss-font-size-4xl);
  letter-spacing: var(--ss-font-letter-spacing-wide);
}

.group-buy__list {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-4);
}

.group-buy__card {
  display: flex;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
}

.group-buy__media img {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.group-buy__desc-text {
  margin: 0;
}

.group-buy__progress {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
}

.group-buy__track {
  flex: 1;
  max-width: 320px;
  height: 8px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-100);
  overflow: hidden;
}

.group-buy__fill {
  height: 100%;
  background: var(--ss-gradient-brand);
}

.group-buy__actions {
  margin-top: var(--ss-space-1);
}

.group-buy__dialog {
  position: fixed;
  inset: 0;
  z-index: var(--ss-z-index-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ss-space-4);
  background: var(--ss-color-bg-overlay);
}

.group-buy__dialog-panel {
  width: min(520px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: var(--ss-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
  box-shadow: var(--ss-shadow-xl);
}

.group-buy__goods {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.group-buy__goods img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
}

.group-buy__detail {
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  font-size: var(--ss-font-size-md);
}

.group-buy__detail .ss-row-between {
  padding: var(--ss-space-1) 0;
}

.group-buy__tip {
  margin: 0;
  line-height: var(--ss-font-line-height-relaxed);
}

@media (max-width: 767px) {
  .group-buy__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .group-buy__timer {
    align-items: flex-start;
  }

  .group-buy__card {
    flex-direction: column;
  }

  .group-buy__media img {
    width: 100%;
    height: 180px;
  }
}
</style>
