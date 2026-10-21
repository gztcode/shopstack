<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import LoadingState from '@/components/LoadingState.vue'
import { getShipment, listTracks } from '@/api/logistics'
import { listOrders } from '@/api/order'
import { useAppStore } from '@/stores/app'
import type { Order, Shipment, ShipmentTrack } from '@/types'
import { shipmentStatusText } from '@/utils/enums'
import { formatDateTime, formatYuan } from '@/utils/format'

const route = useRoute()
const app = useAppStore()

const orderInput = ref(String(route.query.order_id ?? ''))
const tracks = ref<ShipmentTrack[]>([])
const shipment = ref<Shipment | null>(null)
const loading = ref(false)
const searched = ref(false)
const orders = ref<Order[]>([])

const hasTrack = computed(() => tracks.value.length > 0)
const hasShipment = computed(() => Boolean(shipment.value?.tracking_no))

async function query(): Promise<void> {
  const value = Number(orderInput.value)
  if (!Number.isFinite(value) || value <= 0) {
    app.warning('请输入正确的订单号或订单 ID')
    return
  }
  loading.value = true
  searched.value = true
  try {
    // 优先用轨迹接口，失败时退回发货单接口
    let result
    try {
      result = await listTracks(value)
    } catch {
      result = await getShipment(value)
    }
    tracks.value = result.tracks ?? []
    shipment.value = result.shipment ?? null
    if (!tracks.value.length && !shipment.value?.tracking_no) {
      app.info('该订单暂无物流信息')
    }
  } catch {
    app.error('物流查询失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function loadOrders(): Promise<void> {
  try {
    const result = await listOrders({ page: 1, page_size: 20 })
    orders.value = result.orders.filter((order) => order.shipment_id > 0 || order.status === 'ORDER_STATUS_SHIPPED' || order.status === 'ORDER_STATUS_COMPLETED')
  } catch {
    // 订单列表失败时仅保留手动输入查询
  }
}

function pickOrder(order: Order): void {
  orderInput.value = String(order.id)
  query()
}

onMounted(async () => {
  await loadOrders()
  if (orderInput.value) {
    query()
  }
})
</script>

<template>
  <div class="logistics ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">物流跟踪</h1>
        <p class="ss-page-sub">输入订单号查询承运商、运单号与全程轨迹</p>
      </div>
    </div>

    <section class="logistics__search ss-card ss-card-pad">
      <div class="logistics__search-row">
        <input
          v-model="orderInput"
          class="ss-input"
          type="text"
          placeholder="请输入订单号或订单 ID"
          @keyup.enter="query"
        />
        <button type="button" class="ss-btn ss-btn-primary" :disabled="loading" @click="query">
          {{ loading ? '查询中…' : '查询物流' }}
        </button>
      </div>

      <div v-if="orders.length" class="logistics__recent">
        <span class="ss-muted-block">最近可查订单：</span>
        <button
          v-for="order in orders.slice(0, 6)"
          :key="order.id"
          type="button"
          class="ss-btn ss-btn-outline ss-btn-sm"
          @click="pickOrder(order)"
        >
          {{ order.order_no }}
        </button>
      </div>
    </section>

    <LoadingState v-if="loading" text="正在查询物流轨迹…" />

    <template v-else-if="searched">
      <section v-if="hasShipment" class="ss-card ss-card-pad logistics__shipment">
        <div class="ss-row-between">
          <div class="ss-col">
            <strong>{{ shipment?.company }}</strong>
            <span class="ss-muted-block">运单号 {{ shipment?.tracking_no }}</span>
          </div>
          <span class="ss-tag ss-tag-accent">{{ shipmentStatusText(shipment?.status) }}</span>
        </div>
        <div class="logistics__meta">
          <span>收货人：{{ shipment?.receiver }} {{ shipment?.phone }}</span>
          <span>收货地址：{{ shipment?.address }}</span>
          <span>运费：{{ formatYuan(shipment?.freight_cents ?? 0) }}</span>
          <span v-if="shipment?.shipped_at">发货时间：{{ formatDateTime(shipment?.shipped_at) }}</span>
        </div>
      </section>

      <section class="ss-card ss-card-pad logistics__timeline">
        <h2 class="logistics__title">物流轨迹</h2>
        <ol v-if="hasTrack" class="timeline">
          <li v-for="track in tracks" :key="track.id" class="timeline__item">
            <span class="timeline__dot" />
            <div class="ss-col">
              <strong>{{ track.description }}</strong>
              <span class="ss-muted-block">
                {{ formatDateTime(track.occurred_at) }} · {{ track.location }}
              </span>
            </div>
          </li>
        </ol>
        <EmptyState
          v-else
          icon="🚚"
          title="暂无物流轨迹"
          description="商家发货后即可查看物流轨迹，若长时间无更新请联系客服"
          action-text="重新查询"
          @action="query"
        />
      </section>
    </template>

    <section v-else class="ss-card ss-card-pad">
      <EmptyState
        icon="🔎"
        title="输入订单号开始查询"
        description="支持订单 ID 与订单号查询最近的发货记录"
      />
    </section>
  </div>
</template>

<style scoped>
.logistics__search {
  margin-bottom: var(--ss-space-4);
}

.logistics__search-row {
  display: flex;
  gap: var(--ss-space-2);
  max-width: 520px;
}

.logistics__recent {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  margin-top: var(--ss-space-3);
  flex-wrap: wrap;
}

.logistics__shipment {
  margin-bottom: var(--ss-space-4);
}

.logistics__meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: var(--ss-space-3);
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
}

.logistics__title {
  font-size: var(--ss-font-size-lg);
  margin-bottom: var(--ss-space-4);
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0 0 0 var(--ss-space-4);
  border-left: 2px solid var(--ss-color-border-subtle);
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-4);
}

.timeline__item {
  position: relative;
}

.timeline__dot {
  position: absolute;
  left: calc(-1 * var(--ss-space-4) - 5px);
  top: 6px;
  width: 8px;
  height: 8px;
  border-radius: var(--ss-radius-circle);
  background: var(--ss-color-brand-600);
}
</style>
