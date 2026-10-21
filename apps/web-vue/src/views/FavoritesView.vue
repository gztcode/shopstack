<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { formatDateTime, formatYuan } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const router = useRouter()
const app = useAppStore()
const userStore = useUserStore()

async function remove(productId: number): Promise<void> {
  try {
    await userStore.toggleFavorite(productId)
    app.success('已取消收藏')
  } catch {
    // 错误提示已由接口层处理
  }
}

onMounted(() => {
  userStore.loadFavorites()
})
</script>

<template>
  <div class="favorites ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">我的收藏</h1>
        <p class="ss-page-sub">共收藏 {{ userStore.favorites.length }} 件商品</p>
      </div>
    </div>

    <EmptyState
      v-if="!userStore.favorites.length"
      icon="💖"
      title="还没有收藏商品"
      description="在商品详情页点击收藏，方便下次找到"
      action-text="去逛逛"
      @action="router.push('/category')"
    />

    <div v-else class="favorites__grid">
      <section v-for="item in userStore.favorites" :key="item.id" class="favorites__card ss-card">
        <RouterLink :to="`/product/${item.product_id}`">
          <img :src="item.cover" :alt="item.title" @error="handleImageError" />
        </RouterLink>
        <div class="ss-grow ss-col">
          <RouterLink :to="`/product/${item.product_id}`" class="favorites__title ss-ellipsis">
            {{ item.title }}
          </RouterLink>
          <span class="ss-muted-block">收藏于 {{ formatDateTime(item.created_at) }}</span>
          <div class="ss-row-between">
            <strong class="ss-num ss-text-danger">{{ formatYuan(item.price_cents) }}</strong>
            <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="remove(item.product_id)">
              取消收藏
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.favorites__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ss-space-4);
}

.favorites__card {
  display: flex;
  gap: var(--ss-space-4);
  padding: var(--ss-space-4);
}

.favorites__card img {
  width: 120px;
  height: 120px;
  object-fit: cover;
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.favorites__title {
  font-weight: var(--ss-font-weight-medium);
}

@media (max-width: 767px) {
  .favorites__grid {
    grid-template-columns: 1fr;
  }
}
</style>
