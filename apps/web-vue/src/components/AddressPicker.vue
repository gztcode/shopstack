<script setup lang="ts">
import { computed } from 'vue'

import type { Address } from '@/types'
import { formatAddress } from '@/utils/format'

/** 收货地址选择器 */
const props = withDefaults(
  defineProps<{
    addresses: Address[]
    modelValue?: number
    selectable?: boolean
  }>(),
  {
    modelValue: 0,
    selectable: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [id: number]
  create: []
  edit: [address: Address]
}>()

const hasAddress = computed(() => props.addresses.length > 0)

function pick(address: Address): void {
  if (!props.selectable) return
  emit('update:modelValue', address.id)
}
</script>

<template>
  <div class="address-picker">
    <template v-if="hasAddress">
      <div
        v-for="address in props.addresses"
        :key="address.id"
        class="address-picker__item"
        :class="{ 'address-picker__item--active': address.id === props.modelValue }"
        @click="pick(address)"
      >
        <span class="address-picker__radio" />
        <div class="ss-grow">
          <div class="ss-row">
            <strong>{{ address.receiver }}</strong>
            <span class="ss-muted-block">{{ address.phone }}</span>
            <span v-if="address.tag" class="ss-tag ss-tag-neutral">{{ address.tag }}</span>
            <span v-if="address.is_default" class="ss-tag ss-tag-accent">默认</span>
          </div>
          <p class="address-picker__detail">{{ formatAddress(address) }}</p>
        </div>
        <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click.stop="emit('edit', address)">
          编辑
        </button>
      </div>
      <button type="button" class="ss-btn ss-btn-outline ss-btn-sm address-picker__create" @click="emit('create')">
        + 新增收货地址
      </button>
    </template>

    <div v-else class="address-picker__empty">
      <p class="ss-muted-block">还没有收货地址，请先新增地址后再结算。</p>
      <button type="button" class="ss-btn ss-btn-primary ss-btn-sm" @click="emit('create')">
        新增收货地址
      </button>
    </div>
  </div>
</template>

<style scoped>
.address-picker {
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-2);
}

.address-picker__item {
  display: flex;
  align-items: center;
  gap: var(--ss-space-3);
  padding: var(--ss-space-3);
  border: 1px solid var(--ss-color-border-subtle);
  border-radius: var(--ss-radius-md);
  cursor: pointer;
  transition:
    border-color var(--ss-duration-fast) var(--ss-easing-standard),
    background var(--ss-duration-fast) var(--ss-easing-standard);
}

.address-picker__item:hover {
  border-color: var(--ss-color-border-brand);
}

.address-picker__item--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
}

.address-picker__radio {
  width: 16px;
  height: 16px;
  border-radius: var(--ss-radius-circle);
  border: 1px solid var(--ss-color-border-strong);
  flex: none;
}

.address-picker__item--active .address-picker__radio {
  border: 4px solid var(--ss-color-brand-600);
}

.address-picker__detail {
  margin: 2px 0 0;
  color: var(--ss-color-text-tertiary);
  font-size: var(--ss-font-size-sm);
}

.address-picker__create {
  align-self: flex-start;
  margin-top: var(--ss-space-1);
}

.address-picker__empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--ss-space-2);
}
</style>
