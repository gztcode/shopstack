<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import ProductCard from '@/components/ProductCard.vue'
import { listCategories, listProducts } from '@/api/product'
import { useAddToCart } from '@/composables/useAddToCart'
import type { Category, PageMeta, Product } from '@/types'

const { add } = useAddToCart()

const categories = ref<Category[]>([])
const products = ref<Product[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 12, total: 0, total_pages: 1 })
const activeId = ref(0)
const loading = ref(false)
const drawerOpen = ref(false)

const PAGE_SIZE = 12

/** 展平分类树，用于左右导航 */
const flatCategories = computed(() => {
  const result: { category: Category; level: number }[] = []
  const walk = (list: Category[], level: number) => {
    list.forEach((category) => {
      result.push({ category, level })
      if (category.children?.length) walk(category.children, level + 1)
    })
  }
  walk(categories.value, 0)
  return result
})

const activeCategory = computed(
  () => flatCategories.value.find((item) => item.category.id === activeId.value)?.category ?? null,
)

async function loadProducts(): Promise<void> {
  loading.value = true
  try {
    const result = await listProducts({
      page: meta.value.page,
      page_size: PAGE_SIZE,
      category_id: activeId.value || undefined,
    })
    products.value = result.products
    meta.value = result.meta
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

async function loadCategories(): Promise<void> {
  try {
    const result = await listCategories({ tree: true })
    categories.value = result.categories
  } catch {
    // 错误提示已由接口层处理
  }
}

function selectCategory(id: number): void {
  activeId.value = id
  drawerOpen.value = false
  meta.value = { ...meta.value, page: 1 }
  loadProducts()
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  loadProducts()
}

watch(activeId, () => {
  meta.value = { ...meta.value, page: 1 }
  loadProducts()
})

onMounted(() => {
  loadCategories()
  loadProducts()
})
</script>

<template>
  <div class="categories ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">全部分类</h1>
        <p class="ss-page-sub">{{ activeCategory?.description ?? '按分类浏览全部商品' }}</p>
      </div>
      <button
        type="button"
        class="ss-btn ss-btn-outline categories__drawer-btn"
        @click="drawerOpen = true"
      >
        分类导航
      </button>
    </div>

    <div class="categories__layout">
      <aside class="categories__side ss-card">
        <button
          type="button"
          class="categories__item"
          :class="{ 'categories__item--active': activeId === 0 }"
          @click="selectCategory(0)"
        >
          <span>🛍️ 全部商品</span>
          <span class="ss-muted-block">
            {{ categories.reduce((sum, item) => sum + (item.product_count ?? 0), 0) }}
          </span>
        </button>
        <button
          v-for="entry in flatCategories"
          :key="entry.category.id"
          type="button"
          class="categories__item"
          :class="[
            { 'categories__item--active': activeId === entry.category.id },
            `categories__item--level-${entry.level}`,
          ]"
          @click="selectCategory(entry.category.id)"
        >
          <span>{{ entry.level === 0 ? entry.category.icon : '·' }} {{ entry.category.name }}</span>
          <span class="ss-muted-block">{{ entry.category.product_count }}</span>
        </button>
      </aside>

      <section class="categories__main">
        <div class="categories__bar ss-card ss-card-pad">
          <div class="ss-row">
            <strong>{{ activeCategory?.name ?? '全部商品' }}</strong>
            <span class="ss-muted-block">共 {{ meta.total }} 件</span>
          </div>
          <RouterLink class="ss-btn ss-btn-ghost ss-btn-sm" to="/category">进入分类筛选页 →</RouterLink>
        </div>

        <EmptyState
          v-if="!products.length && !loading"
          icon="📦"
          title="该分类下暂无商品"
          description="换个分类看看吧"
        />

        <div v-else class="ss-grid ss-grid-3">
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
      </section>
    </div>

    <!-- 移动端分类抽屉 -->
    <div v-if="drawerOpen" class="categories__drawer" @click.self="drawerOpen = false">
      <div class="categories__drawer-panel">
        <div class="ss-row-between">
          <strong>选择分类</strong>
          <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="drawerOpen = false">
            关闭
          </button>
        </div>
        <button
          type="button"
          class="categories__item"
          :class="{ 'categories__item--active': activeId === 0 }"
          @click="selectCategory(0)"
        >
          <span>🛍️ 全部商品</span>
        </button>
        <button
          v-for="entry in flatCategories"
          :key="entry.category.id"
          type="button"
          class="categories__item"
          :class="[
            { 'categories__item--active': activeId === entry.category.id },
            `categories__item--level-${entry.level}`,
          ]"
          @click="selectCategory(entry.category.id)"
        >
          <span>{{ entry.category.name }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.categories__layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: var(--ss-space-5);
  align-items: start;
}

.categories__side {
  padding: var(--ss-space-3);
  position: sticky;
  top: calc(var(--ss-size-header-desktop) + var(--ss-space-4));
  max-height: 70vh;
  overflow-y: auto;
}

.categories__item {
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

.categories__item:hover {
  background: var(--ss-color-neutral-100);
}

.categories__item--active {
  background: var(--ss-color-brand-50);
  color: var(--ss-color-brand-600);
  font-weight: var(--ss-font-weight-semibold);
}

.categories__item--level-1 {
  padding-left: var(--ss-space-5);
  font-size: var(--ss-font-size-sm);
}

.categories__item--level-2 {
  padding-left: var(--ss-space-7);
  font-size: var(--ss-font-size-sm);
}

.categories__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-3);
  margin-bottom: var(--ss-space-4);
}

.categories__drawer-btn {
  display: none;
}

.categories__drawer {
  display: none;
}

@media (max-width: 1023px) {
  .categories__layout {
    grid-template-columns: 1fr;
  }

  .categories__side {
    display: none;
  }

  .categories__drawer-btn {
    display: inline-flex;
  }

  .categories__drawer {
    display: flex;
    position: fixed;
    inset: 0;
    z-index: var(--ss-z-index-overlay);
    background: var(--ss-color-bg-overlay);
  }

  .categories__drawer-panel {
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
