<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getAccountSecurity } from '@/api/user'
import type { AccountSecurityInfo } from '@/types'
import { formatDateTime } from '@/utils/format'

/**
 * 账号安全
 * 数据来源 GET /api/v1/users/security。
 */
const info = ref<AccountSecurityInfo | null>(null)
const loading = ref(false)

/** 风险等级文案 */
const RISK_TEXT: Record<number, string> = { 0: '安全', 1: '中等风险', 2: '高风险' }

/** 风险等级色板 */
const RISK_TONE: Record<number, string> = { 0: 'success', 1: 'warning', 2: 'danger' }

/** 绑定状态项 */
const bindings = computed(() => {
  if (!info.value) return []
  return [
    { key: 'phone', label: '手机号', icon: '📱', bound: info.value.phone_bound, path: '/user' },
    { key: 'email', label: '邮箱', icon: '📧', bound: info.value.email_bound, path: '/user' },
    { key: 'wechat', label: '微信', icon: '💬', bound: info.value.wechat_bound, path: '/user' },
    {
      key: 'realname',
      label: '实名认证',
      icon: '🪪',
      bound: info.value.realname_verified,
      path: '/user/realname',
    },
  ]
})

/** 未绑定项数量 */
const unboundCount = computed(() => bindings.value.filter((item) => !item.bound).length)

async function load(): Promise<void> {
  loading.value = true
  try {
    info.value = await getAccountSecurity()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="account-security ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">账号安全</h1>
        <p class="ss-page-sub">查看账号绑定情况与安全风险提示</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/user">个人中心</RouterLink>
    </div>

    <section v-if="info" class="account-security__risk ss-card">
      <div class="account-security__risk-main">
        <span class="ss-muted-block">账号安全等级</span>
        <strong class="ss-num" :class="`ss-text-${RISK_TONE[info.risk_level] ?? 'default'}`">
          {{ RISK_TEXT[info.risk_level] ?? '未知' }}
        </strong>
      </div>
      <div class="ss-col account-security__risk-desc">
        <span class="ss-muted-block">
          密码最后修改：{{ formatDateTime(info.password_changed_at) }}
        </span>
        <span class="ss-muted-block">还有 {{ unboundCount }} 项未绑定，建议尽快完善</span>
      </div>
      <RouterLink class="ss-btn ss-btn-primary" to="/user/realname">去完善</RouterLink>
    </section>

    <section class="ss-section">
      <div class="ss-section-title">
        <h2>绑定与认证</h2>
      </div>
      <div class="account-security__bindings ss-card">
        <div v-for="item in bindings" :key="item.key" class="account-security__binding">
          <span class="account-security__icon">{{ item.icon }}</span>
          <span class="ss-grow">{{ item.label }}</span>
          <span
            class="ss-tag"
            :class="item.bound ? 'ss-tag-success' : 'ss-tag-warning'"
          >
            {{ item.bound ? '已绑定' : '未绑定' }}
          </span>
          <RouterLink class="ss-btn ss-btn-ghost ss-btn-sm" :to="item.path">
            {{ item.bound ? '管理' : '去绑定' }}
          </RouterLink>
        </div>
      </div>
    </section>

    <section v-if="info?.warnings.length" class="ss-section">
      <div class="ss-section-title">
        <h2>安全提示</h2>
      </div>
      <ul class="account-security__warnings ss-card">
        <li v-for="(warning, index) in info.warnings" :key="index">{{ warning }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.account-security__risk {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-5);
  padding: var(--ss-space-5);
  margin-bottom: var(--ss-space-5);
  flex-wrap: wrap;
}

.account-security__risk-main {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-1);
}

.account-security__risk-main strong {
  font-size: var(--ss-font-size-3xl);
}

.account-security__risk-desc {
  flex: 1;
  min-width: 240px;
}

.account-security__bindings {
  overflow: hidden;
}

.account-security__binding {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.account-security__binding:last-child {
  border-bottom: 0;
}

.account-security__icon {
  font-size: 20px;
}

.account-security__warnings {
  list-style: none;
  margin: 0;
  padding: var(--ss-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  color: var(--ss-color-text-secondary);
}

.account-security__warnings li::before {
  content: '⚠️ ';
}
</style>
