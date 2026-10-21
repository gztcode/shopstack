<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { listTracks } from '@/api/logistics'
import { listOrders } from '@/api/order'
import { useAppStore } from '@/stores/app'
import type { Order, Shipment, ShipmentTrack } from '@/types'
import { shipmentStatusText } from '@/utils/enums'
import { formatDateTime, formatYuan } from '@/utils/format'

/**
 * 物流轨迹
 * 逐单查询 GET /api/v1/logistics/tracks?order_id=，汇总展示所有在途包裹的轨迹。
 */
const router = useRouter()
const app = useAppStore()

interface TraceGroup {
  order: Order
  shipment: Shipment | null
  tracks: ShipmentTrack[]
}

const keyword = ref('')
const groups = ref<TraceGroup[]>([])
const loading = ref(false)
const searched = ref(false)

/** 有物流轨迹的订单：已发货 / 已完成 */
const TRACKABLE = ['ORDER_STATUS_SHIPPED', 'ORDER_STATUS_COMPLETED']

async function load(): Promise<void> {
  loading.value = true
  searched.value = true
  try {
    const result = await listOrders({ page: 1, page_size: 30 })
    const orders = result.orders.filter((order) => TRACKABLE.includes(order.status))
    const matched = keyword.value.trim()
      ? orders.filter((order) => order.order_no.includes(keyword.value.trim()))
      : orders

    const entries = await Promise.all(
      matched.map(async (order) => {
        try {
          const trackRes = await listTracks(order.id)
          return { order, shipment: trackRes.shipment ?? null, tracks: trackRes.tracks ?? [] }
        } catch {
          return { order, shipment: null, tracks: [] }
        }
      }),
    )
    groups.value = entries
    if (!entries.length) {
      app.info(keyword.value.trim() ? '没有匹配该订单号的物流轨迹' : '当前没有在途包裹')
    }
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

/** 有轨迹的包裹数量 */
const trackedCount = computed(() => groups.value.filter((item) => item.tracks.length).length)

onMounted(load)
</script>

<template>
  <div class="logistics-trace-list ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">物流轨迹</h1>
        <p class="ss-page-sub">查看所有在途包裹的运输进度</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/logistics">单号查询</RouterLink>
    </div>

    <form class="logistics-trace-list__search ss-card" @submit.prevent="load">
      <input
        v-model="keyword"
        class="ss-input"
        type="search"
        placeholder="输入订单号快速筛选"
        aria-label="订单号"
      />
      <button type="submit" class="ss-btn ss-btn-primary" :disabled="loading">
        {{ loading ? '查询中…' : '查询' }}
      </button>
    </form>

    <EmptyState
      v-if="!groups.length && !loading && searched"
      icon="🚚"
      title="暂无物流轨迹"
      description="发货后包裹轨迹会显示在这里，也可以用运单号直接查询"
      action-text="按运单号查询"
      @action="router.push('/logistics')"
    />

    <section v-for="group in groups" :key="group.order.id" class="logistics-trace-list__card ss-card">
      <header class="logistics-trace-list__head">
        <div class="ss-col">
          <strong>{{ group.order.order_no }}</strong>
          <span v-if="group.shipment" class="ss-muted-block">
            {{ group.shipment.company }} · 运单号 {{ group.shipment.tracking_no || '暂无' }}
          </span>
          <span v-else class="ss-muted-block">暂无发货记录</span>
        </div>
        <span class="ss-grow" />
        <span v-if="group.shipment" class="ss-tag ss-tag-accent">
          {{ shipmentStatusText(group.shipment.status) }}
        </span>
      </header>

      <div class="logistics-trace-list__meta">
        <span class="ss-muted-block">
          运费 <b class="ss-num">{{ formatYuan(group.shipment?.freight_cents ?? 0) }}</b>
        </span>
        <span class="ss-muted-block">共 {{ group.order.total_quantity }} 件商品</span>
        <span class="ss-grow" />
        <RouterLink class="ss-text-brand" :to="`/order/${group.order.id}`">查看订单 →</RouterLink>
      </div>

      <ol v-if="group.tracks.length" class="logistics-trace-list__timeline">
        <li
          v-for="track in group.tracks"
          :key="track.id"
          class="logistics-trace-list__node"
        >
          <span class="logistics-trace-list__dot" />
          <div class="ss-col">
            <span class="logistics-trace-list__desc">{{ track.description }}</span>
            <span class="ss-muted-block">
              {{ track.location || '—' }} · {{ formatDateTime(track.occurred_at) }}
            </span>
          </div>
        </li>
      </ol>
      <p v-else class="ss-muted-block logistics-trace-list__empty">该订单暂无运输轨迹。</p>
    </section>

    <p v-if="groups.length" class="logistics-trace-list__hint ss-muted-block">
      共 {{ groups.length }} 个包裹，其中 {{ trackedCount }} 个有运输轨迹
    </p>
  </div>
</template>

<style scoped>
.logistics-trace-list__search {
  display: flex;
  gap: var(--ss-space-2);
  padding: var(--ss-space-3) var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
}

.logistics-trace-list__search .ss-input {
  flex: 1;
}

.logistics-trace-list__card {
  padding: var(--ss-space-4);
  margin-bottom: var(--ss-space-3);
}

.logistics-trace-list__head {
  display: flex;
  align-items: flex-start;
  gap: var(--ss-space-3);
  padding-bottom: var(--ss-space-3);
  border-bottom: 1px solid var(--ss-color-border-subtle);
}

.logistics-trace-list__meta {
  display: flex;
  align-items: center;
  gap: var(--ss-space-4);
  padding: var(--ss-space-2) 0;
  font-size: var(--ss-font-size-sm);
  flex-wrap: wrap;
}

.logistics-trace-list__timeline {
  list-style: none;
  margin: var(--ss-space-2) 0 0;
  padding: 0 0 0 var(--ss-space-4);
  border-left: 2px solid var(--ss-color-border-subtle);
}

.logistics-trace-list__node {
  position: relative;
  padding: var(--ss-space-2) 0;
}

.logistics-trace-list__dot {
  position: absolute;
  left: calc(-1 * var(--ss-space-4) - 5px);
  top: var(--ss-space-3);
  width: 8px;
  height: 8px;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-brand-600);
}

.logistics-trace-list__desc {
  font-size: var(--ss-font-size-sm);
}

.logistics-trace-list__empty {
  margin: var(--ss-space-3) 0 0;
}

.logistics-trace-list__hint {
  text-align: center;
  margin-top: var(--ss-space-2);
}
</style>
