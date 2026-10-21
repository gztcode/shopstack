<script setup lang="ts">
import { reactive, watch } from 'vue'

import { useAppStore } from '@/stores/app'
import type { Address } from '@/types'

/** 收货地址编辑弹窗 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    address?: Address | null
  }>(),
  {
    address: null,
  },
)

const emit = defineEmits<{
  'update:modelValue': [visible: boolean]
  save: [payload: Partial<Address>]
}>()

const app = useAppStore()

const form = reactive({
  id: 0,
  receiver: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  postal_code: '',
  tag: '家',
  is_default: false,
})

const errors = reactive<Record<string, string>>({})

watch(
  () => [props.modelValue, props.address] as const,
  () => {
    if (!props.modelValue) return
    Object.assign(form, {
      id: props.address?.id ?? 0,
      receiver: props.address?.receiver ?? '',
      phone: props.address?.phone ?? '',
      province: props.address?.province ?? '',
      city: props.address?.city ?? '',
      district: props.address?.district ?? '',
      detail: props.address?.detail ?? '',
      postal_code: props.address?.postal_code ?? '',
      tag: props.address?.tag ?? '家',
      is_default: props.address?.is_default ?? false,
    })
    Object.keys(errors).forEach((key) => delete errors[key])
  },
  { immediate: true },
)

function validate(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key])
  if (!form.receiver.trim()) errors.receiver = '请填写收货人'
  if (!/^1[3-9]\d{9}$/.test(form.phone.trim())) errors.phone = '请填写正确的手机号'
  if (!form.province.trim()) errors.province = '请填写省份'
  if (!form.city.trim()) errors.city = '请填写城市'
  if (!form.district.trim()) errors.district = '请填写区县'
  if (!form.detail.trim()) errors.detail = '请填写详细地址'
  return Object.keys(errors).length === 0
}

function submit(): void {
  if (!validate()) {
    app.warning('请完善收货地址信息')
    return
  }
  emit('save', { ...form })
  emit('update:modelValue', false)
}

function close(): void {
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.modelValue" class="address-modal" @click.self="close">
      <div class="address-modal__panel ss-card">
        <div class="ss-row-between">
          <h3>{{ props.address?.id ? '编辑收货地址' : '新增收货地址' }}</h3>
          <button type="button" class="ss-btn ss-btn-ghost ss-btn-sm" @click="close">关闭</button>
        </div>

        <div class="address-modal__grid">
          <label class="ss-field">
            <span class="ss-label">收货人</span>
            <input v-model="form.receiver" class="ss-input" placeholder="请输入收货人姓名" />
            <span v-if="errors.receiver" class="ss-error-text">{{ errors.receiver }}</span>
          </label>
          <label class="ss-field">
            <span class="ss-label">手机号</span>
            <input v-model="form.phone" class="ss-input" placeholder="请输入手机号" />
            <span v-if="errors.phone" class="ss-error-text">{{ errors.phone }}</span>
          </label>
          <label class="ss-field">
            <span class="ss-label">省份</span>
            <input v-model="form.province" class="ss-input" placeholder="如：浙江省" />
            <span v-if="errors.province" class="ss-error-text">{{ errors.province }}</span>
          </label>
          <label class="ss-field">
            <span class="ss-label">城市</span>
            <input v-model="form.city" class="ss-input" placeholder="如：杭州市" />
            <span v-if="errors.city" class="ss-error-text">{{ errors.city }}</span>
          </label>
          <label class="ss-field">
            <span class="ss-label">区县</span>
            <input v-model="form.district" class="ss-input" placeholder="如：西湖区" />
            <span v-if="errors.district" class="ss-error-text">{{ errors.district }}</span>
          </label>
          <label class="ss-field">
            <span class="ss-label">标签</span>
            <select v-model="form.tag" class="ss-select">
              <option value="家">家</option>
              <option value="公司">公司</option>
              <option value="学校">学校</option>
              <option value="其他">其他</option>
            </select>
          </label>
          <label class="ss-field address-modal__full">
            <span class="ss-label">详细地址</span>
            <textarea
              v-model="form.detail"
              class="ss-textarea"
              placeholder="街道、门牌号、楼层等"
            />
            <span v-if="errors.detail" class="ss-error-text">{{ errors.detail }}</span>
          </label>
        </div>

        <label class="address-modal__default">
          <input v-model="form.is_default" type="checkbox" />
          <span>设为默认收货地址</span>
        </label>

        <div class="ss-row-between address-modal__actions">
          <span />
          <div class="ss-row">
            <button type="button" class="ss-btn ss-btn-ghost" @click="close">取消</button>
            <button type="button" class="ss-btn ss-btn-primary" @click="submit">保存地址</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.address-modal {
  position: fixed;
  inset: 0;
  z-index: var(--ss-z-index-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ss-space-4);
  background: var(--ss-color-bg-overlay);
}

.address-modal__panel {
  width: min(640px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: var(--ss-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-4);
  box-shadow: var(--ss-shadow-xl);
}

.address-modal__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ss-space-3);
}

.address-modal__full {
  grid-column: 1 / -1;
}

.address-modal__default {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  font-size: var(--ss-font-size-md);
  color: var(--ss-color-text-secondary);
}

@media (max-width: 767px) {
  .address-modal__grid {
    grid-template-columns: 1fr;
  }
}
</style>
