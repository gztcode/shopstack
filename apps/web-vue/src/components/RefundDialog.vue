<script setup lang="ts">
import { reactive, watch } from 'vue'

import { formatYuan } from '@/utils/format'

/** 退款申请弹窗 */
const props = withDefaults(
  defineProps<{
    modelValue: boolean
    orderNo?: string
    amountCents?: number
    itemCount?: number
  }>(),
  {
    orderNo: '',
    amountCents: 0,
    itemCount: 0,
  },
)

const emit = defineEmits<{
  'update:modelValue': [visible: boolean]
  submit: [payload: { reason: string; description: string }]
}>()

const reasons = ['商品与描述不符', '质量问题', '发错货 / 少件', '不想要了', '其它原因']

const form = reactive({
  reason: reasons[0],
  description: '',
})

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      form.reason = reasons[0]
      form.description = ''
    }
  },
)

function submit(): void {
  emit('submit', { reason: form.reason, description: form.description })
  emit('update:modelValue', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.modelValue" class="refund-dialog" @click.self="emit('update:modelValue', false)">
      <div class="refund-dialog__panel ss-card">
        <div class="ss-row-between">
          <h3>申请退款</h3>
          <button
            type="button"
            class="ss-btn ss-btn-ghost ss-btn-sm"
            @click="emit('update:modelValue', false)"
          >
            关闭
          </button>
        </div>

        <p class="ss-muted-block">
          订单 {{ props.orderNo }} · {{ props.itemCount }} 件商品 ·
          退款金额 {{ formatYuan(props.amountCents) }}
        </p>

        <div class="ss-field">
          <span class="ss-label">退款原因</span>
          <div class="refund-dialog__reasons">
            <label
              v-for="reason in reasons"
              :key="reason"
              class="refund-dialog__reason"
              :class="{ 'refund-dialog__reason--active': form.reason === reason }"
            >
              <input v-model="form.reason" type="radio" :value="reason" />
              <span>{{ reason }}</span>
            </label>
          </div>
        </div>

        <label class="ss-field">
          <span class="ss-label">补充说明（选填）</span>
          <textarea
            v-model="form.description"
            class="ss-textarea"
            placeholder="请描述具体问题，便于客服快速处理"
          />
        </label>

        <div class="ss-row-between">
          <span />
          <div class="ss-row">
            <button
              type="button"
              class="ss-btn ss-btn-ghost"
              @click="emit('update:modelValue', false)"
            >
              取消
            </button>
            <button type="button" class="ss-btn ss-btn-primary" @click="submit">提交申请</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.refund-dialog {
  position: fixed;
  inset: 0;
  z-index: var(--ss-z-index-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ss-space-4);
  background: var(--ss-color-bg-overlay);
}

.refund-dialog__panel {
  width: min(520px, 100%);
  max-height: 88vh;
  overflow-y: auto;
  padding: var(--ss-space-5);
  display: flex;
  flex-direction: column;
  gap: var(--ss-space-4);
  box-shadow: var(--ss-shadow-xl);
}

.refund-dialog__reasons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ss-space-2);
}

.refund-dialog__reason {
  display: flex;
  align-items: center;
  gap: var(--ss-space-2);
  padding: var(--ss-space-2) var(--ss-space-3);
  border: 1px solid var(--ss-color-border-default);
  border-radius: var(--ss-radius-md);
  cursor: pointer;
  font-size: var(--ss-font-size-sm);
}

.refund-dialog__reason--active {
  border-color: var(--ss-color-brand-600);
  background: var(--ss-color-brand-50);
  color: var(--ss-color-brand-600);
}
</style>
