<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppFooter from '@/components/AppFooter.vue'
import AppHeader from '@/components/AppHeader.vue'
import DemoBanner from '@/components/DemoBanner.vue'
import ToastHost from '@/components/ToastHost.vue'

const route = useRoute()

/** 移动端底部导航 */
const tabs = [
  { name: 'home', label: '首页', icon: '🏠', path: '/' },
  { name: 'category', label: '分类', icon: '🗂️', path: '/category' },
  { name: 'cart', label: '购物车', icon: '🛒', path: '/cart' },
  { name: 'user', label: '我的', icon: '👤', path: '/user' },
]

const activeTab = computed(() => {
  const name = route.name as string
  if (name === 'product' || name === 'search') return 'category'
  if (name === 'order' || name === 'order-detail') return 'user'
  if (name === 'login') return 'user'
  return name
})
</script>

<template>
  <DemoBanner />
  <AppHeader />

  <main class="app-main">
    <RouterView v-slot="{ Component }">
      <Transition name="page" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>

  <AppFooter />
  <ToastHost />

  <nav class="app-tabbar">
    <RouterLink
      v-for="tab in tabs"
      :key="tab.name"
      class="app-tabbar__item"
      :class="{ 'app-tabbar__item--active': activeTab === tab.name }"
      :to="tab.path"
    >
      <span class="app-tabbar__icon">{{ tab.icon }}</span>
      <span class="app-tabbar__label">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.app-main {
  min-height: 60vh;
}

.page-enter-active,
.page-leave-active {
  transition: opacity var(--ss-duration-fast) var(--ss-easing-standard);
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}

.app-tabbar {
  display: none;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: var(--ss-z-index-sticky);
  background: var(--ss-color-bg-card);
  border-top: 1px solid var(--ss-color-border-subtle);
  padding-bottom: env(safe-area-inset-bottom);
}

.app-tabbar__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--ss-space-2) 0;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-xs);
}

.app-tabbar__item--active {
  color: var(--ss-color-brand-600);
}

.app-tabbar__icon {
  font-size: 20px;
}

@media (max-width: 767px) {
  .app-tabbar {
    display: flex;
  }

  .app-main {
    padding-bottom: 64px;
  }
}
</style>
