<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import EmptyState from '@/components/EmptyState.vue'
import { listChannels } from '@/api/product'
import type { Channel } from '@/types'
import { handleImageError } from '@/utils/image'

/**
 * 频道首页
 * 汇总全部频道入口，数据来源 GET /api/v1/channels。
 */

/** 频道类型 → 站内路由名 */
const CHANNEL_ROUTES: Record<number, string> = {
  1: 'channel-recommend',
  2: 'channel-newest',
  3: 'channel-hot',
  4: 'channel-flash',
  5: 'channel-presale',
  6: 'channel-clearance',
  7: 'channel-freeship',
  8: 'channel-cross',
  9: 'channel-fresh',
}

const channels = ref<Channel[]>([])
const loading = ref(false)

/** 有对应独立路由的频道 */
const routableChannels = computed(() =>
  channels.value.filter((channel) => CHANNEL_ROUTES[channel.type]),
)

/** 其它频道（楼层等）统一进入分类页浏览 */
const otherChannels = computed(() =>
  channels.value.filter((channel) => !CHANNEL_ROUTES[channel.type]),
)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listChannels({ page_size: 50 })
    channels.value = result.channels
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="channel-hub ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">频道首页</h1>
        <p class="ss-page-sub">按场景挑选频道，快速找到心仪好物</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/category">全部分类</RouterLink>
    </div>

    <EmptyState
      v-if="!channels.length && !loading"
      icon="🧭"
      title="频道正在搭建中"
      description="先从商品分类里逛逛，频道上线后会第一时间通知你"
      action-text="去逛逛"
      @action="$router.push('/category')"
    />

    <section v-else class="ss-section">
      <div class="ss-section-title">
        <h2>精选频道</h2>
      </div>
      <div class="ss-grid ss-grid-3">
        <RouterLink
          v-for="channel in routableChannels"
          :key="channel.id"
          class="channel-hub__card ss-card ss-card-hover"
          :to="{ name: CHANNEL_ROUTES[channel.type] }"
        >
          <div class="channel-hub__media">
            <img v-if="channel.banner_url" :src="channel.banner_url" :alt="channel.name" @error="handleImageError" />
            <span v-else class="channel-hub__icon">{{ channel.icon || '🛍️' }}</span>
          </div>
          <div class="channel-hub__body">
            <strong>{{ channel.name }}</strong>
            <p class="ss-muted-block">{{ channel.description }}</p>
            <span class="ss-tag ss-tag-accent">{{ channel.product_count }} 件商品</span>
          </div>
        </RouterLink>
      </div>
    </section>

    <section v-if="otherChannels.length" class="ss-section">
      <div class="ss-section-title">
        <h2>更多频道</h2>
      </div>
      <div class="channel-hub__more ss-card">
        <RouterLink
          v-for="channel in otherChannels"
          :key="channel.id"
          class="channel-hub__more-item"
          to="/category"
        >
          <span class="channel-hub__icon">{{ channel.icon || '🛍️' }}</span>
          <span class="ss-col">
            <strong>{{ channel.name }}</strong>
            <span class="ss-muted-block">{{ channel.description }}</span>
          </span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.channel-hub__card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.channel-hub__media {
  aspect-ratio: 3 / 1;
  background: var(--ss-color-bg-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
}

.channel-hub__media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.channel-hub__icon {
  font-size: 40px;
}

.channel-hub__body {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
  align-items: flex-start;
}

.channel-hub__body p {
  margin: 0;
  min-height: 40px;
}

.channel-hub__more {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: var(--ss-space-3);
  padding: var(--ss-space-4);
}

.channel-hub__more-item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
}

.channel-hub__more-item:hover {
  background: var(--ss-color-brand-50);
}
</style>
