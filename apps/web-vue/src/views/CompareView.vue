<script setup lang="ts">
import { computed, type StyleValue } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import PriceText from '@/components/PriceText.vue'
import { useAppStore } from '@/stores/app'
import { useCompareStore } from '@/stores/compare'
import { formatCount, formatNumber } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const router = useRouter()
const app = useAppStore()
const compare = useCompareStore()

const items = computed(() => compare.items)

/** 对比列数随选中商品数量变化 */
const tableStyle = computed(
  () => ({ '--compare-cols': String(items.value.length) }) as unknown as StyleValue,
)

/** 对比表的所有规格维度 */
const specKeys = computed(() => {
  const keys: string[] = []
  items.value.forEach((item) => {
    Object.keys(item.specs ?? {}).forEach((key) => {
      if (!keys.includes(key)) keys.push(key)
    })
  })
  return keys
})

function remove(productId: number): void {
  compare.remove(productId)
  app.success('已移出对比')
}

function clear(): void {
  compare.clear()
  app.success('已清空对比列表')
}
</script>

<template>
  <div class="compare ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">商品对比</h1>
        <p class="ss-page-sub">最多可同时对比 4 个商品，数据保存在本地浏览器</p>
      </div>
      <div class="ss-row">
        <RouterLink class="ss-btn ss-btn-primary" to="/categories">+ 添加商品</RouterLink>
        <button
          v-if="items.length"
          type="button"
          class="ss-btn ss-btn-danger ss-btn-sm"
          @click="clear"
        >
          清空对比
        </button>
      </div>
    </div>

    <EmptyState
      v-if="!items.length"
      icon="⚖️"
      title="对比列表是空的"
      description="在商品详情页点击「加入对比」，即可并排比较多个商品"
      action-text="去挑选商品"
      @action="router.push('/categories')"
    />

    <div v-else class="compare__table ss-card" :style="tableStyle">
      <div class="compare__row compare__row--head">
        <div class="compare__label">商品</div>
        <div v-for="item in items" :key="item.product_id" class="compare__cell">
          <button
            type="button"
            class="compare__remove"
            aria-label="移出对比"
            @click="remove(item.product_id)"
          >
            ✕
          </button>
          <RouterLink :to="`/product/${item.product_id}`">
            <img :src="item.cover" :alt="item.title" @error="handleImageError" />
          </RouterLink>
          <RouterLink :to="`/product/${item.product_id}`" class="compare__title ss-clamp-2">
            {{ item.title }}
          </RouterLink>
        </div>
      </div>

      <div class="compare__row">
        <div class="compare__label">价格</div>
        <div v-for="item in items" :key="item.product_id" class="compare__cell">
          <PriceText :cents="item.price_cents" :original-cents="item.original_price_cents" size="sm" />
        </div>
      </div>

      <div class="compare__row">
        <div class="compare__label">规格</div>
        <div v-for="item in items" :key="item.product_id" class="compare__cell">
          {{ item.spec_text || '默认规格' }}
        </div>
      </div>

      <div v-for="key in specKeys" :key="key" class="compare__row">
        <div class="compare__label">{{ key }}</div>
        <div v-for="item in items" :key="item.product_id" class="compare__cell">
          {{ item.specs?.[key] ?? '—' }}
        </div>
      </div>

      <div class="compare__row">
        <div class="compare__label">库存</div>
        <div v-for="item in items" :key="item.product_id" class="compare__cell">
          <span :class="{ 'ss-text-danger': item.stock <= 0 }">
            {{ item.stock > 0 ? formatNumber(item.stock) : '无货' }}
          </span>
        </div>
      </div>

      <div class="compare__row">
        <div class="compare__label">销量</div>
        <div v-for="item in items" :key="item.product_id" class="compare__cell">
          {{ formatCount(item.sales_count) }}
        </div>
      </div>

      <div class="compare__row">
        <div class="compare__label">操作</div>
        <div v-for="item in items" :key="item.product_id" class="compare__cell">
          <RouterLink class="ss-btn ss-btn-primary ss-btn-sm" :to="`/product/${item.product_id}`">
            查看详情
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.compare__table {
  overflow-x: auto;
}

.compare__row {
  display: grid;
  grid-template-columns: 120px repeat(var(--compare-cols, 4), minmax(180px, 1fr));
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.compare__row:last-child {
  border-bottom: 0;
}

.compare__label {
  padding: var(--ss-space-3);
  background: var(--ss-color-bg-subtle);
  color: var(--ss-color-text-secondary);
  font-size: var(--ss-font-size-sm);
  font-weight: var(--ss-font-weight-medium);
}

.compare__cell {
  position: relative;
  padding: var(--ss-space-3);
  font-size: var(--ss-font-size-md);
}

.compare__row--head .compare__cell {
  text-align: center;
}

.compare__row--head img {
  width: 120px;
  height: 120px;
  margin: 0 auto var(--ss-space-2);
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.compare__title {
  font-weight: var(--ss-font-weight-medium);
  font-size: var(--ss-font-size-sm);
}

.compare__remove {
  position: absolute;
  top: var(--ss-space-2);
  right: var(--ss-space-2);
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-neutral-100);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  line-height: 1;
}

.compare__remove:hover {
  background: var(--ss-color-danger-50);
  color: var(--ss-color-danger-600);
}
</style>
