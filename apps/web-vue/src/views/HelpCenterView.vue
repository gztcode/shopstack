<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { listHelpArticles } from '@/api/user'
import type { HelpArticle, PageMeta } from '@/types'

/**
 * 帮助中心
 * 数据来源 GET /api/v1/help/articles，支持按分类与关键词筛选。
 */
const CATEGORIES = [
  { value: 0, label: '全部' },
  { value: 1, label: '下单支付' },
  { value: 2, label: '物流配送' },
  { value: 3, label: '售后服务' },
  { value: 4, label: '会员权益' },
]

const router = useRouter()

const articles = ref<HelpArticle[]>([])
const meta = ref<PageMeta>({ page: 1, page_size: 10, total: 0, total_pages: 1 })
const activeCategory = ref(0)
const keyword = ref('')
const loading = ref(false)

const PAGE_SIZE = 10

/** 分类下拉选项（从已加载文章中去重） */
const categoryOptions = computed(() => {
  const map = new Map<number, string>()
  articles.value.forEach((item) => {
    if (!map.has(item.category_id)) map.set(item.category_id, item.category_name)
  })
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listHelpArticles({
      page: meta.value.page,
      page_size: PAGE_SIZE,
      keyword: keyword.value.trim() || undefined,
      category_id: activeCategory.value || undefined,
    })
    articles.value = result.articles
    meta.value = result.meta
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function changeCategory(value: number): void {
  activeCategory.value = value
  meta.value = { ...meta.value, page: 1 }
  load()
}

function search(): void {
  meta.value = { ...meta.value, page: 1 }
  load()
}

function changePage(page: number): void {
  meta.value = { ...meta.value, page }
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(load)
</script>

<template>
  <div class="help-center ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">帮助中心</h1>
        <p class="ss-page-sub">下单、支付、配送与售后的常见问题解答</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/feedback">意见反馈</RouterLink>
    </div>

    <form class="help-center__search ss-card" @submit.prevent="search">
      <input
        v-model="keyword"
        class="ss-input"
        type="search"
        placeholder="搜索帮助文章，例如「退款」「运费」"
        aria-label="搜索帮助文章"
      />
      <button type="submit" class="ss-btn ss-btn-primary" :disabled="loading">搜索</button>
    </form>

    <div class="help-center__tabs ss-card">
      <button
        v-for="item in CATEGORIES"
        :key="item.value"
        type="button"
        class="help-center__tab"
        :class="{ 'help-center__tab--active': activeCategory === item.value }"
        @click="changeCategory(item.value)"
      >
        {{ item.label }}
      </button>
    </div>

    <EmptyState
      v-if="!articles.length && !loading"
      icon="📚"
      title="没有找到相关帮助"
      description="换个关键词或分类试试，也可以直接给我们提交反馈"
      action-text="提交反馈"
      @action="router.push('/feedback')"
    />

    <section v-else class="help-center__list ss-card">
      <RouterLink
        v-for="article in articles"
        :key="article.id"
        class="help-center__item"
        :to="`/help-article/${article.id}`"
      >
        <div class="ss-col ss-grow">
          <strong>{{ article.title }}</strong>
          <span class="ss-muted-block ss-clamp-2">{{ article.content }}</span>
          <span class="help-center__meta">
            <span class="ss-tag ss-tag-neutral">{{ article.category_name }}</span>
            <span class="ss-muted-block">{{ article.view_count }} 次阅读</span>
          </span>
        </div>
        <span class="help-center__arrow">→</span>
      </RouterLink>
    </section>

    <Pagination
      :page="meta.page"
      :page-size="meta.page_size"
      :total="meta.total"
      @change="changePage"
    />

    <section v-if="categoryOptions.length" class="ss-section">
      <div class="ss-section-title">
        <h2>热门分类</h2>
      </div>
      <div class="help-center__categories">
        <button
          v-for="item in categoryOptions"
          :key="item.id"
          type="button"
          class="ss-btn ss-btn-outline ss-btn-sm"
          @click="changeCategory(item.id)"
        >
          {{ item.name }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.help-center__search {
  display: flex;
  gap: var(--ss-space-2);
  padding: var(--ss-space-3) var(--ss-space-4);
  margin-bottom: var(--ss-space-3);
}

.help-center__search .ss-input {
  flex: 1;
}

.help-center__tabs {
  display: flex;
  gap: var(--ss-space-1);
  padding: var(--ss-space-2);
  margin-bottom: var(--ss-space-4);
  overflow-x: auto;
}

.help-center__tab {
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  color: var(--ss-color-text-secondary);
  cursor: pointer;
  white-space: nowrap;
}

.help-center__tab--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-medium);
}

.help-center__list {
  overflow: hidden;
}

.help-center__item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.help-center__item:last-child {
  border-bottom: 0;
}

.help-center__item:hover strong {
  color: var(--ss-color-brand-600);
}

.help-center__meta {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  margin-top: var(--ss-space-1);
}

.help-center__arrow {
  color: var(--ss-color-text-quaternary);
  flex: none;
}

.help-center__categories {
  display: flex;
  gap: var(--ss-space-2);
  flex-wrap: wrap;
}
</style>
