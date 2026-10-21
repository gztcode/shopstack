<script setup lang="ts">
import { onMounted, ref } from 'vue'

import AddressFormModal from '@/components/AddressFormModal.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import type { Address } from '@/types'
import { formatAddress } from '@/utils/format'

const app = useAppStore()
const userStore = useUserStore()

const modalVisible = ref(false)
const editing = ref<Address | null>(null)

function openCreate(): void {
  editing.value = null
  modalVisible.value = true
}

function openEdit(address: Address): void {
  editing.value = address
  modalVisible.value = true
}

async function save(payload: Partial<Address>): Promise<void> {
  try {
    await userStore.saveAddress(payload)
    app.success('地址已保存')
  } catch {
    // 错误提示已由接口层处理
  }
}

async function remove(address: Address): Promise<void> {
  try {
    await userStore.removeAddress(address.id)
    app.success('地址已删除')
  } catch {
    // 错误提示已由接口层处理
  }
}

async function setDefault(address: Address): Promise<void> {
  try {
    await userStore.setDefaultAddress(address.id)
    app.success('已设为默认地址')
  } catch {
    // 错误提示已由接口层处理
  }
}

onMounted(() => {
  userStore.loadAddresses()
})
</script>

<template>
  <div class="address ss-container ss-page">
    <div class="ss-page-head">
      <div>
        <h1 class="ss-page-title">收货地址</h1>
        <p class="ss-page-sub">管理常用收货地址，最多可保存多条</p>
      </div>
      <button type="button" class="ss-btn ss-btn-primary" @click="openCreate">+ 新增地址</button>
    </div>

    <EmptyState
      v-if="!userStore.addresses.length"
      icon="📍"
      title="还没有收货地址"
      description="新增地址后即可在下单时选择"
      action-text="新增地址"
      @action="openCreate"
    />

    <div v-else class="address__grid">
      <section v-for="address in userStore.addresses" :key="address.id" class="address__card ss-card">
        <div class="ss-row-between">
          <div class="ss-row">
            <strong>{{ address.receiver }}</strong>
            <span class="ss-muted-block">{{ address.phone }}</span>
            <span v-if="address.tag" class="ss-tag ss-tag-neutral">{{ address.tag }}</span>
          </div>
          <span v-if="address.is_default" class="ss-tag ss-tag-accent">默认</span>
        </div>
        <p class="ss-muted-block address__detail">{{ formatAddress(address) }}</p>
        <div class="address__actions">
          <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="openEdit(address)">
            编辑
          </button>
          <button
            v-if="!address.is_default"
            type="button"
            class="ss-btn ss-btn-ghost ss-btn-sm"
            @click="setDefault(address)"
          >
            设为默认
          </button>
          <button
            type="button"
            class="ss-btn ss-btn-danger ss-btn-sm"
            @click="remove(address)"
          >
            删除
          </button>
        </div>
      </section>
    </div>

    <AddressFormModal v-model="modalVisible" :address="editing" @save="save" />
  </div>
</template>

<style scoped>
.address__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ss-space-4);
}

.address__card {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-3);
  padding: var(--ss-space-5);
}

.address__detail {
  margin: 0;
  line-height: var(--ss-font-line-height-relaxed);
}

.address__actions {
  display: flex;
  gap: var(--ss-space-2);
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .address__grid {
    grid-template-columns: 1fr;
  }
}
</style>
