<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import PriceText from '@/components/PriceText.vue'
import type { Product } from '@/types'
import { formatCount, formatYuan } from '@/utils/format'
import { handleImageError } from '@/utils/image'

/** 商品卡片 */
const props = withDefaults(
  defineProps<{
    product: Product
    showAdd?: boolean
    loading?: boolean
  }>(),
  {
    showAdd: true,
    loading: false,
  },
)

const emit = defineEmits<{
  add: [product: Product]
}>()

const router = useRouter()

const hasDiscount = computed(() => props.product.max_price_cents > props.product.min_price_cents)
const soldOut = computed(() => props.product.stock_total <= 0)

function openDetail(): void {
  router.push({ name: 'product', params: { id: props.product.id } })
}
</script>

<template>
  <article class="product-card ss-card ss-card-hover">
    <div class="product-card__media" @click="openDetail">
      <img
        :src="props.product.cover"
        :alt="props.product.title"
        loading="lazy"
        @error="handleImageError"
      />
      <span v-if="soldOut" class="product-card__soldout">已售罄</span>
      <span v-else-if="hasDiscount" class="product-card__discount">
        省 {{ formatYuan(props.product.max_price_cents - props.product.min_price_cents) }}
      </span>
    </div>

    <div class="product-card__body">
      <h3 class="product-card__title ss-ellipsis" :title="props.product.title" @click="openDetail">
        {{ props.product.title }}
      </h3>
      <p class="product-card__subtitle ss-ellipsis">{{ props.product.subtitle }}</p>

      <div class="product-card__tags">
        <span v-for="tag in props.product.tags.slice(0, 2)" :key="tag" class="ss-tag ss-tag-neutral">
          {{ tag }}
        </span>
      </div>

      <div class="product-card__footer">
        <div class="ss-col">
          <PriceText :cents="props.product.min_price_cents" size="md" />
          <span class="ss-muted-block">已售 {{ formatCount(props.product.sales_count) }}</span>
        </div>
        <button
          v-if="props.showAdd"
          type="button"
          class="ss-btn ss-btn-primary ss-btn-sm"
          :disabled="soldOut || props.loading"
          @click.stop="emit('add', props.product)"
        >
          加入购物车
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.product-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.product-card__media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--ss-color-bg-subtle);
  cursor: pointer;
}

.product-card__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-card__discount,
.product-card__soldout {
  position: absolute;
  top: var(--ss-space-2);
  left: var(--ss-space-2);
  padding: 2px var(--ss-space-2);
  border-radius: var(--ss-radius-xs);
  background: var(--ss-color-danger-500);
  color: var(--ss-color-text-inverse);
  font-size: var(--ss-font-size-xs);
}

.product-card__soldout {
  background: var(--ss-color-neutral-700);
}

.product-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
  flex: 1;
}

.product-card__title {
  font-size: var(--ss-font-size-md);
  cursor: pointer;
}

.product-card__title:hover {
  color: var(--ss-color-brand-600);
}

.product-card__subtitle {
  margin: 0;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
}

.product-card__tags {
  display: flex;
  gap: var(--ss-space-1);
  flex-wrap: wrap;
}

.product-card__footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--ss-space-2);
  margin-top: auto;
  padding-top: var(--ss-space-2);
}

@media (max-width: 767px) {
  .product-card__footer {
    flex-direction: column;
    align-items: stretch;
  }

  .product-card__footer .ss-btn {
    width: 100%;
  }
}
</style>
