<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import ProductCard from '@/components/ProductCard.vue'
import { listCategories, listProducts } from '@/api/product'
import { useAddToCart } from '@/composables/useAddToCart'
import type { Category, PageMeta, Product } from '@/types'
import { yuanToCents } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const { add } = useAddToCart()

const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 12, total: 0, total_pages: 1 })
const loading = ref(false)
const drawerOpen = ref(false)

const sort = ref(String(route.query.sort ?? 'default'))
const minPrice = ref('')
const maxPrice = ref('')
const onlyInStock = ref(false)
const page = ref(1)

const PAGE_SIZE = 12

const activeCategoryId = computed(() => {
  const raw = route.params.id
  return raw ? Number(raw) : 0
})

const activeCategory = computed(() => {
  for (const category of categories.value) {
    if (category.id === activeCategoryId.value) return category
    const child = category.children?.find((item) => item.id === activeCategoryId.value)
    if (child) return child
  }
  return null
})

const sortOptions = [
  { value: 'default', label: '综合' },
  { value: 'sales', label: '销量' },
  { value: 'price_asc', label: '价格 ↑' },
  { value: 'price_desc', label: '价格 ↓' },
  { value: 'newest', label: '最新' },
]

const hasFilter = computed(
  () => Boolean(minPrice.value || maxPrice.value || onlyInStock.value || sort.value !== 'default'),
)

async function loadProducts(): Promise<void> {
  loading.value = true
  try {
    const result = await listProducts({
      page: page.value,
      page_size: PAGE_SIZE,
      category_id: activeCategoryId.value || undefined,
      sort: sort.value,
      min_price_cents: minPrice.value ? yuanToCents(minPrice.value) : undefined,
      max_price_cents: maxPrice.value ? yuanToCents(maxPrice.value) : undefined,
      only_in_stock: onlyInStock.value || undefined,
    })
    products.value = result.products
    meta.value = result.meta
  } finally {
    loading.value = false
  }
}

async function loadCategories(): Promise<void> {
  const result = await listCategories({ tree: true })
  categories.value = result.categories
}

function selectCategory(id: number): void {
  drawerOpen.value = false
  page.value = 1
  router.push(id ? { name: 'category', params: { id } } : { name: 'category' })
}

function changeSort(value: string): void {
  sort.value = value
  page.value = 1
  loadProducts()
}

function applyFilter(): void {
  page.value = 1
  loadProducts()
}

function resetFilter(): void {
  minPrice.value = ''
  maxPrice.value = ''
  onlyInStock.value = false
  sort.value = 'default'
  page.value = 1
  loadProducts()
}

function changePage(next: number): void {
  page.value = next
  loadProducts()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

watch(
  activeCategoryId,
  () => {
    page.value = 1
    loadProducts()
  },
)

watch(sort, () => {
  page.value = 1
  loadProducts()
})

loadCategories()
loadProducts()
</script>

<template>
  <div class="category ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">{{ activeCategory?.name ?? '全部商品' }}</h1>
        <p class="ss-page-sub">
          {{ activeCategory?.description ?? '精选好物，正品保障' }} ·
          共 {{ meta.total }} 件商品
        </p>
      </div>
      <button type="button" class="ss-btn ss-btn-outline category__drawer-btn" @click="drawerOpen = true">
        分类
      </button>
    </div>

    <div class="category__layout">
      <!-- 左侧分类导航 -->
      <aside class="category__side ss-card">
        <button
          type="button"
          class="category__side-item"
          :class="{ 'category__side-item--active': activeCategoryId === 0 }"
          @click="selectCategory(0)"
        >
          全部商品
        </button>
        <div v-for="category in categories" :key="category.id" class="category__side-group">
          <button
            type="button"
            class="category__side-item"
            :class="{ 'category__side-item--active': activeCategoryId === category.id }"
            @click="selectCategory(category.id)"
          >
            <span>{{ category.icon }} {{ category.name }}</span>
            <span class="ss-muted-block">{{ category.product_count }}</span>
          </button>
          <button
            v-for="child in category.children ?? []"
            :key="child.id"
            type="button"
            class="category__side-child"
            :class="{ 'category__side-child--active': activeCategoryId === child.id }"
            @click="selectCategory(child.id)"
          >
            {{ child.name }}
          </button>
        </div>
      </aside>

      <!-- 右侧商品区 -->
      <section class="category__main">
        <div class="category__toolbar ss-card">
          <div class="category__sorts">
            <button
              v-for="option in sortOptions"
              :key="option.value"
              type="button"
              class="category__sort"
              :class="{ 'category__sort--active': sort === option.value }"
              @click="changeSort(option.value)"
            >
              {{ option.label }}
            </button>
          </div>

          <div class="category__filters">
            <label class="category__price">
              <input v-model="minPrice" class="ss-input" type="number" min="0" placeholder="最低价" />
              <span class="ss-muted-block">—</span>
              <input v-model="maxPrice" class="ss-input" type="number" min="0" placeholder="最高价" />
              <span class="ss-muted-block">元</span>
            </label>
            <label class="category__stock">
              <input v-model="onlyInStock" type="checkbox" @change="applyFilter" />
              <span>仅看有货</span>
            </label>
            <button type="button" class="ss-btn ss-btn-primary ss-btn-sm" @click="applyFilter">
              筛选
            </button>
            <button
              v-if="hasFilter"
              type="button"
              class="ss-btn ss-btn-ghost ss-btn-sm"
              @click="resetFilter"
            >
              重置
            </button>
          </div>
        </div>

        <div v-if="products.length" class="ss-grid ss-grid-3 category__grid">
          <ProductCard
            v-for="product in products"
            :key="product.id"
            :product="product"
            :loading="loading"
            @add="add($event.id)"
          />
        </div>

        <EmptyState
          v-else-if="!loading"
          icon="🔍"
          title="没有找到相关商品"
          description="换个分类或调整筛选条件试试"
          action-text="重置筛选"
          @action="resetFilter"
        />

        <Pagination
          :page="meta.page"
          :page-size="meta.page_size"
          :total="meta.total"
          @change="changePage"
        />
      </section>
    </div>

    <!-- 移动端分类抽屉 -->
    <div v-if="drawerOpen" class="category__drawer" @click.self="drawerOpen = false">
      <div class="category__drawer-panel">
        <div class="ss-row-between">
          <strong>选择分类</strong>
          <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="drawerOpen = false">
            关闭
          </button>
        </div>
        <button
          type="button"
          class="category__side-item"
          :class="{ 'category__side-item--active': activeCategoryId === 0 }"
          @click="selectCategory(0)"
        >
          全部商品
        </button>
        <div v-for="category in categories" :key="category.id">
          <button
            type="button"
            class="category__side-item"
            :class="{ 'category__side-item--active': activeCategoryId === category.id }"
            @click="selectCategory(category.id)"
          >
            <span>{{ category.icon }} {{ category.name }}</span>
          </button>
          <button
            v-for="child in category.children ?? []"
            :key="child.id"
            type="button"
            class="category__side-child"
            :class="{ 'category__side-child--active': activeCategoryId === child.id }"
            @click="selectCategory(child.id)"
          >
            {{ child.name }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.category__layout {
  display: grid;
  grid-template-columns: var(--ss-layout-sidebar-width) minmax(0, 1fr);
  gap: var(--ss-space-5);
  align-items: start;
}

.category__side {
  padding: var(--ss-space-3);
  position: sticky;
  top: calc(var(--ss-size-header-desktop) + var(--ss-space-4));
}

.category__side-group {
  margin-top: var(--ss-space-2);
}

.category__side-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--ss-space-2) var(--ss-space-3);
  border: 0;
  border-radius: var(--ss-radius-sm);
  background: transparent;
  color: var(--ss-color-text-secondary);
  font-size: var(--ss-font-size-md);
  cursor: pointer;
  text-align: left;
}

.category__side-item:hover {
  background: var(--ss-color-neutral-100);
}

.category__side-item--active {
  background: var(--ss-color-brand-50);
  color: var(--ss-color-brand-600);
  font-weight: var(--ss-font-weight-semibold);
}

.category__side-child {
  display: block;
  width: 100%;
  padding: var(--ss-space-2) var(--ss-space-3) var(--ss-space-2) var(--ss-space-6);
  border: 0;
  background: transparent;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
  text-align: left;
  cursor: pointer;
}

.category__side-child:hover {
  color: var(--ss-color-brand-600);
}

.category__side-child--active {
  color: var(--ss-color-brand-600);
  font-weight: var(--ss-font-weight-medium);
}

.category__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-3) var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.category__sorts {
  display: flex;
  gap: var(--ss-space-1);
}

.category__sort {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-3);
  border-radius: var(--ss-radius-sm);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  font-size: var(--ss-font-size-md);
}

.category__sort:hover {
  background: var(--ss-color-neutral-100);
}

.category__sort--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.category__filters {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  flex-wrap: wrap;
}

.category__price {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
}

.category__price .ss-input {
  width: 92px;
  height: 32px;
}

.category__stock {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  font-size: var(--ss-font-size-sm);
  color: var(--ss-color-text-secondary);
}

.category__grid {
  margin-bottom: var(--ss-space-4);
}

.category__drawer-btn {
  display: none;
}

.category__drawer {
  display: none;
}

@media (max-width: 1023px) {
  .category__layout {
    grid-template-columns: 1fr;
  }

  .category__side {
    display: none;
  }

  .category__drawer-btn {
    display: inline-flex;
  }

  .category__drawer {
    display: flex;
    position: fixed;
    inset: 0;
    z-index: var(--ss-z-index-overlay);
    background: var(--ss-color-bg-overlay);
  }

  .category__drawer-panel {
    width: 78%;
    max-width: 320px;
    padding: var(--ss-space-4);
    background: var(--ss-color-bg-card);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--ss-space-1);
  }
}
</style>
