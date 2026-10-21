<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { listNotifications, markAllRead, markRead } from '@/api/notification'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import type { Notification } from '@/types'
import { notificationTypeText } from '@/utils/enums'
import { formatDateTime } from '@/utils/format'

const router = useRouter()
const app = useAppStore()
const userStore = useUserStore()

const notifications = ref<Notification[]>([])
const loading = ref(false)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listNotifications({ page: 1, page_size: 50 })
    notifications.value = result.notifications
    await userStore.loadUnreadCount()
  } finally {
    loading.value = false
  }
}

async function read(item: Notification): Promise<void> {
  if (item.read) {
    if (item.link) router.push(item.link)
    return
  }
  try {
    await markRead(item.id)
    item.read = true
    await userStore.loadUnreadCount()
    if (item.link) router.push(item.link)
  } catch {
    // 错误提示已由接口层处理
  }
}

async function readAll(): Promise<void> {
  try {
    await markAllRead()
    notifications.value.forEach((item) => {
      item.read = true
    })
    await userStore.loadUnreadCount()
    app.success('已全部标记为已读')
  } catch {
    // 错误提示已由接口层处理
  }
}

onMounted(load)
</script>

<template>
  <div class="notification ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">消息通知</h1>
        <p class="ss-page-sub">
          {{ userStore.unreadCount }} 条未读消息
        </p>
      </div>
      <button
        type="button"
        class="ss-btn ss-btn-outline ss-btn-sm"
        :disabled="!userStore.unreadCount"
        @click="readAll"
      >
        全部已读
      </button>
    </div>

    <EmptyState
      v-if="!notifications.length && !loading"
      icon="🔔"
      title="暂无消息通知"
      description="订单与物流动态会第一时间通知你"
    />

    <div v-else class="notification__list ss-card">
      <button
        v-for="item in notifications"
        :key="item.id"
        type="button"
        class="notification__item"
        :class="{ 'notification__item--unread': !item.read }"
        @click="read(item)"
      >
        <span class="notification__dot" />
        <span class="ss-grow ss-col">
          <span class="ss-row">
            <strong>{{ item.title }}</strong>
            <span class="ss-tag ss-tag-neutral">{{ notificationTypeText(item.type) }}</span>
          </span>
          <span class="notification__content">{{ item.content }}</span>
          <span class="ss-muted-block">{{ formatDateTime(item.created_at) }}</span>
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.notification__list {
  overflow: hidden;
}

.notification__item {
  display: flex;
  align-items: flex-start;
  gap: var(--ss-space-3);
  width: 100%;
  padding: var(--ss-space-4);
  border: 0;
  border-bottom: 1px solid var(--ss-color-border-subtle);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.notification__item:last-child {
  border-bottom: 0;
}

.notification__item:hover {
  background: var(--ss-color-bg-subtle);
}

.notification__item--unread {
  background: var(--ss-color-brand-50);
}

.notification__dot {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: var(--ss-radius-circle);
  background: transparent;
  flex: none;
}

.notification__item--unread .notification__dot {
  background: var(--ss-color-danger-500);
}

.notification__content {
  color: var(--ss-color-text-secondary);
  line-height: var(--ss-font-line-height-relaxed);
}
</style>
