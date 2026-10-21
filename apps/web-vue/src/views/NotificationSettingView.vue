<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { getNotificationSettings, updateNotificationSettings } from '@/api/user'
import { useAppStore } from '@/stores/app'
import type { UserNotificationSettings } from '@/types'

/**
 * 通知设置
 * 数据来源 GET /api/v1/users/notification-settings、PUT 同路径。
 */
const app = useAppStore()

/** 可配置的通知开关 */
type NoticeKey = keyof Omit<UserNotificationSettings, 'user_id'>

interface NoticeItem {
  key: NoticeKey
  label: string
  icon: string
}

interface NoticeGroup {
  title: string
  desc: string
  items: NoticeItem[]
}

/** 通知渠道分组 */
const GROUPS: NoticeGroup[] = [
  {
    title: '站内消息',
    desc: '在消息中心接收到的提醒',
    items: [
      { key: 'order_notice', label: '订单通知', icon: '📦' },
      { key: 'logistics_notice', label: '物流通知', icon: '🚚' },
      { key: 'marketing_notice', label: '优惠活动', icon: '🎁' },
      { key: 'system_notice', label: '系统通知', icon: '🔔' },
    ],
  },
  {
    title: '外部触达',
    desc: '通过短信、邮件与微信接收提醒',
    items: [
      { key: 'sms_notice', label: '短信通知', icon: '📱' },
      { key: 'email_notice', label: '邮件通知', icon: '📧' },
      { key: 'wechat_notice', label: '微信通知', icon: '💬' },
    ],
  },
]

const settings = ref<UserNotificationSettings | null>(null)
const loading = ref(false)
const saving = ref(false)

/** 全部开关是否开启 */
const allEnabled = ref(false)

async function load(): Promise<void> {
  loading.value = true
  try {
    settings.value = await getNotificationSettings()
    syncAll()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

function syncAll(): void {
  if (!settings.value) return
  const keys = GROUPS.flatMap((group) => group.items.map((item) => item.key))
  allEnabled.value = keys.every((key) => settings.value?.[key])
}

function toggleAll(value: boolean): void {
  if (!settings.value) return
  GROUPS.flatMap((group) => group.items).forEach((item) => {
    settings.value![item.key] = value
  })
}

async function save(): Promise<void> {
  if (!settings.value) return
  saving.value = true
  try {
    settings.value = await updateNotificationSettings(settings.value)
    app.success('通知设置已保存')
  } catch {
    // 错误提示已由接口层处理
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="notification-setting ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">通知设置</h1>
        <p class="ss-page-sub">选择你希望接收到的提醒方式</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/user/notification">消息中心</RouterLink>
    </div>

    <section v-if="settings" class="notification-setting__panel ss-card">
      <label class="notification-setting__all">
        <input v-model="allEnabled" type="checkbox" @change="toggleAll(allEnabled)" />
        <span>
          <strong>全部开启</strong>
          <span class="ss-muted-block">一次性打开所有通知渠道</span>
        </span>
      </label>

      <section v-for="group in GROUPS" :key="group.title" class="notification-setting__group">
        <header class="notification-setting__group-head">
          <strong>{{ group.title }}</strong>
          <span class="ss-muted-block">{{ group.desc }}</span>
        </header>
        <div class="notification-setting__items">
          <label
            v-for="item in group.items"
            :key="item.key"
            class="notification-setting__item"
          >
            <span class="notification-setting__icon">{{ item.icon }}</span>
            <span class="ss-grow">{{ item.label }}</span>
            <input v-model="settings[item.key]" type="checkbox" />
          </label>
        </div>
      </section>

      <footer class="notification-setting__foot">
        <button type="button" class="ss-btn ss-btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存设置' }}
        </button>
      </footer>
    </section>
  </div>
</template>

<style scoped>
.notification-setting__panel {
  padding: var(--ss-space-5);
}

.notification-setting__all {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding-bottom: var(--ss-space-4);
  border-bottom: 1px solid var(--ss-color-border-subtle);
  cursor: pointer;
}

.notification-setting__group {
  padding: var(--ss-space-4) 0;
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.notification-setting__group-head {
  display: flex;
  align-items: baseline;
  gap: var(--ss-space-3);
  margin-bottom: var(--ss-space-3);
  flex-wrap: wrap;
}

.notification-setting__items {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: var(--ss-space-2);
}

.notification-setting__item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) var(--ss-space-4);
  border-radius: var(--ss-radius-md);
  background: var(--ss-color-bg-subtle);
  cursor: pointer;
}

.notification-setting__icon {
  font-size: 20px;
}

.notification-setting__foot {
  display: flex;
  justify-content: flex-end;
  padding-top: var(--ss-space-4);
}
</style>
