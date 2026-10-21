<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'

/** 顶部导航栏 */
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const cart = useCartStore()
const userStore = useUserStore()

const keyword = ref('')
const menuOpen = ref(false)

const navItems = [
  { name: 'home', label: '首页', path: '/' },
  { name: 'categories', label: '全部分类', path: '/categories' },
  { name: 'flash-sale', label: '限时秒杀', path: '/flash-sale' },
  { name: 'group-buy', label: '拼团专区', path: '/group-buy' },
  { name: 'coupon-center', label: '领券中心', path: '/coupon-center' },
  { name: 'order', label: '我的订单', path: '/order' },
  { name: 'member', label: '个人中心', path: '/member' },
]

const activeName = computed(() => (route.name as string) ?? 'home')

function search(): void {
  const value = keyword.value.trim()
  if (!value) {
    router.push({ name: 'category' })
    return
  }
  router.push({ name: 'search', query: { q: value } })
}

function go(path: string): void {
  menuOpen.value = false
  router.push(path)
}

onMounted(async () => {
  if (auth.isLoggedIn) {
    await cart.loadCart()
    await userStore.loadUnreadCount()
  }
})
</script>

<template>
  <header class="app-header">
    <div class="app-header__inner ss-container">
      <RouterLink class="app-header__logo" to="/">
        <span class="app-header__mark">S</span>
        <span class="app-header__name">ShopStack</span>
      </RouterLink>

      <form class="app-header__search" @submit.prevent="search">
        <input
          v-model="keyword"
          class="app-header__input"
          type="search"
          placeholder="搜索商品，如「蓝牙耳机」"
          aria-label="搜索商品"
        />
        <button type="submit" class="app-header__search-btn">搜索</button>
      </form>

      <div class="app-header__actions">
        <RouterLink class="app-header__action" to="/cart">
          <span class="app-header__action-icon">🛒</span>
          <span class="app-header__action-text">购物车</span>
          <span v-if="cart.count > 0" class="ss-badge">{{ cart.count }}</span>
        </RouterLink>
        <RouterLink class="app-header__action" to="/user/notification">
          <span class="app-header__action-icon">🔔</span>
          <span class="app-header__action-text">消息</span>
          <span v-if="userStore.unreadCount > 0" class="ss-badge">
            {{ userStore.unreadCount }}
          </span>
        </RouterLink>
        <RouterLink v-if="auth.isLoggedIn" class="app-header__action" to="/user">
          <span class="app-header__action-icon">👤</span>
          <span class="app-header__action-text ss-ellipsis">{{ auth.nickname }}</span>
        </RouterLink>
        <RouterLink v-else class="ss-btn ss-btn-primary ss-btn-sm" to="/login">登录 / 注册</RouterLink>
        <button
          type="button"
          class="app-header__menu"
          aria-label="展开菜单"
          @click="menuOpen = !menuOpen"
        >
          ☰
        </button>
      </div>
    </div>

    <nav class="app-header__nav">
      <div class="ss-container app-header__nav-inner">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          class="app-header__nav-item"
          :class="{ 'app-header__nav-item--active': activeName === item.name }"
          :to="item.path"
        >
          {{ item.label }}
        </RouterLink>
        <span class="ss-grow" />
        <span class="app-header__slogan">正品保障 · 全场包邮 · 7 天无理由</span>
      </div>
    </nav>

    <div v-if="menuOpen" class="app-header__drawer">
      <button
        v-for="item in navItems"
        :key="item.name"
        type="button"
        class="app-header__drawer-item"
        @click="go(item.path)"
      >
        {{ item.label }}
      </button>
      <button type="button" class="app-header__drawer-item" @click="go('/cart')">
        购物车（{{ cart.count }}）
      </button>
      <button type="button" class="app-header__drawer-item" @click="go('/user')">
        {{ auth.isLoggedIn ? '个人中心' : '登录 / 注册' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: var(--ss-z-index-sticky);
  background: var(--ss-color-bg-card);
  border-bottom: 1px solid var(--ss-color-border-subtle);
  box-shadow: var(--ss-shadow-xs);
}

.app-header__inner {
  display: flex;
  align-items: center;
  gap: var(--ss-space-5);
  height: var(--ss-size-header-desktop);
}

.app-header__logo {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  flex: none;
}

.app-header__mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--ss-radius-md);
  background: var(--ss-gradient-brand);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-bold);
}

.app-header__name {
  font-size: var(--ss-font-size-xl);
  font-weight: var(--ss-font-weight-bold);
  letter-spacing: var(--ss-font-letter-spacing-tight);
}

.app-header__search {
  display: flex;
  flex: 1;
  max-width: 560px;
  height: 40px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-bg-muted);
  overflow: hidden;
}

.app-header__input {
  flex: 1;
  border: 0;
  background: transparent;
  outline: none;
  padding: 0 var(--ss-space-4);
  font-size: var(--ss-font-size-md);
}

.app-header__search-btn {
  border: 0;
  padding: 0 var(--ss-space-5);
  background: var(--ss-gradient-brand);
  color: var(--ss-color-text-inverse);
  font-weight: var(--ss-font-weight-medium);
  cursor: pointer;
}

.app-header__actions {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  margin-left: auto;
}

.app-header__action {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--ss-color-text-secondary);
  font-size: var(--ss-font-size-sm);
  max-width: 140px;
}

.app-header__action:hover {
  color: var(--ss-color-brand-600);
}

.app-header__action-icon {
  font-size: 18px;
}

.app-header__action .ss-badge {
  position: absolute;
  top: -8px;
  left: 14px;
}

.app-header__menu {
  display: none;
  border: 0;
  background: transparent;
  font-size: 22px;
  cursor: pointer;
}

.app-header__nav {
  border-top: 1px solid var(--ss-color-border-subtle);
  background: var(--ss-color-bg-subtle);
}

.app-header__nav-inner {
  display: flex;
  align-items: center;
  gap: var(--ss-space-6);
  height: 44px;
}

.app-header__nav-item {
  color: var(--ss-color-text-secondary);
  font-size: var(--ss-font-size-md);
  padding: 4px 0;
  border-bottom: 2px solid transparent;
}

.app-header__nav-item:hover {
  color: var(--ss-color-brand-600);
}

.app-header__nav-item--active {
  color: var(--ss-color-brand-600);
  font-weight: var(--ss-font-weight-semibold);
  border-bottom-color: var(--ss-color-brand-600);
}

.app-header__slogan {
  color: var(--ss-color-text-quaternary);
  font-size: var(--ss-font-size-sm);
}

.app-header__drawer {
  display: none;
  flex-direction: column;
  border-top: 1px solid var(--ss-color-border-subtle);
  background: var(--ss-color-bg-card);
}

.app-header__drawer-item {
  border: 0;
  border-bottom: 1px solid var(--ss-color-border-subtle);
  background: transparent;
  padding: var(--ss-space-3) var(--ss-space-4);
  text-align: left;
  cursor: pointer;
}

@media (max-width: 1023px) {
  .app-header__nav,
  .app-header__slogan {
    display: none;
  }

  .app-header__menu {
    display: block;
  }

  .app-header__drawer {
    display: flex;
  }

  .app-header__action-text {
    display: none;
  }
}

@media (max-width: 767px) {
  .app-header__inner {
    height: var(--ss-size-header-mobile);
    gap: var(--ss-space-3);
  }

  .app-header__name,
  .app-header__search-btn {
    display: none;
  }

  .app-header__search {
    height: 34px;
  }

  .app-header__actions {
    gap: var(--ss-space-3);
  }
}
</style>
