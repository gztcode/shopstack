<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import PriceText from '@/components/PriceText.vue'
import { getGroupBuy, joinGroupBuy } from '@/api/marketing'
import { useAppStore } from '@/stores/app'
import type { GroupBuy, GroupBuyMember } from '@/types'
import { formatCountdown, formatDateTime } from '@/utils/format'
import { handleImageError } from '@/utils/image'

/**
 * 拼团详情
 * 数据来源 GET /api/v1/group-buys/{id}，参团 POST /api/v1/group-buys/{id}/join。
 */
const route = useRoute()
const router = useRouter()
const app = useAppStore()

const groupBuy = ref<GroupBuy | null>(null)
const members = ref<GroupBuyMember[]>([])
const loading = ref(false)
const joining = ref(false)
const now = ref(Math.floor(Date.now() / 1000))
let timer: number | null = null

const groupBuyId = computed(() => {
  const raw = route.params.id ?? route.query.id
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : 0
})

/** 成团所需人数 */
const required = computed(() => groupBuy.value?.required_members || groupBuy.value?.group_size || 1)

/** 已成团人数占比 */
const progress = computed(() => {
  if (!groupBuy.value) return 0
  return Math.min(100, Math.round((groupBuy.value.joined_members / required.value) * 100))
})

/** 距结束时间 */
const remain = computed(() => {
  if (!groupBuy.value) return 0
  if (groupBuy.value.status !== 1) return 0
  return Math.max(0, groupBuy.value.end_time - now.value)
})

/** 活动是否可参与 */
const canJoin = computed(() => groupBuy.value?.status === 1 && remain.value > 0)

async function load(): Promise<void> {
  if (!groupBuyId.value) {
    groupBuy.value = null
    members.value = []
    return
  }
  loading.value = true
  try {
    const result = await getGroupBuy(groupBuyId.value)
    groupBuy.value = result.group_buy
    members.value = result.members
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

async function onJoin(): Promise<void> {
  if (!groupBuy.value || joining.value) return
  joining.value = true
  try {
    const updated = await joinGroupBuy(groupBuy.value.id, 1)
    groupBuy.value = { ...groupBuy.value, ...updated }
    app.success('参团成功，快邀请好友一起拼吧')
    await load()
  } catch {
    // 错误提示已由接口层处理
  } finally {
    joining.value = false
  }
}

watch(groupBuyId, load)

onMounted(() => {
  load()
  timer = window.setInterval(() => {
    now.value = Math.floor(Date.now() / 1000)
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer !== null) window.clearInterval(timer)
})
</script>

<template>
  <div class="group-buy-detail ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">拼团详情</h1>
        <p class="ss-page-sub">查看拼团进度与参团成员</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/group-buy-list">拼团列表</RouterLink>
    </div>

    <EmptyState
      v-if="!groupBuy && !loading"
      icon="👥"
      title="拼团活动不存在"
      description="该活动可能已下线，去拼团列表看看其他活动"
      action-text="返回拼团列表"
      @action="router.push('/group-buy-list')"
    />

    <template v-else-if="groupBuy">
      <section class="group-buy-detail__hero ss-card">
        <img
          class="group-buy-detail__image"
          :src="groupBuy.product_image"
          :alt="groupBuy.product_title"
          @error="handleImageError"
        />
        <div class="group-buy-detail__hero-body">
          <strong class="group-buy-detail__name">{{ groupBuy.name }}</strong>
          <p class="ss-muted-block">{{ groupBuy.description }}</p>
          <div class="group-buy-detail__price">
            <PriceText :cents="groupBuy.price_cents" :original-cents="groupBuy.original_price_cents" size="lg" />
          </div>
          <RouterLink
            v-if="groupBuy.product_id"
            class="ss-text-brand"
            :to="`/product/${groupBuy.product_id}`"
          >
            {{ groupBuy.product_title }} →
          </RouterLink>
        </div>
        <div class="group-buy-detail__countdown">
          <span class="ss-muted-block">距结束</span>
          <strong class="ss-num">{{ formatCountdown(remain) }}</strong>
        </div>
      </section>

      <section class="group-buy-detail__progress ss-card">
        <div class="group-buy-detail__progress-head">
          <strong>成团进度</strong>
          <span class="ss-muted-block">
            {{ groupBuy.joined_members }}/{{ required }} 人成团 · 还差
            {{ Math.max(0, required - groupBuy.joined_members) }} 人
          </span>
        </div>
        <div class="group-buy-detail__bar">
          <span class="group-buy-detail__bar-fill" :style="{ width: `${progress}%` }" />
        </div>
        <div class="group-buy-detail__actions">
          <RouterLink
            v-if="groupBuy.product_id"
            class="ss-btn ss-btn-outline"
            :to="`/product/${groupBuy.product_id}`"
          >
            查看商品
          </RouterLink>
          <button
            type="button"
            class="ss-btn ss-btn-primary"
            :disabled="!canJoin || joining"
            @click="onJoin"
          >
            {{ joining ? '参团中…' : canJoin ? '立即参团' : '活动已结束' }}
          </button>
        </div>
      </section>

      <section class="ss-section">
        <div class="ss-section-title">
          <h2>参团成员</h2>
          <span class="ss-muted-block">共 {{ members.length }} 人</span>
        </div>
        <div class="group-buy-detail__members ss-card">
          <div v-for="member in members" :key="member.id" class="group-buy-detail__member">
            <span class="group-buy-detail__avatar">{{ member.user_nickname.slice(0, 1) }}</span>
            <div class="ss-col">
              <strong>{{ member.user_nickname }}</strong>
              <span class="ss-muted-block">{{ formatDateTime(member.joined_at) }}</span>
            </div>
          </div>
          <p v-if="!members.length" class="ss-muted-block group-buy-detail__empty">
            还没有人加入，你来当第一个吧。
          </p>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.group-buy-detail__hero {
  display: flex;
  align-items: center;
  gap: var(--ss-space-5);
  padding: var(--ss-space-5);
  margin-bottom: var(--ss-space-4);
}

.group-buy-detail__image {
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: var(--ss-radius-lg);
  background: var(--ss-color-bg-subtle);
  flex: none;
}

.group-buy-detail__hero-body {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
  flex: 1;
}

.group-buy-detail__name {
  font-size: var(--ss-font-size-xl);
}

.group-buy-detail__hero-body p {
  margin: 0;
}

.group-buy-detail__countdown {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--ss-space-1);
}

.group-buy-detail__countdown strong {
  font-size: var(--ss-font-size-2xl);
  color: var(--ss-color-danger-600);
}

.group-buy-detail__progress {
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
}

.group-buy-detail__progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-3);
  margin-bottom: var(--ss-space-2);
  flex-wrap: wrap;
}

.group-buy-detail__bar {
  height: 10px;
  border-radius: var(--ss-radius-pill);
  background: var(--ss-color-neutral-200);
  overflow: hidden;
}

.group-buy-detail__bar-fill {
  display: block;
  height: 100%;
  background: var(--ss-gradient-brand);
}

.group-buy-detail__actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--ss-space-2);
  margin-top: var(--ss-space-4);
  flex-wrap: wrap;
}

.group-buy-detail__members {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
  padding: var(--ss-space-4);
}

.group-buy-detail__member {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
}

.group-buy-detail__avatar {
  width: 38px;
  height: 38px;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-brand-100);
  color: var(--ss-color-brand-700);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--ss-font-weight-semibold);
  flex: none;
}

.group-buy-detail__empty {
  margin: 0;
  text-align: center;
  padding: var(--ss-space-4) 0;
}

@media (max-width: 767px) {
  .group-buy-detail__hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .group-buy-detail__image {
    width: 100%;
    height: 240px;
  }

  .group-buy-detail__countdown {
    align-items: flex-start;
  }
}
</style>
