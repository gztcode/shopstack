<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { updateProfile } from '@/api/user'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { genderText } from '@/utils/enums'
import { formatYuan, maskPhone } from '@/utils/format'
import { handleImageError } from '@/utils/image'

const router = useRouter()
const app = useAppStore()
const auth = useAuthStore()
const userStore = useUserStore()

const profileVisible = ref(false)
const saving = ref(false)

const form = reactive({
  nickname: '',
  email: '',
  gender: 'GENDER_UNSPECIFIED',
  birthday: '',
})

const profile = computed(() => userStore.profile ?? auth.user)

const orderEntries = computed(() => [
  { label: '待付款', count: userStore.orderCount.pending_payment, path: '/order?status=1' },
  { label: '待发货', count: userStore.orderCount.pending_shipment, path: '/order?status=2' },
  { label: '待收货', count: userStore.orderCount.pending_receipt, path: '/order?status=3' },
  { label: '退款/售后', count: userStore.orderCount.refunding, path: '/order?status=6' },
])

const functions = computed(() => [
  { label: '收货地址', icon: '📍', path: '/user/address' },
  { label: '我的收藏', icon: '💖', path: '/user/favorites', badge: userStore.favorites.length },
  { label: '我的优惠券', icon: '🎟️', path: '/user/coupons', badge: userStore.coupons.length },
  { label: '消息通知', icon: '🔔', path: '/user/notification', badge: userStore.unreadCount },
  { label: '我的订单', icon: '📦', path: '/order' },
])

/** 更多服务：新增页面的入口 */
const services = computed(() => [
  { label: '会员中心', icon: '💎', path: '/member' },
  { label: '积分中心', icon: '🎯', path: '/points' },
  { label: '领券中心', icon: '🧧', path: '/coupon-center' },
  { label: '发票管理', icon: '🧾', path: '/invoices' },
  { label: '物流跟踪', icon: '🚚', path: '/logistics' },
  { label: '订单轨迹', icon: '🧭', path: '/order-trace' },
  { label: '我的评价', icon: '⭐', path: '/reviews' },
  { label: '售后申请', icon: '↩️', path: '/refund' },
  { label: '浏览足迹', icon: '🕘', path: '/history' },
  { label: '商品对比', icon: '⚖️', path: '/compare' },
  { label: '支付结果', icon: '🧾', path: '/pay-result' },
  { label: '限时秒杀', icon: '⚡', path: '/flash-sale' },
  { label: '拼团专区', icon: '👥', path: '/group-buy' },
  { label: '全部分类', icon: '🗂️', path: '/categories' },
])

function openProfile(): void {
  form.nickname = profile.value?.nickname ?? ''
  form.email = profile.value?.email ?? ''
  form.gender = profile.value?.gender ?? 'GENDER_UNSPECIFIED'
  form.birthday = profile.value?.birthday ?? ''
  profileVisible.value = true
}

async function saveProfile(): Promise<void> {
  saving.value = true
  try {
    const updated = await updateProfile({ ...form })
    userStore.profile = updated
    if (auth.user) auth.user = updated
    app.success('资料已更新')
    profileVisible.value = false
  } catch {
    // 错误提示已由接口层处理
  } finally {
    saving.value = false
  }
}

async function logout(): Promise<void> {
  await auth.logout()
  app.success('已退出登录')
  router.push('/')
}

onMounted(async () => {
  await userStore.refreshAll()
  await Promise.all([userStore.loadAddresses(), userStore.loadFavorites(), userStore.loadCoupons()])
})
</script>

<template>
  <div class="user ss-container ss-page">
    <!-- 用户信息卡 -->
    <section class="user__hero">
      <img
        class="user__avatar"
        :src="profile?.avatar"
        :alt="profile?.nickname ?? '用户头像'"
        @error="handleImageError"
      />
      <div class="ss-grow">
        <h1 class="user__name">{{ profile?.nickname ?? 'ShopStack 用户' }}</h1>
        <p class="user__sub">
          {{ maskPhone(profile?.phone) }} · {{ genderText(profile?.gender) }}
        </p>
      </div>
      <div class="user__stats">
        <div class="user__stat">
          <strong class="ss-num">{{ profile?.points ?? 0 }}</strong>
          <span>积分</span>
        </div>
        <div class="user__stat">
          <strong class="ss-num">{{ formatYuan(profile?.balance_cents ?? 0) }}</strong>
          <span>余额</span>
        </div>
        <div class="user__stat">
          <strong class="ss-num">{{ userStore.coupons.length }}</strong>
          <span>优惠券</span>
        </div>
      </div>
      <button type="button" class="ss-btn ss-btn-outline user__edit" @click="openProfile">
        编辑资料
      </button>
    </section>

    <!-- 订单状态入口 -->
    <section class="ss-card ss-card-pad ss-section">
      <div class="ss-row-between ss-section-title">
        <h2>我的订单</h2>
        <RouterLink class="ss-text-brand ss-muted-block" to="/order">全部订单 →</RouterLink>
      </div>
      <div class="user__orders">
        <RouterLink v-for="entry in orderEntries" :key="entry.label" class="user__order" :to="entry.path">
          <span class="user__order-icon">
            {{ entry.label === '待付款' ? '💳' : entry.label === '待发货' ? '📦' : entry.label === '待收货' ? '🚚' : '↩️' }}
            <span v-if="entry.count > 0" class="ss-badge">{{ entry.count }}</span>
          </span>
          <span>{{ entry.label }}</span>
        </RouterLink>
      </div>
    </section>

    <!-- 功能宫格 -->
    <section class="ss-card ss-card-pad ss-section">
      <div class="ss-section-title"><h2>常用功能</h2></div>
      <div class="user__functions">
        <RouterLink v-for="item in functions" :key="item.label" class="user__function" :to="item.path">
          <span class="user__function-icon">
            {{ item.icon }}
            <span v-if="item.badge" class="ss-badge">{{ item.badge }}</span>
          </span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </div>
    </section>

    <!-- 更多服务 -->
    <section class="ss-card ss-card-pad ss-section">
      <div class="ss-section-title">
        <h2>更多服务</h2>
        <RouterLink class="ss-text-brand ss-muted-block" to="/member">会员中心 →</RouterLink>
      </div>
      <div class="user__functions">
        <RouterLink v-for="item in services" :key="item.label" class="user__function" :to="item.path">
          <span class="user__function-icon">{{ item.icon }}</span>
          <span>{{ item.label }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="ss-card ss-card-pad ss-section">
      <div class="ss-row-between">
        <div class="ss-col">
          <strong>退出登录</strong>
          <span class="ss-muted-block">退出后需要重新登录才能查看订单与收藏</span>
        </div>
        <button type="button" class="ss-btn ss-btn-danger" @click="logout">退出登录</button>
      </div>
    </section>

    <!-- 资料编辑 -->
    <Teleport to="body">
      <div v-if="profileVisible" class="user__dialog" @click.self="profileVisible = false">
        <div class="user__dialog-panel ss-card">
          <div class="ss-row-between">
            <h3>编辑资料</h3>
            <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="profileVisible = false">
              关闭
            </button>
          </div>

          <label class="ss-field">
            <span class="ss-label">昵称</span>
            <input v-model="form.nickname" class="ss-input" placeholder="请输入昵称" />
          </label>
          <label class="ss-field">
            <span class="ss-label">邮箱</span>
            <input v-model="form.email" class="ss-input" placeholder="请输入邮箱" />
          </label>
          <label class="ss-field">
            <span class="ss-label">性别</span>
            <select v-model="form.gender" class="ss-select">
              <option value="GENDER_UNSPECIFIED">未设置</option>
              <option value="GENDER_MALE">男</option>
              <option value="GENDER_FEMALE">女</option>
              <option value="GENDER_UNKNOWN">保密</option>
            </select>
          </label>
          <label class="ss-field">
            <span class="ss-label">生日</span>
            <input v-model="form.birthday" class="ss-input" placeholder="YYYY-MM-DD" />
          </label>

          <div class="ss-row-between">
            <span />
            <button type="button" class="ss-btn ss-btn-primary" :disabled="saving" @click="saveProfile">
              {{ saving ? '保存中…' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.user__hero {
  display: flex;
  align-items: center;
  gap: var(--ss-space-5);
  padding: var(--ss-space-6);
  border-radius: var(--ss-radius-xl);
  background: var(--ss-gradient-hero);
  color: var(--ss-color-text-inverse);
  margin-bottom: var(--ss-space-5);
}

.user__avatar {
  width: 72px;
  height: 72px;
  border-radius: var(--ss-radius-circle);
  object-fit: cover;
  background: var(--ss-color-bg-card);
}

.user__name {
  font-size: var(--ss-font-size-3xl);
}

.user__sub {
  margin: var(--ss-space-2) 0 0;
  opacity: 0.8;
}

.user__stats {
  display: flex;
  gap: var(--ss-space-6);
}

.user__stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.user__stat strong {
  font-size: var(--ss-font-size-2xl);
}

.user__stat span {
  font-size: var(--ss-font-size-xs);
  opacity: 0.8;
}

.user__edit {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.4);
  color: var(--ss-color-text-inverse);
}

.user__orders {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--ss-space-3);
}

.user__order {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  font-size: var(--ss-font-size-md);
}

.user__order:hover {
  background: var(--ss-color-brand-50);
  color: var(--ss-color-brand-600);
}

.user__order-icon {
  position: relative;
  font-size: 26px;
}

.user__order-icon .ss-badge {
  position: absolute;
  top: -6px;
  right: -10px;
}

.user__functions {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: var(--ss-space-3);
}

.user__function {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-4) var(--ss-space-2);
  border-radius: var(--ss-radius-md);
  font-size: var(--ss-font-size-md);
}

.user__function:hover {
  background: var(--ss-color-bg-subtle);
}

.user__function-icon {
  position: relative;
  font-size: 26px;
}

.user__function-icon .ss-badge {
  position: absolute;
  top: -6px;
  right: -12px;
}

.user__dialog {
  position: fixed;
  inset: 0;
  z-index: var(--ss-z-index-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ss-space-4);
  background: var(--ss-color-bg-overlay);
}

.user__dialog-panel {
  width: min(440px, 100%);
  padding: var(--ss-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
  box-shadow: var(--ss-shadow-xl);
}

@media (max-width: 1023px) {
  .user__functions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .user__hero {
    flex-wrap: wrap;
  }
}

@media (max-width: 767px) {
  .user__stats {
    width: 100%;
    justify-content: space-around;
  }

  .user__orders {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .user__functions {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
