<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import EmptyState from '@/components/EmptyState.vue'
import { listRegions } from '@/api/user'
import type { Region } from '@/types'

/**
 * 收货地区
 * 数据来源 GET /api/v1/regions（tree=true），支持省 → 市 → 区三级联动查看。
 */
const router = useRouter()

const regions = ref<Region[]>([])
const selectedProvince = ref<Region | null>(null)
const selectedCity = ref<Region | null>(null)
const selectedDistrict = ref<Region | null>(null)
const loading = ref(false)

/** 当前省下的市 */
const cities = computed(() => {
  if (!selectedProvince.value) return []
  return regions.value.filter((item) => item.parent_id === selectedProvince.value?.id)
})

/** 当前市下的区 */
const districts = computed(() => {
  if (!selectedCity.value) return []
  return regions.value.filter((item) => item.parent_id === selectedCity.value?.id)
})

/** 已选择的完整路径 */
const selectedPath = computed(() =>
  [selectedProvince.value, selectedCity.value, selectedDistrict.value]
    .filter((item): item is Region => Boolean(item))
    .map((item) => item.name)
    .join(' '),
)

function selectProvince(region: Region): void {
  selectedProvince.value = region
  selectedCity.value = null
  selectedDistrict.value = null
}

function selectCity(region: Region): void {
  selectedCity.value = region
  selectedDistrict.value = null
}

function selectDistrict(region: Region): void {
  selectedDistrict.value = region
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await listRegions({ tree: true })
    regions.value = result.regions
  } catch {
    // 错误提示已由接口层处理
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="region ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">收货地区</h1>
        <p class="ss-page-sub">查看平台支持的省市区行政区域</p>
      </div>
      <RouterLink class="ss-btn ss-btn-outline ss-btn-sm" to="/user/address">收货地址</RouterLink>
    </div>

    <EmptyState
      v-if="!regions.length && !loading"
      icon="🗺️"
      title="暂无地区数据"
      description="地区数据正在同步，可先到收货地址页面选择已保存的地址"
      action-text="去收货地址"
      @action="router.push('/user/address')"
    />

    <template v-else>
      <section v-if="selectedPath" class="region__selected ss-card">
        <span class="ss-muted-block">已选择</span>
        <strong>{{ selectedPath }}</strong>
        <span class="ss-grow" />
        <RouterLink class="ss-btn ss-btn-primary ss-btn-sm" to="/user/address">用于收货地址</RouterLink>
      </section>

      <div class="region__layout">
        <section class="region__column ss-card">
          <h2 class="region__column-title">省份</h2>
          <button
            v-for="item in regions"
            :key="item.id"
            type="button"
            class="region__item"
            :class="{ 'region__item--active': selectedProvince?.id === item.id }"
            @click="selectProvince(item)"
          >
            {{ item.name }}
            <span class="ss-muted-block">{{ item.code }}</span>
          </button>
        </section>

        <section class="region__column ss-card">
          <h2 class="region__column-title">城市</h2>
          <p v-if="!cities.length" class="region__empty">请先选择省份</p>
          <button
            v-for="item in cities"
            :key="item.id"
            type="button"
            class="region__item"
            :class="{ 'region__item--active': selectedCity?.id === item.id }"
            @click="selectCity(item)"
          >
            {{ item.name }}
            <span class="ss-muted-block">{{ item.code }}</span>
          </button>
        </section>

        <section class="region__column ss-card">
          <h2 class="region__column-title">区县</h2>
          <p v-if="!districts.length" class="region__empty">请先选择城市</p>
          <button
            v-for="item in districts"
            :key="item.id"
            type="button"
            class="region__item"
            :class="{ 'region__item--active': selectedDistrict?.id === item.id }"
            @click="selectDistrict(item)"
          >
            {{ item.name }}
            <span class="ss-muted-block">{{ item.code }}</span>
          </button>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.region__selected {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3) var(--ss-space-4);
  margin-bottom: var(--ss-space-4);
  flex-wrap: wrap;
}

.region__layout {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--ss-space-4);
}

.region__column {
  padding: var(--ss-space-3);
  max-height: 520px;
  overflow-y: auto;
}

.region__column-title {
  font-size: var(--ss-font-size-md);
  padding: var(--ss-space-2);
  border-bottom: 1px solid var(--ss-color-border-subtle);
  margin-bottom: var(--ss-space-2);
}

.region__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ss-space-2);
  width: 100%;
  border: 0;
  background: transparent;
  padding: var(--ss-space-2) var(--ss-space-3);
  border-radius: var(--ss-radius-md);
  cursor: pointer;
  text-align: left;
  font-size: var(--ss-font-size-sm);
}

.region__item:hover {
  background: var(--ss-color-bg-subtle);
}

.region__item--active {
  background: var(--ss-color-brand-600);
  color: var(--ss-color-text-inverse);
}

.region__item--active .ss-muted-block {
  color: var(--ss-color-text-inverse);
  opacity: 0.8;
}

.region__empty {
  margin: 0;
  padding: var(--ss-space-4);
  color: var(--ss-color-text-tertiary);
  text-align: center;
  font-size: var(--ss-font-size-sm);
}

@media (max-width: 1023px) {
  .region__layout {
    grid-template-columns: 1fr;
  }
}
</style>
