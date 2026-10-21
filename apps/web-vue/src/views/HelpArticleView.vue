<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { getHelpArticle, listHelpArticles } from '@/api/user'
import type { HelpArticle } from '@/types'
import { formatDateTime } from '@/utils/format'

/**
 * 帮助文章
 * 数据来源 GET /api/v1/help/articles/{id}，底部提供同分类相关文章。
 */
const route = useRoute()
const router = useRouter()

const article = ref<HelpArticle | null>(null)
const related = ref<HelpArticle[]>([])
const loading = ref(false)

const articleId = computed(() => {
  const raw = route.params.id ?? route.query.id
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : 0
})

async function load(): Promise<void> {
  if (!articleId.value) {
    article.value = null
    return
  }
  loading.value = true
  try {
    article.value = await getHelpArticle(articleId.value)
    const listRes = await listHelpArticles({ category_id: article.value.category_id, page_size: 6 })
    related.value = listRes.articles.filter((item) => item.id !== article.value?.id).slice(0, 5)
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

watch(articleId, load)
onMounted(load)
</script>

<template>
  <div class="help-article ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">帮助文章</h1>
        <p class="ss-page-sub">{{ article?.category_name || '帮助中心' }}</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/help-center">返回帮助中心</RouterLink>
    </div>

    <EmptyState
      v-if="!article && !loading"
      icon="📄"
      title="文章不存在"
      description="该帮助文章可能已下线，去帮助中心看看其它内容"
      action-text="返回帮助中心"
      @action="router.push('/help-center')"
    />

    <template v-else-if="article">
      <article class="help-article__content ss-card">
        <header class="help-article__head">
          <span class="ss-tag ss-tag-accent">{{ article.category_name }}</span>
          <h2 class="help-article__title">{{ article.title }}</h2>
          <div class="help-article__meta">
            <span class="ss-muted-block">更新于 {{ formatDateTime(article.created_at) }}</span>
            <span class="ss-muted-block">{{ article.view_count }} 次阅读</span>
          </div>
        </header>
        <p class="help-article__text">{{ article.content }}</p>
      </article>

      <section v-if="related.length" class="ss-section">
        <div class="ss-section-title">
          <h2>相关问题</h2>
        </div>
        <div class="help-article__related ss-card">
          <RouterLink
            v-for="item in related"
            :key="item.id"
            class="help-article__related-item"
            :to="`/help-article/${item.id}`"
          >
            <span class="ss-grow">{{ item.title }}</span>
            <span class="ss-muted-block">{{ item.view_count }} 次阅读</span>
          </RouterLink>
        </div>
      </section>

      <section class="ss-section">
        <div class="help-article__contact ss-card">
          <div class="ss-col">
            <strong>没有解决你的问题？</strong>
            <span class="ss-muted-block">提交反馈，客服会尽快为你解答</span>
          </div>
          <RouterLink class="ss-btn ss-btn-primary" to="/feedback">提交反馈</RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.help-article__content {
  padding: var(--ss-space-6);
  max-width: 860px;
}

.help-article__head {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  align-items: flex-start;
  padding-bottom: var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
  margin-bottom: var(--ss-space-4);
}

.help-article__title {
  font-size: var(--ss-font-size-2xl);
}

.help-article__meta {
  display: flex;
  gap: var(--ss-space-4);
  font-size: var(--ss-font-size-sm);
  flex-wrap: wrap;
}

.help-article__text {
  margin: 0;
  line-height: var(--ss-font-line-height-relaxed);
  white-space: pre-line;
}

.help-article__related {
  overflow: hidden;
}

.help-article__related-item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
  font-size: var(--ss-font-size-sm);
}

.help-article__related-item:last-child {
  border-bottom: 0;
}

.help-article__related-item:hover {
  color: var(--ss-color-brand-600);
}

.help-article__contact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
  flex-wrap: wrap;
}
</style>
