<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import ProductCard from '@/components/ProductCard.vue'
import { listProducts } from '@/api/product'
import { useAddToCart } from '@/composables/useAddToCart'
import type { PageMeta, Product } from '@/types'

const route = useRoute()
const router = useRouter()
const { add } = useAddToCart()

const products = ref<Product[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 12, total: 0, total_pages: 1 })
const loading = ref(false)
const keyword = ref(String(route.query.q ?? ''))
const input = ref(String(route.query.q ?? ''))

const PAGE_SIZE = 12

const hasResult = computed(() => products.value.length > 0)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listProducts({
      page: meta.value.page,
      page_size: PAGE_SIZE,
      keyword: keyword.value || undefined,
    })
    products.value = result.products
    meta.value = result.meta
  } finally {
    loading.value = false
  }
}

function search(): void {
  const value = input.value.trim()
  keyword.value = value
  meta.value = { ...meta.value, page: 1 }
  router.replace({ name: 'search', query: value ? { q: value } : {} })
  load()
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(
  () => route.query.q,
  (value) => {
    const next = String(value ?? '')
    if (next !== keyword.value) {
      keyword.value = next
      input.value = next
      meta.value = { ...meta.value, page: 1 }
      load()
    }
  },
)

load()
</script>

<template>
  <div class="search ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">搜索结果</h1>
        <p class="ss-page-sub">
          关键词「{{ keyword || '全部' }}」共找到 {{ meta.total }} 件商品
        </p>
      </div>
      <form class="search__bar" @submit.prevent="search">
        <input v-model="input" class="ss-input" type="search" placeholder="输入关键词搜索" />
        <button type="submit" class="ss-btn ss-btn-primary">搜索</button>
      </form>
    </div>

    <EmptyState
      v-if="!hasResult && !loading"
      icon="🔍"
      title="没有找到相关商品"
      description="换个关键词试试，或浏览全部商品"
      action-text="浏览全部商品"
      @action="router.push('/category')"
    />

    <template v-else>
      <div class="ss-grid ss-grid-4">
        <ProductCard
          v-for="product in products"
          :key="product.id"
          :product="product"
          :loading="loading"
          @add="add($event.id)"
        />
      </div>
      <Pagination
        :page="meta.page"
        :page-size="meta.page_size"
        :total="meta.total"
        @change="changePage"
      />
    </template>
  </div>
</template>

<style scoped>
.search__bar {
  display: flex;
  gap: var(--ss-space-2);
}

.search__bar .ss-input {
  width: 240px;
}
</style>
