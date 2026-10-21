<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import PriceText from '@/components/PriceText.vue'
import { useAppStore } from '@/stores/app'
import { useHistoryStore } from '@/stores/history'
import { formatDateTime } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const router = useRouter()
const app = useAppStore()
const history = useHistoryStore()

const items = computed(() => history.items)

function remove(productId: number): void {
  history.remove(productId)
  app.success('已删除该浏览记录')
}

function clear(): void {
  history.clear()
  app.success('已清空浏览足迹')
}
</script>

<template>
  <div class="history ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">浏览足迹</h1>
        <p class="ss-page-sub">记录最近浏览过的商品，数据保存在本地浏览器</p>
      </div>
      <button v-if="items.length" type="button" class="ss-btn ss-btn-danger ss-btn-sm" @click="clear">
        清空足迹
      </button>
    </div>

    <EmptyState
      v-if="!items.length"
      icon="🕘"
      title="还没有浏览记录"
      description="浏览商品详情后会自动记录，方便你快速找回"
      action-text="去逛逛"
      @action="router.push('/category')"
    />

    <div v-else class="history__list">
      <article v-for="item in items" :key="item.product_id" class="history__item ss-card">
        <RouterLink :to="`/product/${item.product_id}`" class="history__media">
          <img :src="item.cover" :alt="item.title" @error="handleImageError" />
        </RouterLink>
        <div class="ss-grow ss-col">
          <RouterLink :to="`/product/${item.product_id}`" class="history__title ss-ellipsis">
            {{ item.title }}
          </RouterLink>
          <span class="ss-muted-block">浏览于 {{ formatDateTime(item.viewed_at) }}</span>
          <PriceText :cents="item.price_cents" size="sm" />
        </div>
        <div class="history__actions">
          <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" :to="`/product/${item.product_id}`">
            再看看
          </RouterLink>
          <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="remove(item.product_id)">
            删除
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.history__list {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
}

.history__item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-3) var(--ss-space-4);
}

.history__media img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.history__title {
  font-weight: var(--ss-font-weight-medium);
}

.history__title:hover {
  color: var(--ss-color-brand-600);
}

.history__actions {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
}

@media (max-width: 767px) {
  .history__item {
    flex-wrap: wrap;
  }

  .history__actions {
    flex-direction: row;
    width: 100%;
  }
}
</style>
