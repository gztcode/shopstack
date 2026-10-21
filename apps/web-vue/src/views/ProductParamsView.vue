<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { getProduct, listProductParams } from '@/api/product'
import type { Product, ProductAttribute } from '@/types'

/**
 * 商品参数
 * 数据来源 GET /api/v1/products/{id}/params。
 */
const route = useRoute()

const product = ref<Product | null>(null)
const params = ref<ProductAttribute[]>([])
const loading = ref(false)

/** 商品 ID：优先取路由参数，其次取查询参数 */
const productId = computed(() => {
  const raw = route.params.id ?? route.query.productId
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : 0
})

async function load(): Promise<void> {
  if (!productId.value) {
    params.value = []
    return
  }
  loading.value = true
  try {
    const [detailRes, paramRes] = await Promise.all([
      getProduct(productId.value),
      listProductParams(productId.value),
    ])
    product.value = detailRes.product
    params.value = paramRes.params
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

watch(productId, load)
onMounted(load)
</script>

<template>
  <div class="product-params ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">商品参数</h1>
        <p class="ss-page-sub">规格、尺寸与配置等详细参数说明</p>
      </div>
      <RouterLink
        v-if="product"
        class="ss-btn ss-btn-outline ss-btn-sm"
        :to="`/product/${product.id}`"
      >
        查看商品
      </RouterLink>
    </div>

    <section v-if="product" class="product-params__product ss-card">
      <strong>{{ product.title }}</strong>
      <p class="ss-muted-block">{{ product.subtitle }}</p>
      <div class="product-params__tags">
        <span v-for="tag in product.tags" :key="tag" class="ss-tag ss-tag-neutral">{{ tag }}</span>
      </div>
    </section>

    <EmptyState
      v-if="!params.length && !loading"
      icon="📐"
      title="暂无参数信息"
      description="该商品还未维护参数，可先查看商品详情或咨询客服"
      action-text="查看商品详情"
      @action="$router.push(product ? `/product/${product.id}` : '/category')"
    />

    <section v-else class="product-params__table ss-card">
      <div
        v-for="item in params"
        :key="item.id"
        class="product-params__row"
      >
        <span class="product-params__label">{{ item.name }}</span>
        <span class="product-params__value">{{ item.value }}</span>
      </div>
    </section>
  </div>
</template>

<style scoped>
.product-params__product {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
}

.product-params__product p {
  margin: 0;
}

.product-params__tags {
  display: flex;
  gap: var(--ss-space-1);
  flex-wrap: wrap;
}

.product-params__table {
  overflow: hidden;
}

.product-params__row {
  display: flex;
  gap: var(--ss-space-4);
  padding: var(--ss-space-3) var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.product-params__row:last-child {
  border-bottom: 0;
}

.product-params__label {
  width: 140px;
  flex: none;
  color: var(--ss-color-text-tertiary);
}

.product-params__value {
  color: var(--ss-color-text-primary);
  word-break: break-all;
}

@media (max-width: 767px) {
  .product-params__row {
    flex-direction: column;
    gap: var(--ss-space-1);
  }

  .product-params__label {
    width: auto;
  }
}
</style>
